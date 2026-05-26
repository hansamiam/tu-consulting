-- 2026-05-26 Cofounder review (Sam):
-- 1) Many published scholarships had `target_fields=['Computer Science']`
--    as a leaked default — they're general scholarships (Commonwealth,
--    Paul & Daisy Soros, MasterCard, Humboldt, etc.) that have nothing
--    to do with CS. Set to NULL = field-agnostic (correct default).
--    Kept MBZUAI since it IS a CS-focused university.
-- 2) `scholarship_passes_eligibility` failed to normalize the slug
--    variants in the corpus (master vs masters, phd vs doctorate vs
--    research, bachelor vs undergraduate) so a Master's applicant
--    against Schwarzman (`["masters"]`) was returning false-positive
--    pass when the canonical slug is "master".
-- 3) `match_scholarships` only used passes_eligibility for ordering
--    (DESC NULLS LAST) — ineligible rows still surfaced in the top-25
--    fed to the brief LLM. PhD candidate from a non-Commonwealth
--    country was getting Schwarzman + Commonwealth scholarships in
--    their strategy. Now hard-filtered at the candidate CTE level.

-- Subject tags wiped wholesale per Sam 2026-05-26: "take off all
-- subject tags period for now, we don't have ability to classify
-- them yet". Catalog-wide reset. Re-enrichment will repopulate from
-- the LLM normalization pipeline once it's trustworthy.
UPDATE public.scholarships
SET target_fields = NULL
WHERE target_fields IS NOT NULL;

CREATE OR REPLACE FUNCTION public.scholarship_passes_eligibility(
  s scholarships,
  p_nationality text,
  p_min_gpa numeric,
  p_min_ielts numeric,
  p_degree_level text,
  p_min_toefl numeric DEFAULT NULL::numeric,
  p_min_sat numeric DEFAULT NULL::numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT
    (
      s.eligible_countries IS NULL
      OR cardinality(s.eligible_countries) = 0
      OR p_nationality IS NULL
      OR p_nationality = ''
      OR EXISTS (
        SELECT 1
        FROM unnest(s.eligible_countries) AS ec
        WHERE lower(ec) IN ('any','any country','global','international','open','worldwide','all countries')
           OR lower(ec) = lower(p_nationality)
      )
    )
    AND ( s.min_gpa IS NULL OR p_min_gpa IS NULL OR p_min_gpa >= s.min_gpa )
    AND ( s.min_ielts IS NULL OR p_min_ielts IS NULL OR p_min_ielts >= s.min_ielts )
    AND ( s.min_toefl IS NULL OR p_min_toefl IS NULL OR p_min_toefl >= s.min_toefl )
    AND ( s.min_sat IS NULL OR p_min_sat IS NULL OR p_min_sat >= s.min_sat )
    AND
    (
      s.target_degree_level IS NULL
      OR cardinality(s.target_degree_level) = 0
      OR p_degree_level IS NULL
      OR p_degree_level = ''
      OR EXISTS (
        SELECT 1
        FROM unnest(s.target_degree_level) AS d
        WHERE
          CASE
            WHEN lower(d) IN ('bachelor','bachelors','undergraduate','undergrad') THEN 'bachelor'
            WHEN lower(d) IN ('master','masters','ma','msc','mph','mba')          THEN 'master'
            WHEN lower(d) IN ('phd','doctorate','doctoral','research','postdoc')  THEN 'phd'
            ELSE lower(d)
          END
          =
          CASE
            WHEN lower(p_degree_level) IN ('bachelor','bachelors','undergraduate','undergrad') THEN 'bachelor'
            WHEN lower(p_degree_level) IN ('master','masters','ma','msc','mph','mba')          THEN 'master'
            WHEN lower(p_degree_level) IN ('phd','doctorate','doctoral','research','postdoc')  THEN 'phd'
            ELSE lower(p_degree_level)
          END
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.match_scholarships(
  query_embedding vector,
  p_nationality text DEFAULT NULL::text,
  p_min_gpa numeric DEFAULT NULL::numeric,
  p_min_ielts numeric DEFAULT NULL::numeric,
  p_degree_level text DEFAULT NULL::text,
  p_max_results integer DEFAULT 30,
  p_min_toefl numeric DEFAULT NULL::numeric,
  p_min_sat numeric DEFAULT NULL::numeric
)
RETURNS TABLE(scholarship_id uuid, similarity real, passes_eligibility boolean)
LANGUAGE sql
STABLE
AS $function$
  WITH candidates AS (
    SELECT
      s.scholarship_id,
      s.host_country,
      s.provider_id,
      (1 - (s.embedding <=> query_embedding))::real AS similarity,
      public.scholarship_passes_eligibility(
        s, p_nationality, p_min_gpa, p_min_ielts, p_degree_level,
        p_min_toefl, p_min_sat
      ) AS passes_eligibility,
      s.application_deadline,
      s.estimated_total_value_usd,
      s.last_verified_date,
      s.confidence,
      s.data_completeness_score,
      s.consensus_score
    FROM public.scholarships s
    WHERE s.embedding IS NOT NULL
      AND (s.verification_status IS NULL OR s.verification_status IN ('verified','stale','pending'))
      AND (s.lifecycle_status IS NULL OR s.lifecycle_status IN ('active','reopens_annually'))
      AND public.scholarship_passes_eligibility(
        s, p_nationality, p_min_gpa, p_min_ielts, p_degree_level,
        p_min_toefl, p_min_sat
      ) = true
  ),
  scored AS (
    SELECT
      c.scholarship_id,
      c.host_country,
      c.passes_eligibility,
      c.similarity,
      (CASE
        WHEN c.application_deadline IS NULL THEN 0.0
        WHEN c.application_deadline < current_date THEN -0.020
        WHEN c.application_deadline <= current_date + interval '14 days' THEN 0.040
        WHEN c.application_deadline <= current_date + interval '30 days' THEN 0.025
        WHEN c.application_deadline <= current_date + interval '60 days' THEN 0.012
        ELSE 0.0
      END)::real AS deadline_boost,
      (CASE
        WHEN c.estimated_total_value_usd IS NULL OR c.estimated_total_value_usd <= 0 THEN 0.0
        ELSE LEAST(0.030, (ln(GREATEST(1, c.estimated_total_value_usd))::numeric / ln(100000.0::numeric))::numeric * 0.030)
      END)::real AS value_boost,
      (CASE
        WHEN c.last_verified_date IS NULL THEN 0.0
        WHEN c.last_verified_date >= current_date - interval '90 days' THEN 0.020
        WHEN c.last_verified_date >= current_date - interval '180 days' THEN 0.010
        ELSE 0.0
      END)::real AS recency_boost,
      (CASE
        WHEN c.confidence IS NULL THEN 0.0
        WHEN c.confidence >= 0.85 THEN 0.0
        ELSE -1.0 * LEAST(0.040, (0.85 - GREATEST(0, c.confidence)) * 0.050)
      END)::real AS confidence_adj,
      (CASE
        WHEN c.data_completeness_score IS NULL THEN 0.0
        WHEN c.data_completeness_score <= 8 THEN 0.0
        ELSE LEAST(0.030, ((c.data_completeness_score - 8)::numeric / 10.0) * 0.030)
      END)::real AS completeness_boost,
      (
        SELECT COALESCE(LEAST(0.020, (ln(stats.save_count_30d + 1)::numeric / 80.0))::real, 0.0)
        FROM public.scholarship_stats stats
        WHERE stats.scholarship_id = c.scholarship_id
          AND stats.save_count_30d > 0
      ) AS engagement_boost,
      (
        SELECT
          CASE p.trust_tier
            WHEN 'high'    THEN 0.020
            WHEN 'medium'  THEN 0.010
            WHEN 'low'     THEN -0.005
            ELSE 0.0
          END::real
        FROM public.providers p
        WHERE p.provider_id = c.provider_id
      ) AS provider_trust_boost,
      (CASE
        WHEN c.consensus_score IS NULL THEN 0.0
        WHEN c.consensus_score >= 8 THEN 0.015
        WHEN c.consensus_score >= 6 THEN 0.010
        WHEN c.consensus_score >= 4 THEN 0.005
        ELSE 0.0
      END)::real AS consensus_boost
    FROM candidates c
  ),
  ranked AS (
    SELECT
      s.scholarship_id,
      s.host_country,
      s.passes_eligibility,
      s.similarity
        + s.deadline_boost
        + s.value_boost
        + s.recency_boost
        + s.confidence_adj
        + s.completeness_boost
        + COALESCE(s.engagement_boost, 0)
        + COALESCE(s.provider_trust_boost, 0)
        + s.consensus_boost
        AS composite,
      ROW_NUMBER() OVER (
        PARTITION BY s.host_country
        ORDER BY (
          s.similarity + s.deadline_boost + s.value_boost + s.recency_boost
          + s.confidence_adj + s.completeness_boost
          + COALESCE(s.engagement_boost, 0)
          + COALESCE(s.provider_trust_boost, 0)
          + s.consensus_boost
        ) DESC
      ) AS country_rank
    FROM scored s
  )
  SELECT
    r.scholarship_id,
    (r.composite - (CASE WHEN r.country_rank > 5 THEN 0.005 * (r.country_rank - 5) ELSE 0 END))::real AS similarity,
    r.passes_eligibility
  FROM ranked r
  ORDER BY (r.composite - (CASE WHEN r.country_rank > 5 THEN 0.005 * (r.country_rank - 5) ELSE 0 END)) DESC
  LIMIT p_max_results;
$function$;
