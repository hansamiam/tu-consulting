-- Discover v1 — Phase A.6
-- academy_waitlist: lightweight signup form rendered at end of AI brief
-- and via save-action auth prompt (spec F12).
--
-- Deferred-Academy strategy: we don't ship the actual Academy yet, but we
-- start collecting demand signal now. Every entry triggers a Resend
-- confirmation email that explicitly says "we'll email when we open" —
-- no date commitment, no broken promises.

CREATE TABLE IF NOT EXISTS public.academy_waitlist (
  waitlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email TEXT NOT NULL,
  full_name TEXT,

  -- Where the user signed up from. Lets us measure which Discover hook
  -- actually drives Academy interest.
  source TEXT NOT NULL
    CHECK (source IN ('brief_end', 'discover_save', 'discover_detail_cta', 'manual', 'other')),

  -- Optional profile snapshot at signup time (helps Academy curate cohorts).
  profile_snapshot JSONB,
  match_run_id UUID,
  referring_scholarship_id UUID REFERENCES public.scholarships(scholarship_id) ON DELETE SET NULL,

  -- Lifecycle
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmation_sent_at TIMESTAMPTZ,
  joined_academy_at TIMESTAMPTZ,  -- set when (if) Academy launches and they enroll
  unsubscribed_at TIMESTAMPTZ,

  -- Audit
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash TEXT,                    -- hashed, not raw — abuse-control only
  user_agent_hash TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_academy_waitlist_email_unique
  ON public.academy_waitlist (lower(email))
  WHERE unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_academy_waitlist_source_signed_up
  ON public.academy_waitlist (source, signed_up_at DESC);

ALTER TABLE public.academy_waitlist ENABLE ROW LEVEL SECURITY;

-- Admins read for outreach + analytics.
CREATE POLICY "Admins read academy_waitlist"
  ON public.academy_waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone (authenticated or anonymous) can sign up via the edge function;
-- the edge function is the only writer (service role).
CREATE POLICY "Service role inserts academy_waitlist"
  ON public.academy_waitlist FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role updates academy_waitlist"
  ON public.academy_waitlist FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.academy_waitlist IS
  'Demand-signal collector for Top Uni Academy (deferred build). Per Discover v1 plan F12 — 2026-05-22. Email confirmation goes via existing Resend integration with no date commitment.';
