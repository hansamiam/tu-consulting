-- Saved searches + new-match alerts
--
-- A member tunes Discover filters until the result set is "the kind
-- of scholarship I'm looking for", then saves that filter combo as a
-- named search. The daily saved-searches-cron then re-runs each saved
-- search against newly-added rows and emails them a digest of matches
-- they haven't seen before.
--
-- The compounding play: every saved search is a re-engagement trigger
-- forever — even months after a user last visited, they get pinged
-- when a new scholarship matches their criteria. Drives D30 / D60
-- retention without nag emails.

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- User-given label. Distinct per user so the email subject reads
  -- "your 'PhD in Germany' search has 3 new matches" instead of "your
  -- search #4d62…".
  name text NOT NULL,
  -- The FilterState blob from Discover. Validated client-side; the
  -- cron tolerates unknown keys to keep the schema flexible while we
  -- evolve filters. Indexed only by user_id; per-search lookups are
  -- always for "all of this user's searches" anyway.
  filters jsonb NOT NULL,
  alert_enabled boolean NOT NULL DEFAULT true,
  -- When we last sent a digest for this search. NULL = never; the
  -- cron uses (last_alert_at OR created_at) as the "matches added
  -- since" floor to seed the very first run.
  last_alert_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alerts ON public.saved_searches(alert_enabled) WHERE alert_enabled = true;

-- Mirror the touch_updated_at pattern used elsewhere so updated_at
-- stays honest without client-side fiddling.
CREATE OR REPLACE FUNCTION public.touch_saved_searches_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_saved_searches ON public.saved_searches;
CREATE TRIGGER trg_touch_saved_searches
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.touch_saved_searches_updated_at();

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Standard self-only RLS — each authed user reads/writes their own.
DO $$ BEGIN
  CREATE POLICY "saved_searches self read"
    ON public.saved_searches FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "saved_searches self insert"
    ON public.saved_searches FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "saved_searches self update"
    ON public.saved_searches FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "saved_searches self delete"
    ON public.saved_searches FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
