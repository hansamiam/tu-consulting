-- =============================================================================
-- Per-scholarship personalized deep-dive cache
-- =============================================================================
-- The static why_this_fits / how_to_win text on each scholarship row is the
-- SAME for every visitor — it's about the scholarship, not about the
-- specific student looking at it.
--
-- This table stores a fully personalized analysis per (scholarship × profile)
-- combo: match-score breakdown vs the student's actual stats, strategy
-- specific to their background, realistic odds bucket, and a 30-day plan.
-- Generated on-demand by the scholarship-deep-dive edge function and cached
-- here so re-visits are free (the analysis is profile-deterministic — same
-- profile + same scholarship = same analysis).
--
-- profile_hash is computed by the edge function over a normalized profile
-- payload so two visitors with effectively-identical profiles share the
-- cache, and a single user who tweaks their profile gets a fresh dive.
--
-- user_id is nullable so anon-with-localStorage-profile visitors are also
-- cached (matched by profile_hash alone). RLS gates writes to service role
-- only; reads are gated on the function side via the edge function — the
-- table itself is service-role-read so the schema doesn't expose someone
-- else's analysis even if they guessed a profile_hash.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.scholarship_deep_dives (
  scholarship_id  uuid        NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  profile_hash    text        NOT NULL,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  content         jsonb       NOT NULL,
  -- Structured-output schema version. Bump when the JSON shape evolves so
  -- old caches don't render against a newer component contract.
  schema_version  smallint    NOT NULL DEFAULT 1,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  model_tag       text,        -- e.g. "openai/gpt-4o-mini" for offline analysis
  cost_estimate_usd numeric(8,4),
  PRIMARY KEY (scholarship_id, profile_hash)
);

CREATE INDEX IF NOT EXISTS idx_deep_dives_user
  ON public.scholarship_deep_dives(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deep_dives_generated
  ON public.scholarship_deep_dives(generated_at);

ALTER TABLE public.scholarship_deep_dives ENABLE ROW LEVEL SECURITY;

-- Default DENY: only the service role (edge function) reads/writes this.
-- Public reads happen through the edge function, which gates on the
-- profile_hash being one the caller is presenting (i.e. they own it
-- because they're computing it from their own profile).
CREATE POLICY "Service role manages deep dives"
  ON public.scholarship_deep_dives
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No public SELECT policy — the table is opaque to clients. Acceptable
-- because reads always go through scholarship-deep-dive edge function
-- which uses service role.
