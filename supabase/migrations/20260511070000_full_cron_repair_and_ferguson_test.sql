-- Full cron repair + Ferguson Scholarship pipeline test.
--
-- The user is in auto-mode: this migration does three things end-to-end
-- so we stop ping-ponging SQL paste blocks:
--
--   1) Re-schedule EVERY known edge-function cron with the apikey-only
--      header pattern. Some jobs were inserted by older migrations with
--      legacy Authorization: Bearer auth and weren't covered by the
--      consolidated re-schedule in 20260511040000 (canonical-extract-cron
--      and enrich-cover-images-cron were only scheduled in 20260511060000
--      under apikey-only; this is a defensive sweep).
--
--   2) Register a known-good aggregator article URL (the Ferguson
--      Scholarship at Aston, from opportunitiesforyouth.org) as a
--      standalone scholarship_sources row + fire scrape-source on it
--      immediately. Lets us prove the per-article extraction path
--      works end-to-end on real opportunities-for-youth content.
--
--   3) Manually fire all three data-quality crons (scrape, canonical,
--      cover images) so the user sees the next batch of new rows
--      without waiting for the next scheduled tick.

-- ────────────────────────────────────────────────────────────────────
-- (1) Defensive cron repair — drop + re-schedule EVERY job we know
-- about so they all use the apikey-only header. Idempotent: unschedule
-- only runs if the job exists.
-- ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  base text := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/';
  spec record;
BEGIN
  FOR spec IN
    SELECT jobname, schedule, url_suffix FROM (VALUES
      ('scrape-cron-dispatcher',           '*/5 * * * *',   'scrape-cron-dispatcher'),
      ('discover-from-hubs-cron',          '0 */6 * * *',   'discover-from-hubs-cron'),
      ('scholarship-url-health-cron',      '0 */4 * * *',   'scholarship-url-health-cron'),
      ('verify-scholarship-cron',          '*/30 * * * *',  'verify-scholarship-cron'),
      ('enrich-scholarships-content-cron', '30 4 * * *',    'enrich-scholarships-content-cron'),
      ('enrich-universities-cron',         '0 3 * * *',     'enrich-universities-cron'),
      ('promote-pending-cron',             '*/10 * * * *',  'promote-pending-cron'),
      ('embed-scholarships-cron',          '0 5 * * *',     'embed-scholarships'),
      ('funder_truth_probe_daily',         '0 6 * * *',     'funder-truth-probe'),
      ('pro-upgrade-nudge-cron',           '0 14 * * *',    'pro-upgrade-nudge-cron'),
      ('canonical-extract-cron',           '15 */6 * * *',  'canonical-extract-cron'),
      ('enrich-cover-images-cron',         '30 3 * * *',    'enrich-cover-images-cron')
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

-- ────────────────────────────────────────────────────────────────────
-- (2) Register the Ferguson Scholarship article URL + fire scrape.
-- ────────────────────────────────────────────────────────────────────
INSERT INTO public.scholarship_sources
  (name, url, source_type, region, category, frequency_hours, parser_hint, is_active)
VALUES
  ('Ferguson Scholarship 2026 (Aston, via O4Y)',
   'https://opportunitiesforyouth.org/2026/05/09/ferguson-scholarship-2026-at-aston-university-fully-funded-masters-opportunity-for-students-from-africa-and-india/',
   'html', 'United Kingdom', 'official', 24,
   'Individual scholarship article from Opportunities for Youth. Extract per standard scrape-source rules. official_url should be the Aston University page if linked, else this article URL.',
   true)
ON CONFLICT (url) DO UPDATE SET is_active = true, updated_at = now();

-- Fire scrape-source on the Ferguson row.
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

-- ────────────────────────────────────────────────────────────────────
-- (3) Kick the three data-quality dispatchers so the user sees
-- pipeline activity within ~2 minutes instead of waiting for the
-- next scheduled tick.
-- ────────────────────────────────────────────────────────────────────
SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-cron-dispatcher',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := jsonb_build_object('force_all', true)
);

SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/canonical-extract-cron',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := '{}'::jsonb
);

SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/enrich-cover-images-cron',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := '{}'::jsonb
);
