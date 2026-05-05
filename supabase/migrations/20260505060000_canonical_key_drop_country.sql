-- =============================================================================
-- canonical_key: drop host_country from the dedup signature
-- =============================================================================
-- The original normalize_scholarship_key included host_country, which
-- meant the SAME scholarship scraped twice from different sources lands
-- as two rows whenever the LLM happened to capture host_country
-- differently:
--
--   Row 1: "Schwarzman Scholars" | "Tsinghua University" | "China"
--   Row 2: "Schwarzman Scholars" | "Tsinghua University" | "Multiple countries"
--
-- Different canonical_key → both rows survive scrape-source's dedup pass
-- → Discover surfaces both → users see ghost duplicates.
--
-- The dedup signature should be (name, provider) only. Two scholarships
-- with the same name + same provider but legitimately different host
-- countries are essentially nonexistent — and even if one shows up, the
-- quality-score-wins dedup picks the better-populated row.
--
-- This migration:
--   1. Rewrites normalize_scholarship_key to drop host_country.
--   2. Backfills canonical_key on every existing row.
--   3. Picks ONE survivor per duplicate group (highest quality, most
--      filled, newest), repoints any user state (shortlist / status /
--      notes) at the survivor, then deletes the rest.
--   4. Promotes the canonical_key index to UNIQUE so future dupes are
--      rejected at insert time.
-- =============================================================================

-- ─── 1. Rewrite the normalizer (name + provider only) ─────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_scholarship_key(
  p_name     text,
  p_provider text,
  p_country  text  -- kept for backwards-compat; deliberately ignored.
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(coalesce(p_name, '') || '|' || coalesce(p_provider, '')),
              '''s\M', '', 'g'
            ),
            '\m(scholarships?|fellowships?|programmes?|programs?|awards?|scholars?|grants?|the|of)\M',
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

DO $$
DECLARE
  k1 text := public.normalize_scholarship_key('Schwarzman Scholars', 'Tsinghua University', 'China');
  k2 text := public.normalize_scholarship_key('Schwarzman Scholars', 'Tsinghua University', 'Multiple countries');
BEGIN
  IF k1 IS DISTINCT FROM k2 THEN
    RAISE EXCEPTION 'normalize_scholarship_key cross-country dedup failed: % vs %', k1, k2;
  END IF;
END
$$;

-- ─── 2. Recompute canonical_key on every row ──────────────────────────────────
UPDATE public.scholarships
SET canonical_key = public.normalize_scholarship_key(scholarship_name, provider_name, host_country);

-- ─── 3. Compute survivor/loser map ONCE — used by every step that follows ────
-- Materialised TEMP TABLE so all three operations see the identical mapping.
CREATE TEMP TABLE _dedup_map ON COMMIT DROP AS
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
  loser.scholarship_id  AS loser_id,
  survivor.scholarship_id AS survivor_id,
  loser.canonical_key
FROM ranked loser
JOIN ranked survivor USING (canonical_key)
WHERE loser.rk > 1 AND survivor.rk = 1;

CREATE INDEX ON _dedup_map(loser_id);
CREATE INDEX ON _dedup_map(survivor_id);

-- ─── 3a. Repoint shortlist (skip if survivor already has the user's row) ─────
UPDATE public.user_scholarship_shortlist usl
SET scholarship_id = m.survivor_id
FROM _dedup_map m
WHERE usl.scholarship_id = m.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM public.user_scholarship_shortlist x
    WHERE x.user_id = usl.user_id AND x.scholarship_id = m.survivor_id
  );

DELETE FROM public.user_scholarship_shortlist usl
USING _dedup_map m
WHERE usl.scholarship_id = m.loser_id;

-- ─── 3b. Repoint user status / notes if those tables exist ───────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_scholarship_status'
  ) THEN
    EXECUTE $sql$
      UPDATE public.user_scholarship_status uss
      SET scholarship_id = m.survivor_id
      FROM _dedup_map m
      WHERE uss.scholarship_id = m.loser_id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_scholarship_status x
          WHERE x.user_id = uss.user_id AND x.scholarship_id = m.survivor_id
        );

      DELETE FROM public.user_scholarship_status uss
      USING _dedup_map m
      WHERE uss.scholarship_id = m.loser_id;
    $sql$;
  END IF;
END
$$;

-- ─── 3c. Delete the loser rows ───────────────────────────────────────────────
DELETE FROM public.scholarships s
USING _dedup_map m
WHERE s.scholarship_id = m.loser_id;

-- ─── 4. Promote the index to UNIQUE so future dupes are rejected ─────────────
DROP INDEX IF EXISTS idx_scholarships_canonical_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_scholarships_canonical_key
  ON public.scholarships(canonical_key)
  WHERE canonical_key IS NOT NULL;
