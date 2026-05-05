-- Outcome tracking on application_tracker
--
-- When a member sets status='accepted' on a tracked scholarship we now
-- prompt them for the awarded amount. Captured per-row for two reasons:
--   1. Personal "stack won so far" stat for the member (retention surface)
--   2. Anonymized aggregate moat — total $ won across all TopUni members,
--      surfaced as a trust signal on marketing pages
--
-- We don't add a separate outcome_at column — status_changed_at already
-- exists and is bumped on status transitions, so it's the truth source
-- for "when did this outcome happen?".

ALTER TABLE public.application_tracker
  ADD COLUMN IF NOT EXISTS awarded_amount_usd integer
    CHECK (awarded_amount_usd IS NULL OR (awarded_amount_usd >= 0 AND awarded_amount_usd <= 2000000));

-- Bump status_changed_at automatically when status flips. Keeps the
-- outcome-time signal honest even if the client forgets to set it.
CREATE OR REPLACE FUNCTION public.bump_app_tracker_status_changed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_app_tracker_status_changed ON public.application_tracker;
CREATE TRIGGER trg_app_tracker_status_changed
  BEFORE UPDATE ON public.application_tracker
  FOR EACH ROW EXECUTE FUNCTION public.bump_app_tracker_status_changed();

-- Public aggregate moat: total $ won across all members + count of
-- accepted scholarships. SECURITY DEFINER so anon callers can read the
-- aggregate without seeing any individual row. Returns zero / zero when
-- the table is empty.
CREATE OR REPLACE FUNCTION public.topuni_outcomes_aggregate()
RETURNS TABLE(total_awarded_usd bigint, accepted_count bigint, member_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(awarded_amount_usd), 0)::bigint                         AS total_awarded_usd,
    COUNT(*) FILTER (WHERE status = 'accepted')::bigint                  AS accepted_count,
    COUNT(DISTINCT user_id) FILTER (WHERE status = 'accepted')::bigint   AS member_count
  FROM public.application_tracker
  WHERE status = 'accepted';
$$;

GRANT EXECUTE ON FUNCTION public.topuni_outcomes_aggregate() TO anon, authenticated;
