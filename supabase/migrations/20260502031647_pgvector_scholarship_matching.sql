-- ─── pgvector + semantic scholarship matching ────────────────────────
-- Architectural change: stop scoring scholarships in the React client.
-- Start matching them in the database with vector embeddings + a
-- structured eligibility filter. This unlocks:
--   1. Discover scaling to 1000s of rows (no client-side compute)
--   2. RAG retrieval for the AI report (top-K instead of stuffing all)
--   3. Semantic field matching ("CS" ≈ "informatics" ≈ "data science")
--
-- The embedding model is OpenAI's text-embedding-3-small (1536 dim),
-- accessed via the Lovable AI gateway. Cosine distance is the metric
-- (operator <=>). IVFFlat index for fast approximate nearest-neighbor.

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Embedding columns ───────────────────────────────────────────────
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS embedding              vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_source_text  text,
  ADD COLUMN IF NOT EXISTS embedded_at            timestamptz;

-- IVFFlat index — fast approximate nearest neighbor. lists=50 is a sane
-- default for a few hundred to a few thousand rows; rebuild with more
-- lists when the catalog passes ~5000.
CREATE INDEX IF NOT EXISTS idx_scholarships_embedding_cosine
  ON public.scholarships
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ─── Helper: build the canonical source-text for a scholarship row ───
-- Centralised here so the edge function and any future re-embed path
-- generate identical strings. Order matters for embedding stability.
CREATE OR REPLACE FUNCTION public.scholarship_embedding_source(s public.scholarships)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both ' ' FROM
    coalesce(s.scholarship_name, '') || '. ' ||
    coalesce('Provider: '       || s.provider_name        || '. ', '') ||
    coalesce('Host country: '   || s.host_country         || '. ', '') ||
    coalesce('Coverage: '       || s.coverage_type        || '. ', '') ||
    coalesce('Award: '          || s.award_amount_text    || '. ', '') ||
    coalesce('Fields: '         || array_to_string(s.target_fields, ', ')        || '. ', '') ||
    coalesce('Levels: '         || array_to_string(s.target_degree_level, ', ')  || '. ', '') ||
    coalesce('Citizenship: '    || s.citizenship_requirements || '. ', '') ||
    coalesce('Eligibility: '    || left(s.eligibility_requirements, 800) || '. ', '') ||
    coalesce('Strategy: '       || left(s.strategy_notes, 400) || '. ', '')
  );
$$;

-- ─── Eligibility helper: is a profile plausibly eligible? ──────────
-- Cheap pre-filter run BEFORE the vector search so we don't waste a
-- top-K slot on a scholarship the student can't apply to. Conservative
-- — when in doubt, return true and let the UI surface details.
CREATE OR REPLACE FUNCTION public.scholarship_passes_eligibility(
  s              public.scholarships,
  p_nationality  text,
  p_min_gpa      numeric,
  p_min_ielts    numeric,
  p_degree_level text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- Nationality: pass if the scholarship doesn't restrict, OR if the
    -- profile's nationality is in the eligible_countries array.
    (
      s.eligible_countries IS NULL
      OR cardinality(s.eligible_countries) = 0
      OR p_nationality IS NULL
      OR p_nationality = ''
      OR p_nationality = ANY(s.eligible_countries)
    )
    AND
    -- GPA threshold (soft): if scholarship has a min, profile must meet
    -- when stated. NULL profile GPA passes (we don't know yet).
    (
      s.min_gpa IS NULL
      OR p_min_gpa IS NULL
      OR p_min_gpa >= s.min_gpa
    )
    AND
    -- IELTS threshold same logic
    (
      s.min_ielts IS NULL
      OR p_min_ielts IS NULL
      OR p_min_ielts >= s.min_ielts
    )
    AND
    -- Degree level: if scholarship targets specific levels, profile must overlap
    (
      s.target_degree_level IS NULL
      OR cardinality(s.target_degree_level) = 0
      OR p_degree_level IS NULL
      OR p_degree_level = ''
      OR p_degree_level = ANY(s.target_degree_level)
    );
$$;

-- ─── The headline RPC: match scholarships against a profile ──────────
-- Combines vector similarity with eligibility filters and surfaces a
-- score breakdown the UI can render. Returns `similarity` in [0, 1]
-- where 1 is identical embedding.
CREATE OR REPLACE FUNCTION public.match_scholarships(
  query_embedding  vector(1536),
  p_nationality    text     DEFAULT NULL,
  p_min_gpa        numeric  DEFAULT NULL,
  p_min_ielts      numeric  DEFAULT NULL,
  p_degree_level   text     DEFAULT NULL,
  p_max_results    int      DEFAULT 30
)
RETURNS TABLE (
  scholarship_id uuid,
  similarity     real,
  passes_eligibility boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH ranked AS (
    SELECT
      s.scholarship_id,
      -- Cosine similarity = 1 - cosine distance (so higher = better)
      (1 - (s.embedding <=> query_embedding))::real AS similarity,
      public.scholarship_passes_eligibility(s, p_nationality, p_min_gpa, p_min_ielts, p_degree_level) AS passes_eligibility
    FROM public.scholarships s
    WHERE s.embedding IS NOT NULL
    ORDER BY s.embedding <=> query_embedding
    LIMIT p_max_results * 2  -- over-fetch so eligibility filtering doesn't cut us short
  )
  SELECT scholarship_id, similarity, passes_eligibility
  FROM ranked
  ORDER BY
    -- Eligible rows always rank above ineligible at same similarity tier
    passes_eligibility DESC,
    similarity DESC
  LIMIT p_max_results;
$$;

GRANT EXECUTE ON FUNCTION public.match_scholarships(vector(1536), text, numeric, numeric, text, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scholarship_embedding_source(public.scholarships) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scholarship_passes_eligibility(public.scholarships, text, numeric, numeric, text) TO anon, authenticated;

-- ─── Maintenance: which rows need (re-)embedding? ────────────────────
-- A view the edge function consumes to know what to embed. A row needs
-- embedding when `embedded_at IS NULL` OR when key fields have
-- changed since the last embed (heuristic: last_verified_date moved).
CREATE OR REPLACE VIEW public.scholarships_needing_embedding AS
  SELECT
    s.scholarship_id,
    public.scholarship_embedding_source(s) AS source_text
  FROM public.scholarships s
  WHERE
    s.embedding IS NULL
    OR (
      s.embedded_at IS NOT NULL
      AND s.last_verified_date IS NOT NULL
      AND s.last_verified_date > s.embedded_at::date
    );

GRANT SELECT ON public.scholarships_needing_embedding TO authenticated;
