-- Schedule the saved-searches-cron edge function
--
-- Daily at 08:00 UTC (one hour before the deadline cron so the digest
-- and the urgent reminder don't hit the inbox at the same minute).
-- The edge function does the heavy lifting — see
-- supabase/functions/saved-searches-cron/index.ts.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('saved-searches-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'saved-searches-cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'saved-searches-cron',
  '0 8 * * *',
  $cron$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/saved-searches-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);
