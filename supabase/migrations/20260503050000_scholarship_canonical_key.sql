-- =============================================================================
-- Canonical key for scholarship dedup
-- =============================================================================
-- Problem: scrape-source dedupes by exact-match on (scholarship_name,
-- provider_name). The LLM extracts names with subtle variations across
-- different scrape runs:
--   "Chevening Scholarships"        vs  "Chevening Scholarship 2026"
--   "DAAD Master's Scholarship"     vs  "DAAD Master Scholarship"
--   "Knight-Hennessy Scholars"      vs  "Knight Hennessy Scholars Program"
-- Each variation lands as a NEW row, so the database accumulates
-- near-duplicates over time. Discover surfaces them all; users see
-- triple-listings for the same award; AI matching pulls weaker
-- second-place rows because the canonical row's signals are split.
--
-- Fix: a generated, stored canonical_key column that normalizes name +
-- provider + country into a single comparable token. scrape-source uses
-- it for dedup. Existing rows get backfilled automatically because the
-- column is GENERATED ALWAYS.
--
-- We deliberately use a non-unique index. There may be legitimate dupes
-- already in the table from before this migration; an exclusive
-- constraint would block deploy. The dedup logic in scrape-source will
-- pick the most recent row when collisions exist; an admin sweep can
-- then merge or supersede the older rows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.normalize_scholarship_key(
  p_name     text,
  p_provider text,
  p_country  text
) RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            -- Lowercase the concatenated triple
            lower(coalesce(p_name, '') || '|' || coalesce(p_provider, '') || '|' || coalesce(p_country, '')),
            -- Strip recurring suffix words that contribute no semantic
            -- distinction. Examples: "Chevening Scholarships" vs
            -- "Chevening Scholarship", or "DAAD Programme" vs "DAAD".
            '\m(scholarships?|fellowships?|programmes?|programs?|awards?|scholars?|grants?|the|of)\M',
            ' ',
            'g'
          ),
          -- Drop 4-digit years (2024, 2025, 2026 ...). Cycles change;
          -- canonical identity should not.
          '\m(19|20)\d{2}\M',
          ' ',
          'g'
        ),
        -- Collapse all non-alphanumeric runs into a single space
        '[^a-z0-9]+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

-- Self-test on a known-tricky pair so a future change to the regex
-- doesn't silently break dedup.
DO $$
DECLARE
  k1 text := public.normalize_scholarship_key('Chevening Scholarships',         'UK Government',         'United Kingdom');
  k2 text := public.normalize_scholarship_key('Chevening Scholarship 2026',     'UK Government',         'United Kingdom');
  k3 text := public.normalize_scholarship_key('DAAD Master''s Scholarship',     'DAAD',                  'Germany');
  k4 text := public.normalize_scholarship_key('DAAD Master Scholarship Program', 'DAAD',                  'Germany');
BEGIN
  IF k1 IS DISTINCT FROM k2 THEN
    RAISE EXCEPTION 'normalize_scholarship_key dedup failed for Chevening pair: % vs %', k1, k2;
  END IF;
  IF k3 IS DISTINCT FROM k4 THEN
    RAISE EXCEPTION 'normalize_scholarship_key dedup failed for DAAD pair: % vs %', k3, k4;
  END IF;
END
$$;

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS canonical_key text
  GENERATED ALWAYS AS (
    public.normalize_scholarship_key(scholarship_name, provider_name, host_country)
  ) STORED;

-- Non-unique on purpose — see header comment.
CREATE INDEX IF NOT EXISTS idx_scholarships_canonical_key
  ON public.scholarships(canonical_key);

-- Per-source quality view: rolling average confidence + auto-publish rate
-- across the last 30 runs. scrape-source writes confidence into
-- scholarships_staging.parsed_data; this view averages it. Used by admin
-- Sources page to flag sources producing weak data.
CREATE OR REPLACE VIEW public.source_quality_v AS
SELECT
  src.source_id,
  src.name,
  COUNT(stg.staging_id) FILTER (WHERE stg.created_at > now() - interval '60 days')              AS rows_last_60d,
  AVG(stg.confidence) FILTER (WHERE stg.created_at > now() - interval '60 days')                AS avg_confidence_60d,
  AVG(CASE WHEN stg.status = 'auto_published' THEN 1 ELSE 0 END)
    FILTER (WHERE stg.created_at > now() - interval '60 days')                                  AS auto_publish_rate_60d,
  SUM(CASE WHEN stg.status = 'pending' THEN 1 ELSE 0 END)
    FILTER (WHERE stg.created_at > now() - interval '60 days')                                  AS pending_review_60d
FROM public.scholarship_sources src
LEFT JOIN public.scholarships_staging stg USING (source_id)
GROUP BY src.source_id, src.name;

GRANT SELECT ON public.source_quality_v TO authenticated;
