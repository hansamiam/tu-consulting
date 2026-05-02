-- ─── Counselor session history ───────────────────────────────────────
-- Today the counselor's chat lives in localStorage only. This breaks on
-- a fresh device or browser clear, and "resume the conversation" — the
-- thing that makes chat products feel real — isn't possible. This
-- commit moves chat history to Postgres for authed users while leaving
-- anon users on localStorage.
--
-- Schema:
--   counselor_sessions  one row per "conversation thread"
--   counselor_messages  one row per turn (user or assistant)

CREATE TABLE IF NOT EXISTS public.counselor_sessions (
  session_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text,                                        -- auto-generated from first user msg
  language        text NOT NULL DEFAULT 'en',
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count   integer NOT NULL DEFAULT 0,
  archived        boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_counselor_sessions_user
  ON public.counselor_sessions(user_id, last_message_at DESC)
  WHERE archived = false;

CREATE TABLE IF NOT EXISTS public.counselor_messages (
  message_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.counselor_sessions(session_id) ON DELETE CASCADE,
  -- user_id denormalised so RLS doesn't have to traverse the FK
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('user', 'assistant')),
  content      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_counselor_messages_session
  ON public.counselor_messages(session_id, created_at);

ALTER TABLE public.counselor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self read sessions"
  ON public.counselor_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Self write sessions"
  ON public.counselor_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Self read messages"
  ON public.counselor_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Self write messages"
  ON public.counselor_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at on sessions when a message lands. Trigger keeps the
-- denormalised counters fresh without the client having to write
-- them on every turn.
CREATE OR REPLACE FUNCTION public.touch_session_on_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.counselor_sessions
     SET last_message_at = NEW.created_at,
         message_count   = message_count + 1
   WHERE session_id = NEW.session_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_session_on_message ON public.counselor_messages;
CREATE TRIGGER trg_touch_session_on_message
  AFTER INSERT ON public.counselor_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_session_on_message();
