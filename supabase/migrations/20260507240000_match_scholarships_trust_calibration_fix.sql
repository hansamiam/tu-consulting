-- =============================================================================
-- match_scholarships — fix the regression in 20260507210000
-- =============================================================================
-- Migration 20260507210000 added trust calibration (confidence + completeness)
-- to match_scholarships, but it used the 6-arg signature from
-- 20260503070000 — NOT the 8-arg signature added by 20260505040000 that
-- includes p_min_toefl + p_min_sat. PostgreSQL treats different
-- signatures as different functions (function overloading), so after
-- 20260507210000 the DB has BOTH versions:
--
--   * 8-arg: TOEFL/SAT support, OLD scoring (no trust calibration)
--   * 6-arg: trust calibration, NO TOEFL/SAT support
--
-- Callers passing 8 args (match-scholarships edge function) hit the
-- old scoring. Callers passing 6 args hit the new scoring without
-- TOEFL/SAT eligibility. Both are wrong.
--
-- This migration:
--   1. DROPs the 6-arg ghost version from 20260507210000.
--   2. Replaces the 8-arg version with trust calibration applied.
-- =============================================================================

-- Drop the ghost 6-arg version created by 20260507210000.
DROP FUNCTION IF EXISTS public.match_scholarships(
  vector(1536), text, numeric, numeric, text, int
);

-- Recreate the 8-arg canonical signature with trust calibration.
CREATE OR REPLACE FUNCTION public.match_scholarships(
  query_embedding  vector(1536),
  p_nationality    text     DEFAULT NULL,
  p_min_gpa        numeric  DEFAULT NULL,
  p_min_ielts      numeric  DEFAULT NULL,
  p_degree_level   text     DEFAULT NULL,
  p_max_results    int      DEFAULT 30,
  p_min_toefl      numeric  DEFAULT NULL,
  p_min_sat        numeric  DEFAULT NULL
)
RETURNS TABLE (
  scholarship_id     uuid,
  similarity         real,
  passes_eligibility boolean
)
LANGUAGE sql
STABLE
AS $$
  WITH candidates AS (
    SELECT
      s.scholarship_id,
      s.host_country,
      (1 - (s.embedding <=> query_embedding))::real AS similarity,
      public.scholarship_passes_eligibility(
        s, p_nationality, p_min_gpa, p_min_ielts, p_degree_level,
        p_min_toefl, p_min_sat
      ) AS passes_eligibility,
      s.application_deadline,
      s.estimated_total_value_usd,
      s.last_verified_date,
      s.confidence,
      s.data_completeness_score
    FROM public.scholarships s
    WHERE s.embedding IS NOT NULL
    ORDER BY s.embedding <=> query_embedding
    LIMIT GREATEST(p_max_results * 4, 60)
  ),
  scored AS (
    SELECT
      c.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(c.host_country, '__null__')
        ORDER BY c.passes_eligibility DESC, c.similarity DESC
      ) AS country_rank,

      CASE
        WHEN c.application_deadline IS NULL THEN 0.0
        WHEN c.application_deadline < CURRENT_DATE THEN 0.0
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '7 days'  THEN 0.020
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 0.040
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '90 days' THEN 0.025
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '180 days' THEN 0.010
        ELSE 0.0
      END AS deadline_boost,

      LEAST(0.040,
        CASE
          WHEN COALESCE(c.estimated_total_value_usd, 0) <= 0 THEN 0.0
          ELSE ln(c.estimated_total_value_usd::numeric + 1) / 200.0
        END
      )::real AS value_boost,

      CASE
        WHEN c.last_verified_date IS NULL THEN 0.0
        WHEN c.last_verified_date > CURRENT_DATE - INTERVAL '30 days' THEN 0.020
        WHEN c.last_verified_date > CURRENT_DATE - INTERVAL '90 days' THEN 0.010
        WHEN c.last_verified_date > CURRENT_DATE - INTERVAL '365 days' THEN 0.0
        ELSE -0.020
      END AS recency_boost,

      (
        CASE
          WHEN c.confidence IS NULL THEN 0.0
          WHEN c.confidence >= 0.85 THEN 0.0
          ELSE -1.0 * LEAST(0.040, (0.85 - GREATEST(0, c.confidence)) * 0.050)
        END
      )::real AS confidence_adj,

      (
        CASE
          WHEN c.data_completeness_score IS NULL THEN 0.0
          WHEN c.data_completeness_score <= 8 THEN 0.0
          ELSE LEAST(0.030, (c.data_completeness_score - 8) * 0.003)
        END
      )::real AS completeness_boost
    FROM candidates c
  ),
  composite AS (
    SELECT
      scholarship_id,
      similarity,
      passes_eligibility,
      country_rank,
      similarity
        + deadline_boost
        + value_boost
        + recency_boost
        + confidence_adj
        + completeness_boost
        - GREATEST(0, country_rank - 3) * 0.030
        AS score
    FROM scored
  )
  SELECT
    scholarship_id,
    similarity,
    passes_eligibility
  FROM composite
  ORDER BY
    passes_eligibility DESC,
    score              DESC,
    similarity         DESC,
    scholarship_id     ASC
  LIMIT p_max_results;
$$;

GRANT EXECUTE ON FUNCTION public.match_scholarships(
  vector(1536), text, numeric, numeric, text, int, numeric, numeric
) TO anon, authenticated;

COMMENT ON FUNCTION public.match_scholarships(
  vector(1536), text, numeric, numeric, text, int, numeric, numeric
) IS
  'Composite-ranked vector match. Eligibility checks nationality+GPA+IELTS+TOEFL+SAT+degree. Score = similarity + deadline_boost + value_boost + recency_boost + confidence_adj + completeness_boost - country_crowding_penalty.';
