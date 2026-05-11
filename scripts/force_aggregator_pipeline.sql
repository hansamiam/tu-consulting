-- Force the aggregator discovery + scrape pipeline for the
-- opportunitiesforyouth.org and opportunitytracker.ug hubs.
--
-- What this does:
--   1) Shows current state of the 4 aggregator sources (last crawl, errors)
--   2) Fires discover-from-hub on each (sync — pg_net is async, results in net._http_response)
--   3) Fires scrape-cron-dispatcher with force_all=true after a small delay
--      window so any newly-inserted source rows from step 2 are picked up
--   4) Shows recent net._http_response rows so you can verify each call
--
-- Run the whole block in one go. Then wait ~60-90s and re-run section (4)
-- to see results.

-- ─── (1) Current state ─────────────────────────────────────────────────
SELECT
  source_id,
  name,
  url,
  category,
  is_active,
  health_status,
  consecutive_failures,
  frequency_hours,
  last_crawled_at,
  last_success_at,
  age(now(), last_crawled_at) AS since_last_crawl
FROM public.scholarship_sources
WHERE url ILIKE '%opportunitiesforyouth.org%'
   OR url ILIKE '%opportunitiestracker.ug%'
   OR url ILIKE '%opportunitytracker.ug%'
ORDER BY url;

-- ─── (2) Fire discover-from-hub on each aggregator ─────────────────────
-- Calls the discover-from-hub edge function for each hub source_id we
-- just listed. This walks the hub page, extracts individual program URLs
-- via LLM, and inserts new rows in scholarship_sources for each.
WITH hubs AS (
  SELECT source_id
  FROM public.scholarship_sources
  WHERE (url ILIKE '%opportunitiesforyouth.org%' OR url ILIKE '%opportunitiestracker.ug%')
    AND is_active = true
)
SELECT
  source_id,
  net.http_post(
    url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/discover-from-hub',
    headers := jsonb_build_object(
      'apikey',       public.app_cron_token(),
      'Authorization','Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body    := jsonb_build_object('hub_source_id', source_id)
  ) AS http_request_id
FROM hubs;

-- ─── (3) Fire scrape-cron-dispatcher with force_all=true ───────────────
-- This re-scrapes EVERY due source. Combined with step 2 above, this
-- will pick up newly-discovered per-program URLs as well as re-scrape
-- the hubs themselves. force_all bypasses the cadence check so even
-- recently-crawled sources fire.
SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-cron-dispatcher',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Authorization','Bearer ' || public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := jsonb_build_object('force_all', true)
) AS http_request_id;

-- ─── (3b) Fire canonical-extract + cover-image enrichment ──────────────
-- Both crons populate user-visible fields (overview / funding text /
-- cover image) that students see on Discover cards. Manually firing
-- them after a fresh scrape batch lets the catalog look complete
-- instead of waiting for the next nightly tick.
SELECT 'canonical' AS which, net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/canonical-extract-cron',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Authorization','Bearer ' || public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := '{}'::jsonb
) AS req_id
UNION ALL
SELECT 'cover-images', net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/enrich-cover-images-cron',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Authorization','Bearer ' || public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := '{}'::jsonb
);

-- ─── (4) After 60-90s, run THIS section alone to inspect results ───────
-- Replace the http_request_id list with whichever IDs you got back above.
SELECT
  id,
  status_code,
  CASE
    WHEN status_code = 200 THEN 'ok'
    WHEN status_code IS NULL THEN 'pending'
    ELSE 'fail'
  END AS verdict,
  LEFT(content::text, 500) AS preview,
  created
FROM net._http_response
ORDER BY id DESC
LIMIT 20;
