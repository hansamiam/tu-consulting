-- 2026-05-18: bump embed-scholarships-cron from once-daily to every 2h.
--
-- Pre-fix snapshot (13:40 UTC): 99 of 151 visible scholarships (65%)
-- had NULL embedding. embed-scholarships-cron ran daily at 05:00 UTC
-- but scrape-source was now landing 40+ rows/hour after the flash-tier
-- TPM unthrottle. The AI brief funnel and Discover semantic bucketing
-- silently miss any row without an embedding — so two-thirds of the
-- catalog was invisible to vector search until the next 05:00 fire.
--
-- 2h cadence catches a freshly-scraped row inside ~120 min, well below
-- the latency where a user would notice missing rows in their
-- personalised brief. Cost: text-embedding-3-small at $0.02/M tokens ×
-- ~50 rows × ~500 tokens ≈ $0.0005/run ≈ $0.006/day.

DO $$
BEGIN
  PERFORM cron.unschedule('embed-scholarships-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'embed-scholarships-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'embed-scholarships-cron',
  '0 */2 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/embed-scholarships',
      headers := jsonb_build_object(
        'apikey',       public.app_cron_token(),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
