-- =============================================================================
-- Schedule pg_cron jobs for verify-scholarship-cron + enrich-scholarships-content-cron
-- =============================================================================
-- Two daily jobs that keep the scholarship database fresh and rich:
--   · verify-scholarship-cron               — re-fetch + diff stale rows  (05:00 UTC)
--   · enrich-scholarships-content-cron      — fill soft descriptive fields (04:30 UTC)
--
-- Same auth pattern as 20260503100000_schedule_new_crons.sql: uses
-- current_setting('app.cron_token', true) so the service-role JWT does NOT
-- land in source control. Production has it embedded via:
--
--   ALTER DATABASE postgres SET app.cron_token = '<service-role-jwt>';
--
-- ON DB RESET: re-running this migration alone schedules with "Bearer null"
-- auth and the edge functions 401. Set app.cron_token first.
--
-- Idempotent: defensively drops same-name schedules before recreating.
-- =============================================================================

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('verify-scholarship-cron');               EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('enrich-scholarships-content-cron');      EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'verify-scholarship-cron',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/verify-scholarship-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'enrich-scholarships-content-cron',
  '30 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/enrich-scholarships-content-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
