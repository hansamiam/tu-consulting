-- Heal broken scholarships — root cause + one-time recovery.
--
-- Diagnostic snapshot 2026-05-12: 47 of 219 catalog rows were flagged
-- `verification_status='broken'`. That's ~21% of the catalog hidden
-- from every user-facing surface (Discover read path, ScholarshipDetail
-- similar-rail, brief retrieval, RPC matching, hub pages — every gate
-- excludes broken rows by design).
--
-- ROOT CAUSE: scholarship-url-health-cron flips a row to 'broken' after
-- 3 consecutive URL-check failures (BAD), but it has **NO recovery
-- path** — even when the official_url comes back online, the row stays
-- broken forever. Looking at scholarships_url_check_queue, broken rows
-- DO get re-checked weekly, and url_consecutive_fails DOES get reset
-- to 0 on a passing check, but verification_status is never flipped
-- back to 'stale'. One-directional state machine.
--
-- This migration does three things:
--   (1) PROMOTE_HEAL: server-side function that resets all broken rows
--       to 'stale' + zeroes url_consecutive_fails. Lets the
--       verify-scholarship cron re-prove them on the next pass. Rows
--       that are genuinely broken will return to 'broken' through the
--       normal 3-fail counter; rows whose sites recovered will surface
--       again automatically.
--   (2) Adds a trigger that recovers verification_status='broken'
--       → 'stale' whenever url_consecutive_fails drops to 0 (i.e. a
--       successful re-check landed). The state machine becomes
--       bidirectional.
--   (3) Calls heal_broken_scholarships() once at migration time so the
--       existing 47-row backlog re-enters the verify cycle immediately
--       instead of waiting up to a week.

-- ─── (1) Healer function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.heal_broken_scholarships()
RETURNS TABLE (healed_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  WITH healed AS (
    UPDATE public.scholarships
    SET
      verification_status     = 'stale',
      url_consecutive_fails   = 0,
      -- Push to back of verify queue (so we don't drown the cron with
      -- 47 rows on the next tick — they'll get picked up in order over
      -- the next 1-2 days through normal completeness-score ordering).
      last_verified_at        = NULL
    WHERE verification_status = 'broken'
    RETURNING scholarship_id
  )
  SELECT count(*)::integer INTO cnt FROM healed;

  RETURN QUERY SELECT cnt;
END
$$;

GRANT EXECUTE ON FUNCTION public.heal_broken_scholarships() TO service_role;

-- ─── (2) Auto-recovery trigger ─────────────────────────────────────
-- When url_consecutive_fails drops from >=3 back to 0 (a successful
-- recheck), AUTO-FLIP verification_status from 'broken' back to 'stale'
-- so the row re-enters the verify cycle. Closes the one-way street.
CREATE OR REPLACE FUNCTION public.scholarship_auto_recover_from_broken()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_status = 'broken'
     AND NEW.url_consecutive_fails = 0
     AND COALESCE(OLD.url_consecutive_fails, 0) >= 3
  THEN
    NEW.verification_status := 'stale';
    NEW.last_verified_at    := NULL; -- prioritize for next cron
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS scholarship_auto_recover_from_broken_trg ON public.scholarships;
CREATE TRIGGER scholarship_auto_recover_from_broken_trg
  BEFORE UPDATE OF url_consecutive_fails ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.scholarship_auto_recover_from_broken();

-- ─── (3) One-time heal — give the existing backlog a chance ────────
SELECT * FROM public.heal_broken_scholarships();
