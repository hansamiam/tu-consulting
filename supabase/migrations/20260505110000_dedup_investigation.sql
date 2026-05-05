-- =============================================================================
-- Deeper dedup pass — Pearson/Schwarzman variants not caught by canonical_key
-- =============================================================================
-- After 20260505060000 collapsed exact canonical_key matches, the user is
-- still seeing duplicate Pearson and Schwarzman cards. Possible reasons:
--
--   1. Same scholarship listed under DIFFERENT provider names (e.g. Schwarzman
--      from "Schwarzman Scholars" vs "Tsinghua University" vs "Schwarzman
--      Foundation"). Different providers → different canonical_key → not
--      collapsed.
--   2. Pearson appears as both "Pearson College UWC" and "United World
--      Colleges Pearson" — the canonical_key strips suffix words but if the
--      core name differs the keys don't match.
--
-- Strategy: a SECOND-PASS dedup that groups by SCHOLARSHIP NAME ALONE (after
-- normalisation), ignoring provider entirely for well-known elite programs
-- whose name is unambiguous. We only fire this for programs whose name
-- already passes a "famous" filter (matches a curated allowlist of
-- elite-program tokens) so we don't over-merge unrelated rows.
--
-- For each duplicate cluster, pick the survivor by the same quality
-- ordering used in the first dedup migration, repoint application_tracker
-- entries, then delete losers.
-- =============================================================================

-- Add a "name-only" canonical helper used for the famous-program clustering.
CREATE OR REPLACE FUNCTION public.normalize_scholarship_name_only(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(coalesce(p_name, '')),
              '''s\M', '', 'g'
            ),
            '\m(scholarships?|fellowships?|programmes?|programs?|awards?|scholars?|grants?|the|of|college|colleges|university|universities|trust|foundation)\M',
            ' ', 'g'
          ),
          '\m(19|20)\d{2}\M', ' ', 'g'
        ),
        '[^a-z0-9]+', ' ', 'g'
      )
    ),
    ''
  );
$$;

-- ─── Famous-program merge ────────────────────────────────────────────────────
-- Allowlist of name fragments that uniquely identify an elite program. When
-- two rows share a normalised name AND the name matches one of these tokens,
-- merge regardless of provider.
DO $$
DECLARE
  famous_tokens text[] := ARRAY[
    'schwarzman', 'pearson', 'rhodes', 'gates cambridge', 'knight hennessy',
    'fulbright', 'chevening', 'erasmus mundus', 'daad', 'mext',
    'eiffel', 'commonwealth', 'jardine', 'orange tulip',
    'clarendon', 'marshall', 'humphrey', 'mastercard', 'mandela',
    'monbukagakusho', 'kgsp', 'aga khan', 'open society', 'oxford weidenfeld'
  ];
BEGIN
  CREATE TEMP TABLE _famous_dedup ON COMMIT DROP AS
  WITH normalized AS (
    SELECT
      s.scholarship_id,
      public.normalize_scholarship_name_only(s.scholarship_name) AS name_key,
      s.verification_status,
      s.host_country, s.award_amount_text, s.estimated_total_value_usd,
      s.application_deadline, s.target_fields, s.target_degree_level,
      s.eligible_countries, s.why_this_fits, s.how_to_win, s.created_at
    FROM public.scholarships s
    WHERE s.scholarship_name IS NOT NULL
  ),
  famous AS (
    -- Only group rows whose normalised name MATCHES at least one token.
    SELECT n.*
    FROM normalized n
    WHERE EXISTS (
      SELECT 1 FROM unnest(famous_tokens) AS t WHERE n.name_key LIKE '%' || t || '%'
    )
  ),
  ranked AS (
    SELECT
      f.scholarship_id, f.name_key,
      ROW_NUMBER() OVER (
        PARTITION BY f.name_key
        ORDER BY
          CASE f.verification_status
            WHEN 'verified' THEN 0 WHEN 'stale' THEN 1
            WHEN 'pending' THEN 2 WHEN 'broken' THEN 3 ELSE 4
          END,
          (CASE WHEN f.host_country IS NOT NULL AND f.host_country <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN f.award_amount_text IS NOT NULL AND f.award_amount_text <> '' THEN 1 ELSE 0 END)
          + (CASE WHEN f.estimated_total_value_usd IS NOT NULL AND f.estimated_total_value_usd > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN f.application_deadline IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN f.target_fields IS NOT NULL AND cardinality(f.target_fields) > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN f.target_degree_level IS NOT NULL AND cardinality(f.target_degree_level) > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN f.eligible_countries IS NOT NULL AND cardinality(f.eligible_countries) > 0 THEN 1 ELSE 0 END)
          + (CASE WHEN f.why_this_fits IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN f.how_to_win IS NOT NULL THEN 1 ELSE 0 END)
          DESC,
          f.created_at DESC NULLS LAST,
          f.scholarship_id ASC
      ) AS rk
    FROM famous f
  )
  SELECT
    loser.scholarship_id  AS loser_id,
    survivor.scholarship_id AS survivor_id,
    loser.name_key
  FROM ranked loser
  JOIN ranked survivor USING (name_key)
  WHERE loser.rk > 1 AND survivor.rk = 1;

  CREATE INDEX ON _famous_dedup(loser_id);

  -- Repoint user state from losers to survivors
  UPDATE public.application_tracker at
  SET scholarship_id = m.survivor_id, updated_at = now()
  FROM _famous_dedup m
  WHERE at.scholarship_id = m.loser_id
    AND NOT EXISTS (
      SELECT 1 FROM public.application_tracker x
      WHERE x.user_id = at.user_id AND x.scholarship_id = m.survivor_id
    );

  DELETE FROM public.application_tracker at
  USING _famous_dedup m
  WHERE at.scholarship_id = m.loser_id;

  -- Delete losers — FK cascade handles related tables.
  DELETE FROM public.scholarships s
  USING _famous_dedup m
  WHERE s.scholarship_id = m.loser_id;
END
$$;

-- ─── Refresh canonical_key on the survivors so future scrapes for the same
--     famous programs collide on the canonical_key UNIQUE index.
UPDATE public.scholarships
SET canonical_key = public.normalize_scholarship_key(scholarship_name, provider_name, host_country)
WHERE canonical_key IS NULL OR canonical_key = '';

-- Touch updated_at so deep-dive cache invalidates on the merged survivors.
UPDATE public.scholarships
SET updated_at = now()
WHERE updated_at < now() - interval '1 minute';
