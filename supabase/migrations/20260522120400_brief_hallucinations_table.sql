-- Discover v1 — Phase A.5
-- brief_hallucinations: monitoring log for the anti-hallucination guard
-- (spec F11, closes the 2026-05-03 DATA_PIPELINE_AUDIT.md gap).
--
-- After topuni-ai-pathway or topuni-chat generates output, the guard scans
-- bold scholarship names against the retrieved-set. Any mention NOT in the
-- retrieved set is stripped/redacted AND logged here so we can tune the
-- matcher's fuzzy threshold against real-world misses.
--
-- First-week behavior: log every strip, do not yet enforce redaction in
-- production. Use the log to find legitimate scholarship name variants
-- that the fuzzy match misses (e.g., "Gates Cambridge" vs
-- "Gates Cambridge Scholarship"). After tuning, flip enforcement.

CREATE TABLE IF NOT EXISTS public.brief_hallucinations (
  hallucination_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which surface produced it
  source_function TEXT NOT NULL
    CHECK (source_function IN ('topuni-ai-pathway', 'topuni-chat', 'scholarship-deep-dive')),

  -- The flagged string the LLM output (the bold scholarship name we couldn't match)
  flagged_text TEXT NOT NULL,

  -- The retrieved scholarship_ids the LLM was given for this turn
  retrieved_scholarship_ids UUID[] NOT NULL DEFAULT '{}',

  -- Whether the guard actually redacted the text (vs just logged it for tuning)
  was_redacted BOOLEAN NOT NULL DEFAULT false,

  -- The fuzzy-match score that caused the miss (lower = farther from any retrieved name)
  best_fuzzy_match_score NUMERIC(3,2),
  best_fuzzy_match_against_name TEXT,

  -- Context for debugging
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  match_run_id UUID,
  profile_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brief_hallucinations_created
  ON public.brief_hallucinations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brief_hallucinations_function_redacted
  ON public.brief_hallucinations (source_function, was_redacted, created_at DESC);

ALTER TABLE public.brief_hallucinations ENABLE ROW LEVEL SECURITY;

-- Admins only — this is internal monitoring data.
CREATE POLICY "Admins read brief_hallucinations"
  ON public.brief_hallucinations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role (edge functions) writes.
CREATE POLICY "Service role inserts brief_hallucinations"
  ON public.brief_hallucinations FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE public.brief_hallucinations IS
  'Monitoring log for the anti-hallucination guard. Per Discover v1 plan F11, closes DATA_PIPELINE_AUDIT.md 2026-05-03 gap. First week is observe-only; enforcement flips on once fuzzy-match threshold is tuned against real misses.';
