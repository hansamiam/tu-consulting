-- ─── Schedule the scholarship-deadline-cron edge function ────────────
-- Runs daily at 09:00 UTC. Looks at application_tracker rows the user
-- is actively tracking, finds those with deadlines in the next 30
-- days, and emails the user a reminder. Cadence and idempotency are
-- handled inside the edge function (reminder_sent_at + bucket logic).
--
-- Why pg_cron + net.http_post: that's how Supabase recommends invoking
-- edge functions on a schedule from inside the database. The vault
-- secret stores the project's service-role key so the cron call can
-- authenticate; the URL is the project's edge-function endpoint.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Register the function URL + auth header. These reference vault
-- secrets the user sets in Supabase dashboard → Project Settings →
-- Vault. If the secret doesn't exist yet, the cron call fails noisily
-- (which is the right behaviour — we don't want the cron silently
-- skipping because of misconfiguration).
DO $$
BEGIN
  -- Unschedule any prior version of this job before re-creating
  PERFORM cron.unschedule('scholarship-deadline-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scholarship-deadline-cron');
EXCEPTION
  WHEN OTHERS THEN NULL;  -- harmless on first run
END $$;

SELECT cron.schedule(
  'scholarship-deadline-cron',
  '0 9 * * *',            -- daily at 09:00 UTC (covers most timezones reasonably)
  $cron$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/scholarship-deadline-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);

-- Note for ops: the two `app.settings.*` GUCs above must be set at the
-- database level for the cron to fire. They're typically pre-populated
-- by Supabase but can be set explicitly:
--   ALTER DATABASE postgres SET app.settings.supabase_url      = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key  = '<key>';
-- The service-role secret is also exposed to the edge function as
-- SUPABASE_SERVICE_ROLE_KEY — they reference the same secret material.
