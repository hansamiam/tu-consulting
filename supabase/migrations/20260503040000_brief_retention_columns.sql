-- =============================================================================
-- Brief retention columns on student_profiles
-- =============================================================================
-- Two timestamps that drive the freemium-to-Pro retention loop:
--
--   last_brief_generated_at — stamped by topuni-ai-pathway when an authed
--     user finishes generating a brief. Lets the pro-upgrade-nudge cron
--     find users whose brief is N days old without polling localStorage.
--
--   pro_nudge_sent_at — stamped by pro-upgrade-nudge-cron after the
--     conversion nudge fires. Idempotency guard so we never double-send
--     the upgrade email; also lets us segment "nudged but didn't convert"
--     in admin insights.
--
-- Both nullable so the columns are safe on existing rows.
-- =============================================================================

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS last_brief_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_nudge_sent_at       timestamptz;

-- Index speeds up the cron's scan: WHERE last_brief_generated_at BETWEEN
-- (now - 14 days) AND (now - 5 days) AND pro_nudge_sent_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_student_profiles_pro_nudge_window
  ON public.student_profiles(last_brief_generated_at)
  WHERE pro_nudge_sent_at IS NULL;
