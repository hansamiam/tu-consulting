-- After deploying _shared/dispatchClient.ts and refactoring 4 fan-out
-- crons to use it (commit 419048a), fire each one immediately so the
-- backlog drains right now instead of waiting for the next scheduled
-- tick. Each call is async (pg_net.http_post returns an http_request_id
-- and the response lands in net._http_response within ~60s).
--
-- These are the crons that were silently 401-ing every internal
-- supa.functions.invoke() before the dispatchClient fix:
--   · verify-scholarship-cron     → drains deadline-missing rows
--   · enrich-scholarships-content-cron → drains thin-content rows
--   · enrich-universities-cron    → drains university metadata
--   · promote-pending-cron        → moves staging rows live
-- Plus the already-fixed dispatchers, fired again just in case.

DO $$
DECLARE
  base text := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/';
  fn text;
BEGIN
  FOR fn IN
    SELECT unnest(ARRAY[
      'verify-scholarship-cron',
      'enrich-scholarships-content-cron',
      'enrich-universities-cron',
      'promote-pending-cron',
      'canonical-extract-cron',
      'enrich-cover-images-cron',
      'discover-from-hubs-cron'
    ])
  LOOP
    PERFORM net.http_post(
      url     := base || fn,
      headers := jsonb_build_object(
        'apikey',       public.app_cron_token(),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb
    );
  END LOOP;
END $$;
