-- Full diagnostic + force-walk for the opportunitiesforyouth.org pipeline.
--
-- Despite multiple cron fires today, only the Ferguson article (manually
-- inserted) is in the catalog. The other 4-5 recent articles visible on
-- the aggregator home page (BIOFABRICATE Trinity, Shaun Johnson, Agri-Food
-- Spain, Images & Justice Copenhagen) haven't been discovered as sources,
-- meaning discover-from-hub hasn't successfully walked the hub since this
-- afternoon's deploys.
--
-- Theory: discover-from-hubs-cron's last successful walk was before our
-- dispatchClient fix (commit 419048a). The cron runs every 6h on the hour
-- (0 */6); the next scheduled walk after the fix would be at 12:00 UTC
-- which hasn't happened yet from the user's vantage point (~07:00 UTC).
--
-- Force-walk all opportunitiesforyouth + opportunitytracker hubs RIGHT NOW
-- via direct net.http_post calls to discover-from-hub. discover-from-hub
-- itself isn't a fan-out function (it just inserts into scholarship_sources)
-- so it works regardless of the dispatchClient pattern.

-- (1) Force discover-from-hub on each O4Y / OT hub. Each call walks 2
-- pages of listings and inserts ~30 per-program URLs as new sources.
WITH hubs AS (
  SELECT source_id, name FROM public.scholarship_sources
  WHERE (url ILIKE '%opportunitiesforyouth.org%'
      OR url ILIKE '%opportunitiestracker.ug%'
      OR url ILIKE '%opportunitytracker.ug%')
    AND is_active = true
    AND category = 'aggregator'
)
SELECT
  name,
  net.http_post(
    url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/discover-from-hub',
    headers := jsonb_build_object(
      'apikey',       public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body    := jsonb_build_object('hub_source_id', source_id)
  ) AS req_id
FROM hubs;

-- (2) Wait for the discover calls to finish, then force-scrape every
-- O4Y / OT URL that's now registered as a source. pg_sleep blocks the
-- migration until the http_posts have had time to land their results.
SELECT pg_sleep(45);

-- (3) Pick up any per-program URLs the discover walk just inserted and
-- fire scrape-source on each. Cap at 80 to stay well under the
-- dispatcher's per-tick concurrency.
WITH new_program_sources AS (
  SELECT source_id, url
  FROM public.scholarship_sources
  WHERE category != 'aggregator'
    AND is_active = true
    AND (url ILIKE '%opportunitiesforyouth.org%'
      OR url ILIKE '%opportunitiestracker.ug%')
    AND (last_crawled_at IS NULL OR last_crawled_at < now() - interval '12 hours')
  ORDER BY last_crawled_at NULLS FIRST
  LIMIT 80
)
SELECT
  LEFT(url, 80) AS url_prefix,
  net.http_post(
    url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-source',
    headers := jsonb_build_object(
      'apikey',       public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body    := jsonb_build_object('source_id', source_id)
  ) AS req_id
FROM new_program_sources;
