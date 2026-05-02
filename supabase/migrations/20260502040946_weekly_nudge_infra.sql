-- ─── Weekly proactive nudges — infra ──────────────────────────────────
-- Adds the columns + indexes + cron schedule for a weekly AI-generated
-- check-in email. The actual content is composed by the
-- weekly-nudge-cron edge function from each user's tracker state.

-- Track when we last nudged + whether the user opted out. Both live on
-- student_profiles since that's the single source of truth for the user.
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_opt_out       boolean NOT NULL DEFAULT false;

-- Index used by the cron's eligibility query: pick users whose last
-- nudge was either NULL or older than 6 days, AND who haven't opted out.
CREATE INDEX IF NOT EXISTS idx_profiles_nudge_eligible
  ON public.student_profiles(last_nudge_sent_at)
  WHERE nudge_opt_out = false;

-- Audit log so we can see what nudges shot at what users (and tune
-- copy / cadence later). Service-role write only — no public RLS path.
CREATE TABLE IF NOT EXISTS public.nudge_log (
  nudge_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  -- Stored content for debugging / quality review later
  ai_body_preview   text,                 -- first ~600 chars of the AI output
  email_subject     text,
  -- Snapshot of the case-stats we used for prompt context (so we can
  -- backtrack to "what state did we see when we sent this?")
  tracked_count     integer,
  urgent_deadlines  integer,
  status_pending    integer,
  -- Email infra metadata
  email_status      text,                 -- 'sent' | 'failed' | 'skipped'
  email_error       text,
  duration_ms       integer
);

CREATE INDEX IF NOT EXISTS idx_nudge_log_user ON public.nudge_log(user_id, sent_at DESC);

ALTER TABLE public.nudge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Self read nudge log"
  ON public.nudge_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── pg_cron schedule ─────────────────────────────────────────────
-- Sundays at 10:00 UTC. Hits the edge function which fans out to all
-- eligible users. Cadence rationale: weekly is enough to feel like a
-- coach checking in but not enough to feel like spam. Sunday = students
-- planning the week ahead, especially for those drafting essays.
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
      url     := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-nudge-cron',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $cron$
);
