-- =============================================================================
-- Lifecycle engagement infrastructure — 2026-05-29
-- =============================================================================
-- One migration covering the launch-month lifecycle work:
--   1. stripe_event_log              — webhook idempotency (revenue safety)
--   2. academy_workshops broadcasts  — 24h + 1h cron-driven Zoom-link blast
--   3. workshop_questions            — "direct line" form members can submit to
--   4. broadcast_notices             — admin ad-hoc broadcasts (history log)
--   5. profiles.deleted_at           — GDPR soft-delete column
--   6. academy_resources flag        — pick one row as the signup welcome gift
-- All new tables enable RLS and grant predictable schema-level access.
-- =============================================================================

-- 1. STRIPE EVENT LOG --------------------------------------------------------
-- Prevents double-processing on Stripe retries (a Stripe webhook that
-- doesn't 200 within ~30s is retried, and currently the webhook would
-- re-fire welcome emails on the retry — duplicating customer pain).
CREATE TABLE IF NOT EXISTS public.stripe_event_log (
  event_id      text PRIMARY KEY,
  event_type    text NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  payload_hash  text
);

CREATE INDEX IF NOT EXISTS idx_stripe_event_log_received
  ON public.stripe_event_log (received_at DESC);

ALTER TABLE public.stripe_event_log ENABLE ROW LEVEL SECURITY;
-- Service role only — no anon / authenticated access.
GRANT SELECT, INSERT ON public.stripe_event_log TO service_role;

-- 2. ACADEMY WORKSHOPS — BROADCAST TRACKING ---------------------------------
ALTER TABLE public.academy_workshops
  ADD COLUMN IF NOT EXISTS broadcast_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS broadcast_1h_sent_at  timestamptz;

-- Cron picks up rows where scheduled_for is within the window and the
-- matching sent_at is still NULL. Partial indexes keep the scan cheap.
CREATE INDEX IF NOT EXISTS idx_academy_workshops_pending_24h
  ON public.academy_workshops (scheduled_for)
  WHERE is_published = true AND broadcast_24h_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_academy_workshops_pending_1h
  ON public.academy_workshops (scheduled_for)
  WHERE is_published = true AND broadcast_1h_sent_at IS NULL;

-- 3. WORKSHOP QUESTIONS ------------------------------------------------------
-- Members submit questions for upcoming workshops. Fulfills the FAQ
-- promise about a "direct line to submit questions for upcoming
-- sessions". Triages via email to the founder team.
CREATE TABLE IF NOT EXISTS public.workshop_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question        text NOT NULL,
  workshop_id     uuid REFERENCES public.academy_workshops(id) ON DELETE SET NULL,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  answered_at     timestamptz,
  answer_note     text
);

CREATE INDEX IF NOT EXISTS idx_workshop_questions_user
  ON public.workshop_questions (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_workshop_questions_pending
  ON public.workshop_questions (submitted_at DESC)
  WHERE answered_at IS NULL;

ALTER TABLE public.workshop_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit their own questions"
  ON public.workshop_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own questions"
  ON public.workshop_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Founders can view all questions"
  ON public.workshop_questions FOR SELECT
  USING (public.is_topuni_founder());

CREATE POLICY "Founders can update answers"
  ON public.workshop_questions FOR UPDATE
  USING (public.is_topuni_founder());

GRANT SELECT, INSERT ON public.workshop_questions TO authenticated;
GRANT ALL ON public.workshop_questions TO service_role;

-- 4. BROADCAST NOTICES -------------------------------------------------------
-- Admin-fired ad-hoc broadcasts to members (emergency notices, schedule
-- changes, launch announcements). Each row is one broadcast — the
-- broadcast_to_members edge function records it here, fans out via the
-- email queue, then updates fan_out_count when complete.
CREATE TABLE IF NOT EXISTS public.broadcast_notices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              text NOT NULL CHECK (kind IN ('emergency', 'workshop', 'announcement', 'product')),
  subject           text NOT NULL,
  body_markdown     text NOT NULL,
  segment           text NOT NULL DEFAULT 'all_members',
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz,
  fan_out_count     integer NOT NULL DEFAULT 0,
  error             text
);

CREATE INDEX IF NOT EXISTS idx_broadcast_notices_recent
  ON public.broadcast_notices (created_at DESC);

ALTER TABLE public.broadcast_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can read broadcasts"
  ON public.broadcast_notices FOR SELECT
  USING (public.is_topuni_founder());

CREATE POLICY "Founders can create broadcasts"
  ON public.broadcast_notices FOR INSERT
  WITH CHECK (public.is_topuni_founder());

GRANT SELECT, INSERT ON public.broadcast_notices TO authenticated;
GRANT ALL ON public.broadcast_notices TO service_role;

-- 5. PROFILES.DELETED_AT -----------------------------------------------------
-- Soft-delete column for GDPR / "delete my account" flow. The
-- delete-account edge function stamps deleted_at + scrambles PII;
-- existing RLS continues to apply (deleted users no longer have a
-- valid session, so they can't read their own row anyway).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 6. ACADEMY_RESOURCES — WELCOME GIFT FLAG -----------------------------------
-- One row in academy_resources can be flagged is_welcome_gift = true.
-- The post-signup welcome email links to it. We use a partial unique
-- index to enforce "at most one welcome gift at a time" without needing
-- a separate config table.
ALTER TABLE public.academy_resources
  ADD COLUMN IF NOT EXISTS is_welcome_gift boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academy_resources_one_welcome_gift
  ON public.academy_resources (is_welcome_gift)
  WHERE is_welcome_gift = true;
