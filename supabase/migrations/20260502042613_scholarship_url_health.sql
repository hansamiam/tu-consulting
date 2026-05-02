-- ─── Scholarship URL health-check infrastructure ─────────────────────
-- The data audit flagged that 38/42 scholarships were LLM-generated
-- with no human verification of official URLs. This commit makes the
-- catalog self-healing: a weekly cron fires HEAD/GET requests at every
-- scholarships.official_url, records the response, and the UI surfaces
-- "may have moved" warnings when a check fails.
--
-- The actual scrape happens in the scholarship-url-health-cron edge
-- function. This migration just adds the bookkeeping columns + the
-- pg_cron schedule.

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS url_check_status      text
    CHECK (url_check_status IS NULL OR url_check_status IN ('ok', 'redirect', 'fail', 'no_url')),
  ADD COLUMN IF NOT EXISTS url_check_http_code   smallint,
  ADD COLUMN IF NOT EXISTS url_last_checked_at   timestamptz,
  ADD COLUMN IF NOT EXISTS url_consecutive_fails smallint NOT NULL DEFAULT 0,
  -- After a successful check that returned a 30x with a final URL, we
  -- store the canonical destination so future regenerations of the
  -- catalog can converge on the live URL.
  ADD COLUMN IF NOT EXISTS url_resolved_to       text;

-- Partial index: rows that need re-checking (NULL or older than 7 days)
CREATE INDEX IF NOT EXISTS idx_scholarships_needs_url_check
  ON public.scholarships(url_last_checked_at)
  WHERE official_url IS NOT NULL;

-- Partial index: rows the UI should warn about (3+ consecutive fails)
CREATE INDEX IF NOT EXISTS idx_scholarships_url_warn
  ON public.scholarships(scholarship_id)
  WHERE url_consecutive_fails >= 3;

-- ─── Helper view: rows ripe for re-checking ──────────────────────
-- Drives the cron's fan-out. Excludes rows checked in the last 6 days
-- (so we don't hammer providers) and rows with no URL.
CREATE OR REPLACE VIEW public.scholarships_url_check_queue AS
  SELECT
    scholarship_id,
    official_url,
    url_consecutive_fails,
    url_last_checked_at
  FROM public.scholarships
  WHERE official_url IS NOT NULL
    AND official_url <> ''
    AND (
      url_last_checked_at IS NULL
      OR url_last_checked_at < (now() - interval '6 days')
    )
  ORDER BY
    -- Re-check failed rows first (they might have stabilised), then
    -- never-checked, then by oldest check.
    url_consecutive_fails DESC NULLS LAST,
    url_last_checked_at ASC NULLS FIRST;

GRANT SELECT ON public.scholarships_url_check_queue TO authenticated;

-- ─── pg_cron schedule ─────────────────────────────────────────────
-- Mondays 04:00 UTC. Off-hours for most providers, gives us 6 days
-- before students start arriving for the week.
DO $$
BEGIN
  PERFORM cron.unschedule('scholarship-url-health-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scholarship-url-health-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'scholarship-url-health-cron',
  '0 4 * * 1',
  $cron$
    SELECT net.http_post(
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/scholarship-url-health-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);
