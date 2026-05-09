-- =============================================================================
-- partner_inquiries — institution partnership form submissions
-- =============================================================================
-- The /topuni-ai/partners page (EN + RU) collects partnership leads from
-- universities and education providers. Until now the form set submitted=true
-- in local state and dropped the data on the floor. This migration adds the
-- backing table + RLS so partner-inquiry-notify can persist submissions and
-- admins can triage them in the funnel dashboard.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partner_inquiries (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  institution_name   text NOT NULL,
  region             text NOT NULL,
  contact_email      text NOT NULL,
  message            text,
  language           text NOT NULL DEFAULT 'en',
  source_path        text,
  user_agent         text,
  status             text NOT NULL DEFAULT 'pending_review',
  notes              text,
  CONSTRAINT partner_inquiries_language_chk CHECK (language IN ('en','ru')),
  CONSTRAINT partner_inquiries_status_chk CHECK (
    status IN ('pending_review','contacted','qualified','closed_won','closed_lost')
  )
);

CREATE INDEX IF NOT EXISTS partner_inquiries_created_at_idx
  ON public.partner_inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS partner_inquiries_status_idx
  ON public.partner_inquiries (status)
  WHERE status = 'pending_review';

ALTER TABLE public.partner_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit partner inquiries"
  ON public.partner_inquiries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view partner inquiries"
  ON public.partner_inquiries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partner inquiries"
  ON public.partner_inquiries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partner inquiries"
  ON public.partner_inquiries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.partner_inquiries IS
  'Partnership form submissions from /topuni-ai/partners. Inserted by the partner-inquiry-notify edge function; triaged by admins.';
