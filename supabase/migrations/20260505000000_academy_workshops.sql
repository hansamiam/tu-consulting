-- =============================================================================
-- Academy v0 — workshops table
-- =============================================================================
-- Backs the founder-only Academy hub (TopUni Academy at /academy when
-- logged in as a founder). Public-facing /academy stays as the waitlist
-- landing.
--
-- Scope deliberately tight: title, kind (workshop | office_hours | guide),
-- a recording or join URL, optional scheduled_for, optional summary. We
-- can layer attendance, slides, transcripts later — the table starts as
-- the hub the founder needs to dogfood Academy before public launch.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.academy_workshops (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('workshop', 'office_hours', 'guide')),
  summary         text,
  /* recording_url is the post-event recording (Loom, YouTube, Drive). */
  recording_url   text,
  /* join_url is the live Zoom / Meet / Calendly link for upcoming events. */
  join_url        text,
  scheduled_for   timestamptz,
  is_published    boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_workshops_scheduled
  ON public.academy_workshops (scheduled_for DESC NULLS LAST)
  WHERE is_published = true;

ALTER TABLE public.academy_workshops ENABLE ROW LEVEL SECURITY;

-- Founder allowlist policy. We check the JWT's `email` claim against a
-- small list. When Academy goes public this policy gets relaxed (or
-- replaced with a "subscribed" check via the subscriptions table).
CREATE OR REPLACE FUNCTION public.is_topuni_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN (
    'samuel.shn.han@gmail.com'
  );
$$;

-- Founders can do anything to academy_workshops.
DROP POLICY IF EXISTS "founders_full_access" ON public.academy_workshops;
CREATE POLICY "founders_full_access" ON public.academy_workshops
  FOR ALL
  USING (public.is_topuni_founder())
  WITH CHECK (public.is_topuni_founder());

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION public.touch_academy_workshops_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS academy_workshops_updated_at ON public.academy_workshops;
CREATE TRIGGER academy_workshops_updated_at
  BEFORE UPDATE ON public.academy_workshops
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_academy_workshops_updated_at();
