-- =============================================================================
-- Nightly cron: refresh lifecycle_status across the catalog
-- =============================================================================
-- The trigger covers INSERT/UPDATE drift, but lifecycle is also TIME-dependent
-- (a deadline of 2026-05-04 was 'active' yesterday and 'closed_recent' today).
-- Without a daily refresh, rows whose deadline silently passes today don't
-- get their lifecycle_status flipped until SOMETHING updates the row.
--
-- Schedule a tiny nightly UPDATE that recomputes lifecycle for every row.
-- Cheap (~225 rows × pure function call); runs at 03:00 UTC, before any
-- of the heavier crons.
-- =============================================================================

-- Refresh function — pure SQL, tiny.
CREATE OR REPLACE FUNCTION public.refresh_lifecycle_status()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.scholarships
  SET lifecycle_status = public.scholarship_lifecycle(application_deadline, deadline_type),
      next_open_at = public.scholarship_next_open(application_deadline, deadline_type)
  WHERE
    -- Only update rows where the computed value DIFFERS from stored.
    -- Avoids nightly UPDATE storms touching every row's updated_at.
    lifecycle_status IS DISTINCT FROM public.scholarship_lifecycle(application_deadline, deadline_type)
    OR next_open_at IS DISTINCT FROM public.scholarship_next_open(application_deadline, deadline_type);
$$;

GRANT EXECUTE ON FUNCTION public.refresh_lifecycle_status() TO service_role;

-- Schedule via pg_cron at 03:00 UTC daily. Idempotent install.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('refresh-lifecycle-status') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'refresh-lifecycle-status'
    );
    PERFORM cron.schedule(
      'refresh-lifecycle-status',
      '0 3 * * *',
      $job$ SELECT public.refresh_lifecycle_status(); $job$
    );
  END IF;
END
$$;
