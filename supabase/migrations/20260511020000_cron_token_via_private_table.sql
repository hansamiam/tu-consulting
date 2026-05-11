-- Cron token plumbing — switch from current_setting('app.cron_token')
-- to a helper function reading from a private table.
--
-- Background: the existing 9 cron jobs read the service-role bearer
-- token via current_setting('app.cron_token', true), which assumed
-- the GUC was set via `ALTER DATABASE postgres SET app.cron_token = '...'`.
-- That requires superuser, and Supabase cloud doesn't grant it. The
-- dashboard's "Custom Postgres parameters" page also doesn't exist on
-- every plan/version. So crons silently sent `Authorization: Bearer `
-- (empty token) and 401'd against their edge functions.
--
-- This migration switches the pattern: a private table holds the secret,
-- a SECURITY DEFINER function reads it, and every affected cron schedule
-- is re-registered to call the function. The user only has to insert the
-- secret value once via the SQL editor (instructions at the bottom of
-- this file).
--
-- Rotation is now a single UPDATE on the private table — no superuser,
-- no migration churn.

-- ─── Private schema for secrets ────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;

-- Lock the schema down. Default Supabase grants public access broadly;
-- we want only postgres + service_role to even see this schema exists.
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.app_secrets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.app_secrets TO postgres, service_role;

-- ─── Helper function — the new "current_setting" equivalent ─────────────
-- SECURITY DEFINER so it can read private.app_secrets regardless of who
-- invokes it; access controlled by the GRANT below (postgres + service_role
-- only, which is what pg_cron jobs run as).
CREATE OR REPLACE FUNCTION public.app_cron_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT value FROM private.app_secrets WHERE key = 'cron_token';
$$;

REVOKE ALL ON FUNCTION public.app_cron_token() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_cron_token() TO postgres, service_role;

COMMENT ON FUNCTION public.app_cron_token() IS
  'Returns the service-role bearer token used by pg_cron jobs to call
   edge functions. Replaces the prior current_setting(''app.cron_token'')
   pattern, which required superuser. The secret value lives in
   private.app_secrets — set once via the SQL editor, rotate via UPDATE.';

-- ─── Re-schedule all crons that previously used current_setting ────────
-- Each block: unschedule by name (no-op if not scheduled) then re-create
-- with the new public.app_cron_token() call. Body matches the prior
-- migration's intent verbatim — only the auth line changes.

-- 1. scrape-cron-dispatcher (every 5 min) — pulls due sources from queue.
SELECT cron.unschedule('scrape-cron-dispatcher') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'scrape-cron-dispatcher'
);
SELECT cron.schedule('scrape-cron-dispatcher', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-cron-dispatcher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 2. discover-from-hubs-cron (daily 02:00 UTC) — finds new scholarship
-- sources from configured hubs.
SELECT cron.unschedule('discover-from-hubs-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'discover-from-hubs-cron'
);
SELECT cron.schedule('discover-from-hubs-cron', '0 2 * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/discover-from-hubs-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 3. scholarship-url-health-cron (every 4 hours) — pings each scholarship's
-- official_url, marks broken/redirect rows.
SELECT cron.unschedule('scholarship-url-health-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'scholarship-url-health-cron'
);
SELECT cron.schedule('scholarship-url-health-cron', '0 */4 * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scholarship-url-health-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 4. verify-scholarship-cron (every 30 min) — drains the stale-row queue.
SELECT cron.unschedule('verify-scholarship-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'verify-scholarship-cron'
);
SELECT cron.schedule('verify-scholarship-cron', '*/30 * * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/verify-scholarship-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 5. enrich-scholarships-content-cron (daily 04:30 UTC) — narrative-field
-- backfill (why_this_fits, how_to_win, ideal_candidate_profile).
SELECT cron.unschedule('enrich-scholarships-content-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'enrich-scholarships-content-cron'
);
SELECT cron.schedule('enrich-scholarships-content-cron', '30 4 * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/enrich-scholarships-content-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 6. enrich-universities-cron (daily 03:00 UTC) — top-25 stale university
-- backfill.
SELECT cron.unschedule('enrich-universities-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'enrich-universities-cron'
);
SELECT cron.schedule('enrich-universities-cron', '0 3 * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/enrich-universities-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 7. promote-pending-cron (every 10 min) — promotes high-confidence pending
-- rows out of the staging table.
SELECT cron.unschedule('promote-pending-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'promote-pending-cron'
);
SELECT cron.schedule('promote-pending-cron', '*/10 * * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/promote-pending-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 8. embed-scholarships-cron (daily 05:00 UTC) — recomputes pgvector
-- embeddings for rows whose text fields changed.
SELECT cron.unschedule('embed-scholarships-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'embed-scholarships-cron'
);
SELECT cron.schedule('embed-scholarships-cron', '0 5 * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/embed-scholarships',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 9. funder_truth_probe_daily (daily 06:00 UTC) — adversarial integrity
-- probe over flagship scholarships.
SELECT cron.unschedule('funder_truth_probe_daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'funder_truth_probe_daily'
);
SELECT cron.schedule('funder_truth_probe_daily', '0 6 * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/funder-truth-probe',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- 10. pro-upgrade-nudge-cron (daily 14:00 UTC) — Day 5-14 conversion email
-- loop for free-tier sign-ups.
SELECT cron.unschedule('pro-upgrade-nudge-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pro-upgrade-nudge-cron'
);
SELECT cron.schedule('pro-upgrade-nudge-cron', '0 14 * * *', $$
  SELECT net.http_post(
    url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/pro-upgrade-nudge-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || public.app_cron_token(),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- ─── Final step — user MUST run the following in the SQL editor ───────
--
--   INSERT INTO private.app_secrets (key, value)
--   VALUES ('cron_token', 'YOUR_SERVICE_ROLE_KEY_HERE')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
--
-- Until that row exists, public.app_cron_token() returns NULL and the
-- jobs still 401. After that one INSERT, every cron above starts
-- authenticating cleanly. To rotate the key later: same statement
-- with the new value.
