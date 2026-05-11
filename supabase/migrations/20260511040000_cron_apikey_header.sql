-- Cron auth — switch every cron's HTTP call from Authorization: Bearer
-- to the apikey header.
--
-- Background: Supabase's API gateway now rejects legacy JWT-based
-- service-role tokens with UNAUTHORIZED_LEGACY_JWT when sent via
-- Authorization: Bearer. The modern path is the new sb_secret_*
-- short-form key sent via the `apikey` header — gateway accepts
-- it directly without a JWT-validation round-trip.
--
-- This migration re-schedules every cron from
-- 20260511020000_cron_token_via_private_table.sql to send the
-- token (now an sb_secret_* value in private.app_secrets) via
-- apikey instead. Same helper function, same secret-storage, only
-- the header shape changes.

DO $$
DECLARE
  base text := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/';
  spec record;
BEGIN
  FOR spec IN
    SELECT jobname, schedule, url_suffix FROM (VALUES
      ('scrape-cron-dispatcher',           '*/5 * * * *',  'scrape-cron-dispatcher'),
      ('discover-from-hubs-cron',          '0 2 * * *',    'discover-from-hubs-cron'),
      ('scholarship-url-health-cron',      '0 */4 * * *',  'scholarship-url-health-cron'),
      ('verify-scholarship-cron',          '*/30 * * * *', 'verify-scholarship-cron'),
      ('enrich-scholarships-content-cron', '30 4 * * *',   'enrich-scholarships-content-cron'),
      ('enrich-universities-cron',         '0 3 * * *',    'enrich-universities-cron'),
      ('promote-pending-cron',             '*/10 * * * *', 'promote-pending-cron'),
      ('embed-scholarships-cron',          '0 5 * * *',    'embed-scholarships'),
      ('funder_truth_probe_daily',         '0 6 * * *',    'funder-truth-probe'),
      ('pro-upgrade-nudge-cron',           '0 14 * * *',   'pro-upgrade-nudge-cron')
    ) AS t(jobname, schedule, url_suffix)
  LOOP
    -- Unschedule any existing version of this job (idempotent).
    PERFORM cron.unschedule(spec.jobname)
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = spec.jobname);
    -- Re-schedule with apikey-header auth. Body interpolation uses the
    -- format() function so the URL suffix lands inside the cron-job SQL
    -- without escape hassles.
    PERFORM cron.schedule(
      spec.jobname,
      spec.schedule,
      format($job$
        SELECT net.http_post(
          url     := %L,
          headers := jsonb_build_object(
            'apikey',       public.app_cron_token(),
            'Content-Type', 'application/json'
          ),
          body    := '{}'::jsonb
        );
      $job$, base || spec.url_suffix)
    );
  END LOOP;
END $$;

COMMENT ON FUNCTION public.app_cron_token() IS
  'Returns the apikey value (now an sb_secret_* short-form key) that
   cron jobs send to edge functions via the apikey header. Stored in
   private.app_secrets so rotation is one UPDATE statement.';
