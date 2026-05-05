-- Schedule the lifecycle-emails-cron edge function
--
-- Daily at 10:00 UTC. Two hours after the saved-searches cron, three
-- after the deadline cron — spaces out the morning email pulse so a
-- user with multiple flavors of activity doesn't get a stack of
-- TopUni emails in the same minute.
--
-- The edge function handles:
--   · Day 1 since signup → activation-day-1
--   · Day 7 since signup → activation-day-7
--   · 30+ days since last sign-in → inactive-winback (60-day cooldown)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('lifecycle-emails-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lifecycle-emails-cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'lifecycle-emails-cron',
  '0 10 * * *',
  $cron$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/lifecycle-emails-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);
