-- 2026-05-20: brief_leads — anonymous wizard email capture.
--
-- Anonymous users complete the 3-step TopUni AI wizard, type their
-- email into the profile form, generate a free strategy brief, and
-- often leave before signing up. The email lived only in the wizard
-- form state — never written to the DB — so we had no way to follow
-- up. This was a pure top-of-funnel leak.
--
-- New behavior: every anon call to topuni-ai-pathway also writes a
-- row here with the email, name, and a profile snapshot. When the
-- same email later signs up, lifecycle-emails-cron stamps
-- converted_at so we can measure the lead-to-account rate and stop
-- nudging.

CREATE TABLE IF NOT EXISTS public.brief_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  email           text NOT NULL,
  full_name       text,
  nationality     text,
  grade_level     text,
  gpa             text,
  major           text,
  target_countries text[],
  language        text NOT NULL DEFAULT 'en',
  source_path     text,
  user_agent      text,
  -- Filled when the same email registers a real account. Until then
  -- the lead is "open" and eligible for nudge emails.
  converted_at    timestamptz,
  -- Stamped by the nudge cron after it sends the save-your-plan
  -- email so we never double-send.
  nudge_sent_at   timestamptz,
  CONSTRAINT brief_leads_language_chk CHECK (language IN ('en','ru'))
);

CREATE INDEX IF NOT EXISTS brief_leads_created_at_idx
  ON public.brief_leads (created_at DESC);

-- Lookup-by-email for the conversion stamp + dedupe queries.
CREATE INDEX IF NOT EXISTS brief_leads_email_lower_idx
  ON public.brief_leads ((lower(email)));

-- Partial index for the nudge cron's hot path: open leads that
-- haven't been nudged yet, older than the nudge threshold.
CREATE INDEX IF NOT EXISTS brief_leads_open_unnudged_idx
  ON public.brief_leads (created_at)
  WHERE converted_at IS NULL AND nudge_sent_at IS NULL;

ALTER TABLE public.brief_leads ENABLE ROW LEVEL SECURITY;

-- Inserts come from the topuni-ai-pathway edge function under the
-- service role. We do NOT expose anon-user inserts via PostgREST —
-- the edge function is the single gate, so it can sanitize the
-- email and apply rate limits.
CREATE POLICY "Service role can insert brief leads"
  ON public.brief_leads FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update brief leads"
  ON public.brief_leads FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view brief leads"
  ON public.brief_leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.brief_leads IS
  'Anonymous wizard completions on /topuni-ai. Inserted by topuni-ai-pathway after a brief streams successfully for an unauthenticated caller. Converted_at stamped by lifecycle-emails-cron when the same email signs up.';
