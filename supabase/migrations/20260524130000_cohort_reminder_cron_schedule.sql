-- Phase B3 v2 — cohort-reminder-cron pg_cron schedule.
--
-- Fires every 5 minutes. The cron edge function walks cohort_events with
-- starts_at coming up in the next 24h or 1h and reminder_*_sent_at IS NULL,
-- fans out emails to active members, then marks the sent_at flag.
--
-- 5-min granularity means worst-case reminder slip is ~5 min on either
-- window. Fine for human-attended events.
--
-- The dispatchClient token (from private.app_secrets) gets injected into
-- the Authorization header so the call passes requireAdminOrService at
-- the function level, even with the "disable legacy JWT" project setting.
--
-- Pattern matches the other tu-consulting pg_cron entries — see
-- 20260523020000_slash_firecrawl_burning_cron_cadences.sql for the
-- canonical shape.

SELECT cron.schedule(
  'cohort-reminder-cron',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/cohort-reminder-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT secret_value
            FROM private.app_secrets
           WHERE secret_name = 'edge_dispatch_token'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
