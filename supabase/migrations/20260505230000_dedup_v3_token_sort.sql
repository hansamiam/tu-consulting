-- =============================================================================
-- normalize_scholarship_key v3 — token-sort + wider stop-word strip
-- =============================================================================
-- The v2 normalizer (20260505060000) collapsed exact name+provider matches
-- after stripping suffix words (Scholarships/Fellowships/Programmes/etc.)
-- and year. It still missed three classes of duplicates that have been
-- showing up in practice:
--
--   1. WORD ORDER. "DAAD Scholars Programme" and "DAAD Programme Scholars"
--      produced different keys → both rows survived.
--
--   2. NARROWER STOP-WORD LIST. "Erasmus Mundus Scholarship for Master's
--      Students" left "for" + "students" inside the key; the same program
--      indexed under "Erasmus Mundus Master's" diverged.
--
--   3. PROVIDER SUFFIXES. "Heinrich Böll Foundation" / "Heinrich Böll
--      Stiftung" / "Heinrich Böll Trust" — same org, different suffix
--      tokens, different keys.
--
-- v3 adds:
--   · Token-sort: split the normalized string on whitespace, sort the
--     resulting tokens alphabetically, rejoin. Word order stops mattering.
--   · Wider stop-word + suffix list. See the regex below.
--   · Length floor on tokens (>=2 chars) so noise like "a" / "&" / "to"
--     after stripping doesn't survive into the key.
--
-- After rewriting the function we backfill canonical_key on every row,
-- run the same survivor/loser merge as v2 (highest-quality row wins,
-- application_tracker repointed), and the UNIQUE index already in place
-- on canonical_key continues to enforce future inserts.
-- =============================================================================

-- ─── 1. Rewrite the normalizer (sort tokens + wider strip) ────────────────────
CREATE OR REPLACE FUNCTION public.normalize_scholarship_key(
  p_name     text,
  p_provider text,
  p_country  text  -- still ignored, kept for callsite backwards compat.
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw text;
  tokens text[];
BEGIN
  raw := lower(coalesce(p_name, '') || ' ' || coalesce(p_provider, ''));
  -- Strip possessive 's
  raw := regexp_replace(raw, '''s\M', '', 'g');
  -- Strip stop words + suffix words. Wider than v2:
  --   · Subject suffixes: scholarships, fellowships, programmes/programs,
  --     awards, scholars, grants, bursaries, prizes, internships
  --   · Articles + connectors: the, of, for, in, by, at, to, on, and, with,
  --     a, an, from, into, between, across
  --   · Org suffixes: foundation, stiftung, trust, council, society,
  --     association, organization/organisation, institute, university,
  --     college, school, programme, programs, ltd, inc, plc
  --   · Common decorations: international, global, world, official
  raw := regexp_replace(raw,
    '\m(scholarships?|fellowships?|programmes?|programs?|awards?|scholars?|grants?|bursari?es?|bursarys?|prizes?|internships?|the|of|for|in|by|at|to|on|and|with|a|an|from|into|between|across|foundation|stiftung|trust|council|society|association|organi[sz]ations?|institute|university|college|school|ltd|inc|plc|gmbh|international|global|world|official)\M',
    ' ', 'g');
  -- Strip years
  raw := regexp_replace(raw, '\m(19|20)\d{2}\M', ' ', 'g');
  -- Replace any non-alphanumerics with spaces
  raw := regexp_replace(raw, '[^a-z0-9]+', ' ', 'g');
  raw := btrim(raw);

  IF raw IS NULL OR raw = '' THEN
    RETURN NULL;
  END IF;

  -- Tokenise + sort + length-floor + rejoin. Word order stops mattering.
  -- string_to_array splits on space; we filter empties + tokens shorter
  -- than 2 chars (noise after strip).
  tokens := ARRAY(
    SELECT t FROM unnest(string_to_array(raw, ' ')) AS t
    WHERE length(t) >= 2
    ORDER BY t
  );

  IF cardinality(tokens) = 0 THEN
    RETURN NULL;
  END IF;

  RETURN array_to_string(tokens, ' ');
END
$$;

-- Sanity tests so future changes don't regress.
DO $$
DECLARE
  k1 text; k2 text; k3 text; k4 text;
BEGIN
  -- Word-order independence
  k1 := public.normalize_scholarship_key('DAAD Scholars Programme', 'DAAD', NULL);
  k2 := public.normalize_scholarship_key('DAAD Programme Scholars', 'DAAD', NULL);
  IF k1 IS DISTINCT FROM k2 THEN
    RAISE EXCEPTION 'v3 dedup: word-order test failed: % vs %', k1, k2;
  END IF;

  -- Stop word stripping ("for")
  k3 := public.normalize_scholarship_key('Erasmus Mundus Scholarship for Master Students', 'EU', NULL);
  k4 := public.normalize_scholarship_key('Erasmus Mundus Master', 'EU', NULL);
  IF k3 IS DISTINCT FROM k4 THEN
    RAISE EXCEPTION 'v3 dedup: stop-word test failed: % vs %', k3, k4;
  END IF;

  -- Provider-suffix collapse
  k1 := public.normalize_scholarship_key('Heinrich Böll Scholarship', 'Heinrich Böll Foundation', NULL);
  k2 := public.normalize_scholarship_key('Heinrich Böll Scholarship', 'Heinrich Böll Stiftung', NULL);
  IF k1 IS DISTINCT FROM k2 THEN
    RAISE EXCEPTION 'v3 dedup: provider-suffix test failed: % vs %', k1, k2;
  END IF;

  -- Country still ignored
  k1 := public.normalize_scholarship_key('Schwarzman Scholars', 'Tsinghua University', 'China');
  k2 := public.normalize_scholarship_key('Schwarzman Scholars', 'Tsinghua University', 'Multiple countries');
  IF k1 IS DISTINCT FROM k2 THEN
    RAISE EXCEPTION 'v3 dedup: country-ignore test failed: % vs %', k1, k2;
  END IF;
END
$$;

-- ─── 2. Recompute canonical_key on every existing row ─────────────────────────
UPDATE public.scholarships
SET canonical_key = public.normalize_scholarship_key(scholarship_name, provider_name, host_country);

-- ─── 3. Survivor/loser map — same algorithm as v2 ─────────────────────────────
-- Pick the highest-quality row per canonical_key as the survivor, repoint
-- application_tracker entries from losers → survivor, then delete losers.
CREATE TEMP TABLE _dedup_v3_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    s.scholarship_id,
    s.canonical_key,
    ROW_NUMBER() OVER (
      PARTITION BY s.canonical_key
      ORDER BY
        CASE s.verification_status
          WHEN 'verified' THEN 0
          WHEN 'stale'    THEN 1
          WHEN 'pending'  THEN 2
          WHEN 'broken'   THEN 3
          ELSE 4
        END,
        (CASE WHEN s.host_country IS NOT NULL AND s.host_country <> '' THEN 1 ELSE 0 END)
        + (CASE WHEN s.award_amount_text IS NOT NULL AND s.award_amount_text <> '' THEN 1 ELSE 0 END)
        + (CASE WHEN s.estimated_total_value_usd IS NOT NULL AND s.estimated_total_value_usd > 0 THEN 1 ELSE 0 END)
        + (CASE WHEN s.application_deadline IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN s.target_fields IS NOT NULL AND cardinality(s.target_fields) > 0 THEN 1 ELSE 0 END)
        + (CASE WHEN s.target_degree_level IS NOT NULL AND cardinality(s.target_degree_level) > 0 THEN 1 ELSE 0 END)
        + (CASE WHEN s.eligible_countries IS NOT NULL AND cardinality(s.eligible_countries) > 0 THEN 1 ELSE 0 END)
        + (CASE WHEN s.why_this_fits IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN s.how_to_win IS NOT NULL THEN 1 ELSE 0 END)
        DESC,
        s.created_at DESC NULLS LAST,
        s.scholarship_id ASC
    ) AS rk
  FROM public.scholarships s
  WHERE s.canonical_key IS NOT NULL
)
SELECT
  loser.scholarship_id    AS loser_id,
  survivor.scholarship_id AS survivor_id,
  loser.canonical_key
FROM ranked loser
JOIN ranked survivor USING (canonical_key)
WHERE loser.rk > 1 AND survivor.rk = 1;

CREATE INDEX ON _dedup_v3_map(loser_id);
CREATE INDEX ON _dedup_v3_map(survivor_id);

-- Repoint application_tracker rows where the user only had the loser; if
-- they already had the survivor, drop the loser entry to preserve their
-- explicit choices on the survivor.
UPDATE public.application_tracker at
SET scholarship_id = m.survivor_id,
    updated_at     = now()
FROM _dedup_v3_map m
WHERE at.scholarship_id = m.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM public.application_tracker x
    WHERE x.user_id = at.user_id AND x.scholarship_id = m.survivor_id
  );

DELETE FROM public.application_tracker at
USING _dedup_v3_map m
WHERE at.scholarship_id = m.loser_id;

-- Same cleanup for saved_searches' last_alert_at-flagged tracking, if any
-- references existed (none today; left as a guard for the future).

-- Delete the loser scholarships themselves. The unique canonical_key
-- index already in place will accept the survivor's fresh key.
DELETE FROM public.scholarships s
USING _dedup_v3_map m
WHERE s.scholarship_id = m.loser_id;

-- ─── 4. Telemetry — record the merge so admins can see what happened ──────────
DO $$
DECLARE
  merged_count int;
BEGIN
  SELECT count(*) INTO merged_count FROM _dedup_v3_map;
  RAISE NOTICE 'dedup_v3: merged % loser rows into survivors', merged_count;
END
$$;
