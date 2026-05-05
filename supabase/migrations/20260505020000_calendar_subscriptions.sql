-- =============================================================================
-- Calendar subscriptions — per-user secret tokens for the ICS feed
-- =============================================================================
-- Powers the /calendar.ics?token=… subscribable feed surfaced via the
-- `calendar-feed` edge function. When a student adds the feed to Apple
-- Calendar / Google Calendar / Outlook, every saved deadline becomes a
-- native-OS reminder — and new deadlines saved later auto-appear in
-- their calendar without any extra action. Compounding retention.
--
-- Privacy / auth model: token IS the auth. Anyone who knows it can
-- read that user's tracked deadlines. So tokens are 32-char random
-- strings (~160 bits of entropy) and per-user revocable.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.calendar_subscriptions (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_token       text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  /* last_accessed_at is bumped by the edge function each time the feed
     is fetched. Lets us see whether a user is actively syncing. */
  last_accessed_at timestamptz,
  /* fetch_count gives a quick proxy for engagement. */
  fetch_count      integer NOT NULL DEFAULT 0,
  /* If a user wants to revoke a leaked token, set revoked_at and the
     edge function will refuse to serve it. RPC below mints a fresh
     token in the same row. */
  revoked_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_calendar_subs_token
  ON public.calendar_subscriptions(feed_token)
  WHERE revoked_at IS NULL;

ALTER TABLE public.calendar_subscriptions ENABLE ROW LEVEL SECURITY;

-- Owner can read / manage their own subscription row. Edge function
-- bypasses RLS via service_role.
DROP POLICY IF EXISTS "self_read_calendar_sub" ON public.calendar_subscriptions;
CREATE POLICY "self_read_calendar_sub"
  ON public.calendar_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "self_write_calendar_sub" ON public.calendar_subscriptions;
CREATE POLICY "self_write_calendar_sub"
  ON public.calendar_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Token generator — 32-char base32 (Crockford-ish, no I/L/O/0/1 to avoid
-- transposition). Loops until unique. ~160 bits of entropy.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_calendar_feed_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  n int := length(chars);
  tok text;
  attempts int := 0;
BEGIN
  LOOP
    tok := '';
    FOR i IN 1..32 LOOP
      tok := tok || substr(chars, 1 + floor(random() * n)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.calendar_subscriptions WHERE feed_token = tok);
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique calendar feed token';
    END IF;
  END LOOP;
  RETURN tok;
END $$;

-- =============================================================================
-- Get-or-create the caller's calendar feed token. Used by the
-- CalendarSubscribeDialog on the frontend.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_my_calendar_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  existing text;
  fresh text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT feed_token INTO existing
    FROM public.calendar_subscriptions
    WHERE user_id = caller AND revoked_at IS NULL;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;
  fresh := public.generate_calendar_feed_token();
  INSERT INTO public.calendar_subscriptions (user_id, feed_token)
    VALUES (caller, fresh)
    ON CONFLICT (user_id) DO UPDATE
      SET feed_token = EXCLUDED.feed_token,
          revoked_at = NULL,
          created_at = now();
  RETURN fresh;
END $$;

GRANT EXECUTE ON FUNCTION public.get_or_create_my_calendar_token() TO authenticated;

-- =============================================================================
-- Rotate token — for users who suspect their token leaked. Marks the old
-- one revoked and mints a new one. RPC returns the fresh token.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rotate_my_calendar_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  fresh text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  fresh := public.generate_calendar_feed_token();
  INSERT INTO public.calendar_subscriptions (user_id, feed_token)
    VALUES (caller, fresh)
    ON CONFLICT (user_id) DO UPDATE
      SET feed_token = EXCLUDED.feed_token,
          revoked_at = NULL,
          created_at = now(),
          fetch_count = 0,
          last_accessed_at = NULL;
  RETURN fresh;
END $$;

GRANT EXECUTE ON FUNCTION public.rotate_my_calendar_token() TO authenticated;
