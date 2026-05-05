-- Per-scholarship outcome aggregates
--
-- Companion to 20260505180000_outcome_tracking.sql. That migration added
-- the *cross-platform* aggregate (topuni_outcomes_aggregate). This one
-- adds the *per-scholarship* aggregate so we can render trust signals
-- on individual surfaces:
--   - "12 TopUni members applied · 3 received offers · $89K awarded"
--     on /scholarships/:id (the SEO page)
--   - "12 applied · 3 won" tiny pill on Discover cards for popular rows
--
-- This is the moat OFY-shaped competitors structurally cannot replicate:
-- they have no user accounts, no application tracker, no outcomes data.
-- Every accepted outcome a TopUni member captures grows their trust
-- footprint on the exact page that competing aggregator sites also rank
-- for.
--
-- Depends on: application_tracker.awarded_amount_usd from migration
-- 20260505180000. Apply that one first or this function errors at
-- creation time.

CREATE OR REPLACE FUNCTION public.scholarship_outcomes(p_scholarship_id uuid)
RETURNS TABLE(
  applied_count        bigint,
  accepted_count       bigint,
  total_awarded_usd    bigint,
  in_pipeline_count    bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  -- applied_count       = distinct users who progressed past "thinking
  --                       about it" (submitted / awaiting decision /
  --                       accepted / rejected). Captures the realistic
  --                       "applied" funnel; saving alone doesn't count.
  -- accepted_count      = distinct users with status='accepted'.
  -- total_awarded_usd   = sum of captured awards across accepted rows.
  --                       Only includes rows where the member chose to
  --                       log the amount; "Skip" leaves it null and
  --                       contributes zero.
  -- in_pipeline_count   = distinct users with any active status (used
  --                       for the lighter "X students working on this"
  --                       trust signal on Discover cards).
  SELECT
    COUNT(DISTINCT user_id) FILTER (WHERE status IN ('submitted','decision','accepted','rejected'))::bigint AS applied_count,
    COUNT(DISTINCT user_id) FILTER (WHERE status = 'accepted')::bigint AS accepted_count,
    COALESCE(SUM(awarded_amount_usd) FILTER (WHERE status = 'accepted'), 0)::bigint AS total_awarded_usd,
    COUNT(DISTINCT user_id) FILTER (WHERE status IS NOT NULL AND status <> 'rejected')::bigint AS in_pipeline_count
  FROM public.application_tracker
  WHERE scholarship_id = p_scholarship_id;
$$;

GRANT EXECUTE ON FUNCTION public.scholarship_outcomes(uuid) TO anon, authenticated;

-- Bulk variant for Discover — pass an array of scholarship ids, get back
-- one row per id with the same aggregate columns. The single-row variant
-- above is fine for /scholarships/:id; for Discover we'd otherwise fire
-- N RPCs across a 60-card grid, which is wasteful.
CREATE OR REPLACE FUNCTION public.scholarship_outcomes_bulk(p_scholarship_ids uuid[])
RETURNS TABLE(
  scholarship_id       uuid,
  applied_count        bigint,
  accepted_count       bigint,
  in_pipeline_count    bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    at.scholarship_id,
    COUNT(DISTINCT at.user_id) FILTER (WHERE at.status IN ('submitted','decision','accepted','rejected'))::bigint AS applied_count,
    COUNT(DISTINCT at.user_id) FILTER (WHERE at.status = 'accepted')::bigint AS accepted_count,
    COUNT(DISTINCT at.user_id) FILTER (WHERE at.status IS NOT NULL AND at.status <> 'rejected')::bigint AS in_pipeline_count
  FROM public.application_tracker at
  WHERE at.scholarship_id = ANY(p_scholarship_ids)
  GROUP BY at.scholarship_id;
$$;

GRANT EXECUTE ON FUNCTION public.scholarship_outcomes_bulk(uuid[]) TO anon, authenticated;
