-- Two things:
--   1) Force a fresh extraction of the Ferguson article by nulling
--      its source-side content_hash. scrape-source's hash short-
--      circuit no longer kicks in and the LLM extraction runs again
--      under the new 0.78 auto-publish threshold (was 0.85).
--   2) Fire promote-pending-cron explicitly. Now that the threshold
--      drop is live, pending staging rows that hold real data at
--      confidence 0.78-0.84 should promote to the live scholarships
--      table. promote-pending-cron has its own backpressure (80
--      rows/run) so this kicks one tick — the next scheduled run
--      (every 10 min) picks up the next batch.

-- (1) Re-fetch Ferguson with fresh LLM extraction
UPDATE public.scholarship_sources
SET last_content_hash = NULL,
    updated_at        = now()
WHERE url = 'https://opportunitiesforyouth.org/2026/05/09/ferguson-scholarship-2026-at-aston-university-fully-funded-masters-opportunity-for-students-from-africa-and-india/';

SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-source',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := jsonb_build_object('source_id', (
    SELECT source_id FROM public.scholarship_sources
    WHERE url = 'https://opportunitiesforyouth.org/2026/05/09/ferguson-scholarship-2026-at-aston-university-fully-funded-masters-opportunity-for-students-from-africa-and-india/'
  ))
);

-- (2) Drain the pending staging backlog at the lower threshold.
-- promote-pending-cron re-verifies each pending row against its
-- source URL and auto-publishes if the re-verification confirms
-- the data. With the new 0.78 floor more rows will clear the bar.
SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/promote-pending-cron',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := '{}'::jsonb
);

-- (3) Also fire scrape-cron-dispatcher with force_all so the rest of
-- the catalog gets a fresh pass under the new threshold.
SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-cron-dispatcher',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := jsonb_build_object('force_all', true)
);
