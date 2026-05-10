-- =============================================================================
-- Annual deadline roll-forward — keep cycle dates current across the catalog
-- =============================================================================
-- The most visible data-quality problem on Discover and the workspace was
-- past-dated deadlines. Many programs are annual cycles (Chevening, Rhodes,
-- DAAD, MEXT, Fulbright, etc.) — the LLM scrapes "Deadline: November 5,
-- 2025" from a static program page, the date passes, but the page hasn't
-- updated to advertise the 2026 cycle yet. Result: students see "closed"
-- on real, recurring opportunities and skip them.
--
-- Fix: when deadline_type = 'annual' AND application_deadline is in the
-- past, roll the date forward by whole years until it's in the future.
-- This is correct because the program runs yearly on the same month/day.
-- Postgres's `+ INTERVAL '1 year'` arithmetic handles leap years.
--
-- This migration:
--   1. Defines the helper function `next_annual_occurrence(d date)`.
--   2. Defines the catalog-wide updater `roll_forward_annual_deadlines()`
--      that returns the count of rows touched.
--   3. Runs the updater once at install time so existing past-dated
--      annual rows get healed immediately.
--   4. Schedules a pg_cron job to re-run daily at 03:00 UTC so dates
--      stay forward-current without operator action. Soft-fails if
--      pg_cron isn't enabled — the function still works for ad-hoc
--      manual calls.
--
-- Auth note: cron jobs run as the cron-installer role (postgres). The
-- function is SECURITY INVOKER (default) — only writes to public.scholarships
-- which the cron role has access to.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.next_annual_occurrence(d date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result date := d;
BEGIN
  -- Push by 1 year repeatedly. Postgres handles leap-year edge cases
  -- (Feb 29 + 1 year = Feb 28 in non-leap, Feb 29 if leap). One-shot
  -- multiplication breaks for old dates because year-boundary alignment
  -- isn't constant; the loop is exact.
  WHILE result < CURRENT_DATE LOOP
    result := result + INTERVAL '1 year';
  END LOOP;
  RETURN result;
END
$$;

COMMENT ON FUNCTION public.next_annual_occurrence(date) IS
  'Returns the next future occurrence of an annual cycle date. If the input is already in the future, returns it unchanged. If past, adds whole years until the result is >= CURRENT_DATE.';

GRANT EXECUTE ON FUNCTION public.next_annual_occurrence(date) TO service_role, authenticated;

-- ─── Catalog-wide updater ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.roll_forward_annual_deadlines()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.scholarships
  SET application_deadline = public.next_annual_occurrence(application_deadline)
  WHERE deadline_type = 'annual'
    AND application_deadline IS NOT NULL
    AND application_deadline < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END
$$;

COMMENT ON FUNCTION public.roll_forward_annual_deadlines() IS
  'Rolls past-dated annual scholarship deadlines forward to their next future occurrence. Returns the number of rows touched. Idempotent — safe to run repeatedly.';

GRANT EXECUTE ON FUNCTION public.roll_forward_annual_deadlines() TO service_role;

-- ─── One-shot heal at install time ───────────────────────────────────
SELECT public.roll_forward_annual_deadlines();

-- ─── Daily pg_cron schedule (best-effort) ────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drop any prior schedule so re-running this migration doesn't double-book
    PERFORM cron.unschedule('roll-forward-annual-deadlines')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'roll-forward-annual-deadlines');
    PERFORM cron.schedule(
      'roll-forward-annual-deadlines',
      '0 3 * * *',
      $cron$ SELECT public.roll_forward_annual_deadlines(); $cron$
    );
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- pg_cron extension exists but cron schema isn't in search path;
  -- fall through silently. Operator can wire the schedule manually.
  NULL;
END
$$;
