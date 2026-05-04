-- =============================================================================
-- pg_cron schedules — self-expanding scholarship registry
-- =============================================================================
-- Two new schedules wire the discovery + dispatch loop:
--
--   · scrape-cron-dispatcher  — hourly. Picks any scholarship_source that's
--     due (by frequency_hours / never crawled) and fans out a scrape-source
--     call per source. Already exists in code, never had a schedule —
--     scraping was admin-triggered until now. With this, the catalogue
--     stays fresh automatically.
--
--   · discover-from-hubs-cron — weekly Sunday 02:00 UTC. Walks every
--     scholarship_source with category='aggregator' and asks the
--     discover-from-hub function to extract individual program URLs from
--     the hub. New URLs land in scholarship_sources and are picked up by
--     the hourly dispatcher above on its next tick.
--
-- Same auth pattern as the other crons (current_setting('app.cron_token')
-- so the service-role JWT stays out of git). Idempotent — drops same-name
-- schedules first.
-- =============================================================================

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('scrape-cron-dispatcher');     EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('discover-from-hubs-cron');     EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

-- Hourly dispatcher — picks up to 20 due sources per tick, throttled
-- internally so we stay under Firecrawl's free-tier rate limit.
SELECT cron.schedule(
  'scrape-cron-dispatcher',
  '15 * * * *',  -- every hour at :15 (offset from other crons)
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-cron-dispatcher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Weekly hub discovery — Sunday 02:00 UTC. Six hubs per tick (caps under
-- the 60s function timeout); enough that a 10-hub catalogue gets refreshed
-- in 1-2 weeks. Adjust upward when the hub list grows.
SELECT cron.schedule(
  'discover-from-hubs-cron',
  '0 2 * * 0',  -- Sundays 02:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/discover-from-hubs-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
