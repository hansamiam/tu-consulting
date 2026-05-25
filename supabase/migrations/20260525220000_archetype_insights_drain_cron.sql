-- Schedule the drain-archetype-insights dispatcher. Pattern mirrors
-- 20260524150000_process_email_queue_cron.sql exactly — apikey header
-- carrying public.app_cron_token(), idempotent re-schedule, cadence
-- baked into the migration so a fresh project gets the cron without an
-- out-of-band step.
--
-- Cadence: every 60 seconds. The drain function reads a batch of 8
-- queue rows per fire and calls the LLM for each, costing ~24-32s of
-- wall clock. 60s is the conservative ceiling that keeps the function
-- from overlapping with itself.

DO $$
BEGIN
  PERFORM cron.unschedule('drain-archetype-insights')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-archetype-insights');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'drain-archetype-insights',
  '60 seconds',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/drain-archetype-insights',
      headers := jsonb_build_object(
        'apikey',       public.app_cron_token(),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
