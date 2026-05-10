-- Discover read-path index — partial covering index for the catalog query.
--
-- The Discover page hits this on every page load:
--
--   SELECT * FROM scholarships
--   WHERE (verification_status IS NULL OR verification_status IN ('verified', 'stale', 'pending'))
--     AND (lifecycle_status IS NULL OR lifecycle_status IN ('active', 'reopens_annually'))
--   ORDER BY estimated_total_value_usd DESC NULLS LAST
--
-- Without an index the planner does a sequential scan + sort across the
-- full table on every page load. As the catalog grows past a few thousand
-- rows that becomes the dominant page-load cost on cold sessions (the
-- frontend now caches in sessionStorage on warm sessions, but the cold
-- case still has to be fast).
--
-- A partial index keyed on the sort column (estimated_total_value_usd)
-- where the visibility predicate matches lets the planner walk the
-- index sequentially and skip the sort + WHERE evaluation entirely.
-- The predicate is IMMUTABLE (string equality + IS NULL), so partial-
-- index usage is straightforward.
--
-- Inserts/updates pay a small write-time cost to maintain the index.
-- Acceptable: scholarships writes are dominated by cron jobs running
-- a few hundred per pass, not user-facing latency.

CREATE INDEX IF NOT EXISTS idx_scholarships_discover_read_path
  ON public.scholarships (estimated_total_value_usd DESC NULLS LAST, scholarship_id)
  WHERE (verification_status IS NULL OR verification_status IN ('verified', 'stale', 'pending'))
    AND (lifecycle_status IS NULL OR lifecycle_status IN ('active', 'reopens_annually'));

COMMENT ON INDEX public.idx_scholarships_discover_read_path IS
  'Covers the Discover catalog read query — partial WHERE matches the
   visibility gate (verification_status + lifecycle_status), ORDER BY
   key matches estimated_total_value_usd DESC. scholarship_id appended
   so the index is unique per row (avoids tie-breaking instability when
   multiple rows share an award value). Drop / rebuild if the visibility
   gate predicate ever changes — index condition is fixed at build
   time, not re-evaluated.';
