-- 2026-05-26 Cofounder report: Schwarzman appeared twice in the
-- strategy report. Root cause: the brief retrieval (match_scholarships
-- RPC + topuni-ai-pathway fallback) only filtered on verification_status
-- + lifecycle_status, NOT on is_published. The Discover catalog gates
-- on is_published=true; the brief LLM saw BOTH rows because the second
-- Schwarzman row (canonical_key=schwarzman tsinghua china, is_published=false,
-- verification_status=stale) slipped through. There are ~30 other dup
-- pairs in the corpus with the same shape — same name, slightly different
-- canonical_key (provider-name normalization differences), one published
-- and one not. Gate the LLM context on is_published=true so it only sees
-- what the catalog also surfaces.
--
-- The canonical_key collision will be fixed in a separate dedup pass
-- (real fix: normalize provider tokens so "Schwarzman College..." and
-- "Tsinghua University" produce the same key for the same scholarship);
-- this migration is the immediate-stop on the user-visible bug.
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
      AND s.is_published = true
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
