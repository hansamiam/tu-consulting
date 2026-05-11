-- Schedule the two data-quality crons that were never wired into
-- pg_cron — both functions exist and work, they just weren't hooked
-- up to a recurring trigger. The catalog has been accumulating new
-- rows without anyone running them periodically.
--
-- canonical-extract-cron: produces the canonical_overview /
--   canonical_funding_text / canonical_funding_usd / canonical_deadline_iso
--   fields the Discover overview line reads from. Without this, every
--   row falls back to the raw award_amount_text the scraper LLM emitted,
--   which is exactly the "Funds X" inconsistency on the catalogue
--   (some rows show '$50,000 stipend', others show 'Full tuition + travel').
--
-- enrich-cover-images-cron: writes cover_image_url from og:image
--   meta tags on the official page. Without this every card and
--   DetailSheet hero just shows the country gradient + landmark
--   silhouette fallback — the missing-hero-image complaint.
--
-- Both functions cap themselves at 50 rows/run and have built-in
-- throttling, so the cost / load envelope is predictable. They both
-- use the same apikey-header auth path as the other cron jobs
-- (re-scheduled in 20260511040000_cron_apikey_header.sql).

DO $$
DECLARE
  base text := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/';
  spec record;
BEGIN
  FOR spec IN
    SELECT jobname, schedule, url_suffix FROM (VALUES
      -- canonical-extract — daily 04:00 UTC. Runs AFTER verify-scholarship-cron's
      -- last in-day pass (every 30 min, so it's always recent) so the
      -- canonical extractor reads from just-verified data.
      ('canonical-extract-cron',       '0 4 * * *',  'canonical-extract-cron'),
      -- enrich-cover-images — daily 03:30 UTC. Earlier in the night so
      -- new rows landed since yesterday have a cover image by morning UK.
      -- No LLM cost, just HEAD requests, so the daily cadence is fine
      -- (a backlog of 50 rows/day drains the typical insert rate).
      ('enrich-cover-images-cron',     '30 3 * * *', 'enrich-cover-images-cron')
    ) AS t(jobname, schedule, url_suffix)
  LOOP
    PERFORM cron.unschedule(spec.jobname)
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = spec.jobname);
    PERFORM cron.schedule(
      spec.jobname,
      spec.schedule,
      format($job$
        SELECT net.http_post(
          url     := %L,
          headers := jsonb_build_object(
            'apikey',       public.app_cron_token(),
            'Content-Type', 'application/json'
          ),
          body    := '{}'::jsonb
        );
      $job$, base || spec.url_suffix)
    );
  END LOOP;
END $$;
