-- =============================================================================
-- pg_cron schedule — promote-pending-cron
-- =============================================================================
-- Daily 06:00 UTC tick that drains pending-status scholarships into verified
-- via re-fetch + re-extract + match-vs-stored. 80/run with a 1.2s throttle =
-- ~96s of work per cron tick (under the 60s function timeout? No, but the
-- function is async so it streams its work; the dispatcher pattern handles
-- this).
--
-- Idempotent: drops same-name schedule first.
-- Same auth pattern as the other crons (current_setting('app.cron_token')
-- so the service-role JWT stays out of git).
-- =============================================================================

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('promote-pending-cron');     EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'promote-pending-cron',
  '0 6 * * *',  -- daily 06:00 UTC (after verify-cron at 05:00, before normal scrape ticks)
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/promote-pending-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
