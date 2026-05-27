-- Schedule audit-deadlines-cron nightly at 06:00 UTC. The function picks
-- up to 15 published scholarships per run (never-audited first, then
-- stalest), fan-outs to audit-deadlines per row, and writes a verdict
-- into deadline_audit_log. Cost ceiling ~$0.045/run.
--
-- 06:00 UTC = 11:00 KZ — after verify-scholarship-cron (05:00 UTC) and
-- fresh-keep-cron (03:00 UTC) so any row touched by those still gets
-- audited the same morning. Off-peak everywhere we care about.
--
-- Idempotent: unschedule first inside an EXCEPTION-handled DO block so
-- re-running this migration replaces the schedule cleanly.
--
-- Auth: apikey header carrying public.app_cron_token() — matches the
-- pattern used by every other cron in this project. The function uses
-- requireAdminOrService() which accepts the cron_token via either header.

DO $$
BEGIN
  PERFORM cron.unschedule('audit-deadlines-cron')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'audit-deadlines-cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'audit-deadlines-cron',
  '0 6 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/audit-deadlines-cron',
      headers := jsonb_build_object(
        'apikey',       public.app_cron_token(),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
