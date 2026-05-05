-- =============================================================================
-- Match eligibility: extend with TOEFL + SAT thresholds
-- =============================================================================
-- The original scholarship_passes_eligibility predicate only checked nationality
-- + GPA + IELTS + degree level. Two real gaps that matter for trust:
--
--   1. TOEFL — many programs (especially US-hosted) require TOEFL specifically,
--      not "any English test." A user with IELTS 7.5 and no TOEFL was being
--      told a TOEFL-100-required scholarship was "eligible." It isn't.
--
--   2. SAT — undergraduate-track elite scholarships use SAT as a hard cutoff.
--      Without a SAT check, our scorer told a 1300-SAT applicant they passed
--      eligibility for a 1500-SAT minimum. They apply, get rejected, lose
--      trust in the platform.
--
-- Both columns are already on public.scholarships (min_toefl, min_sat) and the
-- client-side scorer in Discover.tsx now checks them. This migration aligns
-- the server-side check + ranking RPC so the SQL surface matches the client.
--
-- Same RPC name + extended signature. Old callers that don't pass the new
-- params still work because both new params default NULL.
-- =============================================================================

-- ─── Extended eligibility predicate ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.scholarship_passes_eligibility(
  s              public.scholarships,
  p_nationality  text,
  p_min_gpa      numeric,
  p_min_ielts    numeric,
  p_degree_level text,
  p_min_toefl    numeric DEFAULT NULL,
  p_min_sat      numeric DEFAULT NULL
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
    -- GPA threshold (soft): NULL profile GPA passes (we don't know yet).
    (
      s.min_gpa IS NULL
      OR p_min_gpa IS NULL
      OR p_min_gpa >= s.min_gpa
    )
    AND
    -- IELTS threshold
    (
      s.min_ielts IS NULL
      OR p_min_ielts IS NULL
      OR p_min_ielts >= s.min_ielts
    )
    AND
    -- TOEFL threshold (NEW)
    (
      s.min_toefl IS NULL
      OR p_min_toefl IS NULL
      OR p_min_toefl >= s.min_toefl
    )
    AND
    -- SAT threshold (NEW)
    (
      s.min_sat IS NULL
      OR p_min_sat IS NULL
      OR p_min_sat >= s.min_sat
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

COMMENT ON FUNCTION public.scholarship_passes_eligibility(
  public.scholarships, text, numeric, numeric, text, numeric, numeric
) IS
  'True when the profile passes the scholarship''s nationality, GPA, IELTS, TOEFL, SAT, and degree-level constraints. NULL profile values are treated as "unknown — pass" so absent test scores don''t inappropriately filter rows.';

-- ─── Extended composite ranker ────────────────────────────────────────────────
-- Rebuild match_scholarships to accept and forward the two new params.
-- Algorithm unchanged (semantic similarity + bounded boosts + country
-- diversity penalty); only the eligibility predicate gets the new inputs.
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
      s.last_verified_date
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
      END AS recency_boost
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
  'Composite-ranked vector match. Eligibility now also checks TOEFL + SAT. Order: passes_eligibility DESC, score DESC, similarity DESC, id ASC.';
