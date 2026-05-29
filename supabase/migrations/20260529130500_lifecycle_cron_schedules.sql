-- =============================================================================
-- Lifecycle engagement — cron schedules
-- =============================================================================
-- 1. workshop-broadcast-cron — every 5 minutes
--    Fires the 24h + 1h Zoom-link broadcasts for upcoming workshops.
--    Window-based scan + per-window sent_at flag = idempotent under
--    cron jitter.
--
-- 2. daily-kpi-digest-cron — 04:00 UTC (= 09:00 Almaty, UTC+5)
--    One email to samuel.shn.han@gmail.com summarising yesterday's
--    signups / MRR / churn / wizard conversion.
-- =============================================================================

SELECT cron.schedule(
  'workshop-broadcast-cron',
  '*/5 * * * *',
  $cron$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/workshop-broadcast-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);

SELECT cron.schedule(
  'daily-kpi-digest-cron',
  '0 4 * * *',
  $cron$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/daily-kpi-digest-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);
