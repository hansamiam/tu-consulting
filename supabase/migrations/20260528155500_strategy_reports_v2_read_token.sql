-- 2026-05-28 sprint-A: persistent strategy URL.
-- Each report row gets a 32-char random read_token. Anonymous visitors
-- can re-open their dossier via `/topuni-ai/r/:id?t=<token>` after the
-- generation tab closes; auth'd owners read via RLS on user_id.
-- The new `get-strategy` edge function (deployed separately) validates
-- the token server-side and returns the payload.

ALTER TABLE public.strategy_reports_v2
  ADD COLUMN IF NOT EXISTS read_token text;

-- Backfill the (currently zero) existing rows with random tokens.
UPDATE public.strategy_reports_v2
   SET read_token = encode(gen_random_bytes(16), 'hex')
 WHERE read_token IS NULL;

-- Future rows: edge function pre-generates token in code so we can
-- include it in the JSON response. The DB-side default is a safety
-- net for direct inserts or future migrations that forget to set it.
ALTER TABLE public.strategy_reports_v2
  ALTER COLUMN read_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.strategy_reports_v2
  ALTER COLUMN read_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_strategy_reports_v2_read_token
  ON public.strategy_reports_v2 (read_token);

COMMENT ON COLUMN public.strategy_reports_v2.read_token IS
  'Random 32-char hex token. Used by the get-strategy edge function as a secondary auth signal for anonymous reads via /topuni-ai/r/:id?t=<token>. Owners read via RLS without needing this.';
