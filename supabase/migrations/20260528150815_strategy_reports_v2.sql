-- 2026-05-28 Strategy Reports v2
--
-- Backing store for the redesigned /topuni-ai strategy report. The
-- v1 path wrote to `ai_briefs`; v2 writes here. v1 rows stay readable
-- as legacy. The shape is intentionally narrow — full payload in jsonb
-- with extracted top-level columns only for the fields we query/index.
--
-- Cache key is (profile_hash, language). targetDegree is denormalized
-- as a column for analytics / breakdowns but is also inside payload.
--
-- See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md
CREATE TABLE IF NOT EXISTS public.strategy_reports_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  profile_hash text NOT NULL,
  target_degree text NOT NULL CHECK (target_degree IN ('bachelor','master','phd')),
  language text NOT NULL CHECK (language IN ('en','ru')),
  applicant_type_label text NOT NULL,
  readiness_score numeric(2,1) NOT NULL CHECK (readiness_score BETWEEN 0 AND 5),
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_strategy_reports_v2_profile_lang
  ON public.strategy_reports_v2 (profile_hash, language);

CREATE INDEX IF NOT EXISTS idx_strategy_reports_v2_user_id
  ON public.strategy_reports_v2 (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_strategy_reports_v2_email
  ON public.strategy_reports_v2 (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_strategy_reports_v2_generated_at
  ON public.strategy_reports_v2 (generated_at DESC);

ALTER TABLE public.strategy_reports_v2 ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own row.
CREATE POLICY "strategy_reports_v2_select_own"
  ON public.strategy_reports_v2
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypasses RLS — inserts come from the edge function.
-- No public INSERT/UPDATE/DELETE policy on purpose.

GRANT SELECT ON public.strategy_reports_v2 TO authenticated;

-- Edge-function-friendly schema note: anonymous strategy generations
-- write rows with user_id IS NULL and a captured email. They are NOT
-- readable via this policy (no anon SELECT) — that's intentional. Anon
-- viewers read the report from the response body of the generation
-- call, not from a SELECT.

COMMENT ON TABLE public.strategy_reports_v2 IS
  '/topuni-ai v2 strategy reports (2026-05-28 redesign). Cache + history of LLM-generated dossiers. See ~/.claude/plans/back-to-the-wizard-crispy-storm.md';

COMMENT ON COLUMN public.strategy_reports_v2.profile_hash IS
  'SHA-256 of the canonical sanitized intake. Unique with language for cache hits.';

COMMENT ON COLUMN public.strategy_reports_v2.payload IS
  'Full StrategyReportV2 JSON (see src/components/strategy/types.ts).';
