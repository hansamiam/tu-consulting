-- Pre-call intake + Calendly sync columns on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS intake_goals text,
  ADD COLUMN IF NOT EXISTS intake_target_countries text,
  ADD COLUMN IF NOT EXISTS intake_grade_year text,
  ADD COLUMN IF NOT EXISTS intake_budget_usd text,
  ADD COLUMN IF NOT EXISTS intake_biggest_blocker text,
  ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendly_event_uri text,
  ADD COLUMN IF NOT EXISTS calendly_invitee_uri text,
  ADD COLUMN IF NOT EXISTS calendly_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendly_meeting_url text,
  ADD COLUMN IF NOT EXISTS calendly_status text,
  ADD COLUMN IF NOT EXISTS calendly_canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS rebook_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_calendly_invitee ON public.bookings(calendly_invitee_uri);
CREATE INDEX IF NOT EXISTS idx_bookings_calendly_scheduled_at ON public.bookings(calendly_scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON public.bookings(contact_email);