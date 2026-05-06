-- Schedule enrich-cover-images-cron
--
-- Daily at 04:00 UTC. Runs after the scrape cron (typically 02:00)
-- and the soft-fields enrichment cron (03:00) so any rows newly
-- scraped today have their official_url settled before we try to
-- read their og:image.
--
-- The edge function does the work — see
-- supabase/functions/enrich-cover-images-cron/index.ts. Cap is
-- MAX_PER_RUN=50 in the function, throttled at 1.5s/row, so a run
-- takes ~75 seconds and respects providers we're scraping from.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('enrich-cover-images-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enrich-cover-images-cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'enrich-cover-images-cron',
  '0 4 * * *',
  $cron$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/enrich-cover-images-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);
