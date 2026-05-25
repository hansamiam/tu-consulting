-- Schedule fresh-keep-cron daily at 03:00 UTC. The function does a pure-DB
-- resweep of the publish gate for rows stuck on G9b (last_verified_at > 90d
-- but otherwise OK) — no Firecrawl, no LLM, ~$0/run. Complementary to
-- verify-scholarship-cron (paid re-fetch) and scholarship-url-health-cron
-- (URL liveness, weekly).
--
-- 03:00 UTC = 08:00 KZ — off-peak everywhere we care about; well before
-- the morning verify-cron + URL-health-cron windows so a row that the
-- nightly verify just touched can still get a same-day publish-gate
-- re-eval if anything moved.
--
-- Idempotent: unschedule first inside an EXCEPTION-handled DO block so
-- re-running replaces the schedule cleanly.
--
-- Auth: apikey header carrying public.app_cron_token() — matches the
-- pattern used by every other cron in this project. The function uses
-- requireAdminOrService() which accepts the cron_token via either header.
--
-- Default to dry_run=false in the schedule call (autonomy is the point);
-- for one-off manual exploration callers can hit
--   curl '<fn-url>?dry_run=true' -H "Authorization: Bearer ${SERVICE_ROLE}"
-- to preview without mutating.

DO $$
BEGIN
  PERFORM cron.unschedule('fresh-keep-cron')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fresh-keep-cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'fresh-keep-cron',
  '0 3 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/fresh-keep-cron?dry_run=false',
      headers := jsonb_build_object(
        'apikey',       public.app_cron_token(),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
