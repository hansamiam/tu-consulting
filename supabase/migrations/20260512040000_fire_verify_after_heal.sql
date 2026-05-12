-- Fire verify-scholarship-cron NOW to drain the 43 just-healed rows.
-- Without this, the healed rows wait until the next 05:00 UTC tick to
-- get content-verified — they ARE visible now (stale status passes the
-- read filter), but their data may be 7+ days stale because they
-- haven't been touched in a while. Firing the cron immediately gives
-- Firecrawl a chance to either prove them current (→ verified) or
-- re-mark them broken (now recoverable thanks to the new trigger).

SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/verify-scholarship-cron',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := '{}'::jsonb
) AS req_id;
