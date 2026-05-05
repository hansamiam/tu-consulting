-- =============================================================================
-- brief_cache — drift-aware cache for topuni-ai-pathway
-- =============================================================================
-- The brief is the highest-cost AI surface in the product (premium grade
-- uses a reasoning model, ~$0.30-0.50/generation across 6-7 streamed
-- sections). Repeat visits today re-run the LLM every time even when the
-- profile hasn't changed and none of the underlying scholarships have
-- drifted.
--
-- Mirror the scholarship_deep_dives cache architecture: cache by
-- profile_hash + grade + language; invalidate when any cited scholarship's
-- updated_at moves past the cached generated_at. Stream-replay the cached
-- content as SSE on hit so the client renders instantly.
--
-- Anon callers get a row with user_id NULL (cache shared across visitors
-- with effectively-identical profiles). Authed callers get a row with
-- their user_id (still keyed on profile_hash so two devices share).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.brief_cache (
  profile_hash       text        NOT NULL,
  language           text        NOT NULL DEFAULT 'en',
  grade              text        NOT NULL DEFAULT 'basic',  -- 'basic' | 'premium'
  content            text        NOT NULL,
  scholarship_ids    uuid[]      NOT NULL DEFAULT '{}',
  retrieval_method   text,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at       timestamptz NOT NULL DEFAULT now(),
  cost_estimate_usd  numeric(8,4),
  PRIMARY KEY (profile_hash, language, grade)
);

CREATE INDEX IF NOT EXISTS idx_brief_cache_user
  ON public.brief_cache(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brief_cache_generated
  ON public.brief_cache(generated_at);

ALTER TABLE public.brief_cache ENABLE ROW LEVEL SECURITY;

-- Service role manages everything. The edge function uses service role
-- so the table is opaque to direct client reads.
CREATE POLICY "Service role manages brief cache"
  ON public.brief_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN public.brief_cache.scholarship_ids IS
  'IDs of every scholarship cited by the cached brief. Cache hit requires generated_at >= MAX(updated_at) across these IDs — when any cited scholarship drifts, the cache misses and the brief regenerates.';
