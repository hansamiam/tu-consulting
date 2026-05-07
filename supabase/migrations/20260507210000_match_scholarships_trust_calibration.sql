-- =============================================================================
-- match_scholarships — trust calibration via confidence + completeness
-- =============================================================================
-- The composite score from 20260503070000 combined similarity + deadline +
-- value + recency + country crowding. It did NOT factor in:
--
--   * `confidence`: LLM-reported extraction confidence in [0, 1]. A row
--     extracted from a thin page (confidence 0.55) is more likely to
--     contain a wrong amount, missing eligibility, or fabricated detail
--     than a row extracted from a comprehensive page (confidence 0.95).
--     Yet both ranked equally at equal embedding similarity.
--
--   * `data_completeness_score`: 0–18 count of populated substantive
--     fields (added in 20260507190000). A row with deadline + funding +
--     eligibility + narrative is more useful for the student than a
--     row with just name + provider + country + coverage_type.
--
-- Without trust calibration, all the catalog quality work (anti-fab,
-- min-info gate, completeness scoring, field canonicalization) compounds
-- only AT INGEST. The matching surface still gives sparse and rich rows
-- equal billing. This migration closes that loop: rich rows surface
-- ahead of equally-fitting sparse rows, and low-confidence rows pay a
-- proportional penalty.
--
-- Conservative tuning: similarity remains dominant. Combined trust
-- swing is bounded ±0.05 (vs the ±0.04 deadline boost) so it can
-- differentiate near-tied candidates but never override a genuinely
-- better embedding match.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.match_scholarships(
  query_embedding  vector(1536),
  p_nationality    text     DEFAULT NULL,
  p_min_gpa        numeric  DEFAULT NULL,
  p_min_ielts      numeric  DEFAULT NULL,
  p_degree_level   text     DEFAULT NULL,
  p_max_results    int      DEFAULT 30
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
        s, p_nationality, p_min_gpa, p_min_ielts, p_degree_level
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

      -- Confidence shaping: rows ≥0.85 unaffected. Below 0.85 lose
      -- proportional ground, capped at -0.04 at confidence=0. Mirrors
      -- the client-side scoreScholarship calibration in Discover.tsx.
      (
        CASE
          WHEN c.confidence IS NULL THEN 0.0
          WHEN c.confidence >= 0.85 THEN 0.0
          ELSE -1.0 * LEAST(0.040, (0.85 - GREATEST(0, c.confidence)) * 0.050)
        END
      )::real AS confidence_adj,

      -- Completeness shaping: 0 baseline at completeness ≤8 ("just-
      -- enough" rows). Above 8, linear up to +0.030 at full 18.
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

GRANT EXECUTE ON FUNCTION public.match_scholarships(vector(1536), text, numeric, numeric, text, int) TO anon, authenticated;

COMMENT ON FUNCTION public.match_scholarships(vector(1536), text, numeric, numeric, text, int) IS
  'Composite-ranked vector match. Order: passes_eligibility DESC, score DESC, similarity DESC, id ASC. score = similarity + deadline_boost + value_boost + recency_boost + confidence_adj + completeness_boost - country_crowding_penalty.';
