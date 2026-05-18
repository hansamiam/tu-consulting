-- 2026-05-18: Migrate the last four HTTP crons to public.app_cron_token().
--
-- Pre-fix breakdown:
--   - lifecycle-emails-cron: used current_setting('app.settings.supabase_url').
--     That GUC was never set on this project, so the daily 10:00 UTC
--     fire was erroring `unrecognized configuration parameter` and
--     dropping the 24h / 1h / rebook reminders silently.
--   - saved-searches-cron: same broken pattern. Daily 08:00 UTC saved-
--     search digest never reached users.
--   - scholarship-deadline-cron: schedule used a literal HS256-signed
--     JWT baked into the cron command. Survives today but breaks the
--     moment the project's "disable legacy JWT" gateway toggle flips.
--   - weekly-nudge-cron: same literal-JWT pattern, same rotation risk.
--
-- public.app_cron_token() reads from private.app_secrets, which is the
-- one place gateway rotation always touches first. Same pattern used
-- since 20260511020000_cron_token_via_private_table for the other
-- crons; this migration brings the four laggards into line.

-- lifecycle-emails-cron — daily 10:00 UTC, sends 24h/1h booking reminders +
-- rebook nudge from email queue.
DO $$
BEGIN
  PERFORM cron.unschedule('lifecycle-emails-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lifecycle-emails-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'lifecycle-emails-cron',
  '0 10 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/lifecycle-emails-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || public.app_cron_token()
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);

-- saved-searches-cron — daily 08:00 UTC, evaluates each user's saved
-- search filters against the catalog and emails matches.
DO $$
BEGIN
  PERFORM cron.unschedule('saved-searches-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'saved-searches-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'saved-searches-cron',
  '0 8 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/saved-searches-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || public.app_cron_token()
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);

-- scholarship-deadline-cron — daily 09:00 UTC, "deadlines close in N
-- days" digest.
DO $$
BEGIN
  PERFORM cron.unschedule('scholarship-deadline-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scholarship-deadline-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'scholarship-deadline-cron',
  '0 9 * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scholarship-deadline-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || public.app_cron_token()
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);

-- weekly-nudge-cron — Sunday 10:00 UTC, weekly engagement digest.
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-nudge-cron')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-nudge-cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'weekly-nudge-cron',
  '0 10 * * 0',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/weekly-nudge-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || public.app_cron_token()
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);
