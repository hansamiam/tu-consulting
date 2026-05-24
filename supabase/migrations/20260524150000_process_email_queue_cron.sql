-- Schedule the process-email-queue dispatcher. Until now this cron was
-- only described as a "post-migration dynamic step" in the comment block
-- of 20260425085224_email_infra.sql (lines 285-292) and was meant to be
-- created out-of-band via the Supabase Management API. That step was
-- never automated, so on a fresh project the cron is missing and the
-- pgmq queues (auth_emails + transactional_emails) sit unread:
-- enqueue-side code (send-transactional-email, auth-email-hook) succeeds,
-- but the dispatcher never fires, so no email ever actually goes out.
--
-- This migration moves the schedule into version control. Idempotent —
-- unschedule first inside an EXCEPTION-handled DO block so re-running
-- replaces the schedule cleanly. If the cron is already running in prod
-- it gets re-registered with no behavior change.
--
-- Interval: every 5 seconds. Matches the original spec comment. The
-- pg_cron extension on Supabase supports sub-minute schedules with the
-- "N seconds" interval syntax. The dispatcher itself is cheap when the
-- queues are empty (one SELECT + early return) so the 5s cadence is
-- bounded by queue-not-empty work, not by the schedule.
--
-- Auth: apikey header carrying public.app_cron_token() — matches the
-- pattern used by every other cron in this project (see
-- 20260511060000_schedule_missing_data_quality_crons.sql and
-- 20260518142000_embed_scholarships_cron_every_2h.sql). The
-- process-email-queue function uses requireAdminOrService(), which
-- accepts the cron_token via either Bearer or apikey header.

DO $$
BEGIN
  PERFORM cron.unschedule('process-email-queue')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue');
EXCEPTION WHEN OTHERS THEN
  -- Swallow — if cron extension isn't installed yet or the job already
  -- doesn't exist, the schedule call below will still work (or fail
  -- with a clearer error). We never want this DO block to abort the
  -- migration because the prior state was already clean.
  NULL;
END $$;

SELECT cron.schedule(
  'process-email-queue',
  '5 seconds',
  $cron$
    SELECT net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'apikey',       public.app_cron_token(),
        'Content-Type', 'application/json'
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
