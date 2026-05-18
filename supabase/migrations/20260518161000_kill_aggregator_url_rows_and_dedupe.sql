-- 2026-05-18: Two cleanup operations per user direction
-- "make sure all the links are canonical real if any don't have it
-- honestly better to just kill the entire entry. also make sure no
-- duplicates".
--
-- A) Kill 15 visible rows whose best-available URL is an aggregator
--    listicle (scholars4dev / scholarshipsads / opportunitiesforyouth
--    etc.) — clicking "Apply on official site" was landing users on a
--    third-party page, not the funder's authoritative one. When the
--    scrape pipeline re-discovers these flagships from real sources,
--    they'll come back with proper canonical_official_url. The
--    23505 ON CONFLICT fallback in scrape-source will reactivate
--    these inactive rows on the next clean extraction.
--
-- B) Deduplicate visible rows by normalised scholarship name. Keep
--    the most-complete row (data_completeness_score DESC, then
--    deadline-present, then value-present, then most-recent). Mark
--    duplicates as lifecycle_status='superseded' (distinct from
--    'inactive' for audit trail).
--
-- Paired server-side guard (scrape-source/index.ts): an aggregator-URL
-- check in validateExtracted() now NULLs the official_url field when
-- it matches a known aggregator domain, so this class can't
-- re-emerge from new scrapes.

-- A) Kill aggregator-only-URL rows
UPDATE scholarships
SET lifecycle_status = 'inactive', updated_at = now()
WHERE lifecycle_status IN ('active','reopens_annually')
  AND (
    COALESCE(canonical_official_url, official_url) IS NULL OR
    COALESCE(canonical_official_url, official_url) ~* '(scholars4dev|opportunitiesforyouth|opportunit(ies)?tracker|opportunitydesk|scholarship-positions|scholarshipsdb|scholarshipsads|opportunitiescorner|after\.|buddy4study|mladiinfo|afterschoolafrica|opportunitiesforafricans)\.'
  );

-- B) Dedupe by normalised name
WITH ranked AS (
  SELECT scholarship_id,
    row_number() OVER (
      PARTITION BY lower(regexp_replace(scholarship_name, '\s+', ' ', 'g'))
      ORDER BY data_completeness_score DESC NULLS LAST,
               (application_deadline IS NOT NULL) DESC,
               (estimated_total_value_usd IS NOT NULL) DESC,
               created_at DESC
    ) AS rn
  FROM scholarships
  WHERE lifecycle_status IN ('active','reopens_annually')
)
UPDATE scholarships s
SET lifecycle_status = 'superseded', updated_at = now()
FROM ranked r
WHERE s.scholarship_id = r.scholarship_id AND r.rn > 1;
