-- =============================================================================
-- Schedule pg_cron jobs for the two new retention/enrichment crons
-- =============================================================================
-- Two daily jobs:
--   · pro-upgrade-nudge-cron     — Day 5-14 conversion email loop (14:00 UTC)
--   · enrich-universities-cron   — top-25 stale university backfill (03:00 UTC)
--
-- This migration uses current_setting('app.cron_token') for auth so the
-- service-role JWT does not land in source control. Production schedules
-- have the JWT embedded directly in cron.job (matching the pattern used by
-- scholarship-deadline-cron and weekly-nudge-cron) — applied out-of-band so
-- it stays out of git.
--
-- ON DB RESET: re-running this migration alone will schedule the jobs with
-- "Bearer null" auth (since app.cron_token is unset) and the edge functions
-- will 401. Manually re-apply the production schedule via the SQL editor:
--
--   SELECT cron.schedule('pro-upgrade-nudge-cron', '0 14 * * *', $$
--     SELECT net.http_post(url := '...', headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || '<service-role-jwt>', ...));
--   $$);
--
-- Or set the cron_token first:
--   ALTER DATABASE postgres SET app.cron_token = '<service-role-jwt>';
-- then re-apply this migration.
--
-- Idempotent: drops schedules of these names first so this migration can
-- be re-applied safely.
-- =============================================================================

DO $$
BEGIN
  -- Defensive un-schedule if either job already registered. cron.unschedule
  -- raises if the job doesn't exist, so we wrap each in its own block.
  BEGIN PERFORM cron.unschedule('pro-upgrade-nudge-cron');     EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('enrich-universities-cron');    EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'pro-upgrade-nudge-cron',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/pro-upgrade-nudge-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'enrich-universities-cron',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/enrich-universities-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
