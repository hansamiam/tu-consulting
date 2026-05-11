-- Two pipeline upgrades for the aggregator-discovery loop:
--
-- 1) Bump discover-from-hubs-cron from daily (02:00 UTC) → every 6h.
--    The daily cadence meant a scholarship posted to an aggregator
--    waited up to 24h before its individual URL was even discovered,
--    then another scrape-cron-dispatcher tick (5-minute cadence) to
--    actually fetch the article. Total time-to-catalog: up to 25h.
--    With 6h cadence the worst case drops to ~6h and the average to
--    ~3h — at typical 1-3 fresh posts/day per hub this is the right
--    cost / freshness trade. Each tick burns ~4 Firecrawl + 4 LLM
--    calls = ~$0.06/day on top of the current spend.
--
-- 2) Bump frequency_hours for already-discovered "official" sources
--    that came in via discover-from-hub. They started at 120h (5 days)
--    as a safety net — a brand-new URL might have been LLM-hallucinated
--    junk. Once the source has produced any successful scrape, drop
--    the cadence to 24h so new content on those individual program
--    pages also reaches the catalog within a day. Pure-LLM-junk sources
--    will get caught by the circuit-breaker (5 consecutive failures
--    → skip) regardless of cadence.

-- (1) Re-schedule the hub discovery cron at 6h cadence using the same
-- apikey-header helper as the rest of the cron jobs.
DO $$
DECLARE
  fn_url text := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/discover-from-hubs-cron';
BEGIN
  -- Drop existing schedule if present.
  PERFORM cron.unschedule('discover-from-hubs-cron')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'discover-from-hubs-cron');

  PERFORM cron.schedule(
    'discover-from-hubs-cron',
    '0 */6 * * *',  -- every 6 hours on the hour
    format($job$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'apikey',       public.app_cron_token(),
          'Content-Type', 'application/json'
        ),
        body    := '{}'::jsonb
      );
    $job$, fn_url)
  );
END $$;

-- (2) Tighten cadence for sources discovered via the hub-discovery loop
-- that have already proven themselves (had at least one successful scrape).
-- Anything in category != 'aggregator' that's currently at the original
-- 120h discovery default → drop to 24h. Aggregator hubs stay where they
-- are (they're walked by discover-from-hubs-cron, not the regular dispatcher).
UPDATE public.scholarship_sources
SET frequency_hours = 24,
    updated_at      = now()
WHERE frequency_hours = 120
  AND category != 'aggregator'
  AND is_active = true
  AND last_success_at IS NOT NULL;
