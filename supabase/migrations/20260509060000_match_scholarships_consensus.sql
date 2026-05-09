-- =============================================================================
-- match_scholarships + match_score_breakdown — consensus_score signal
-- =============================================================================
-- Adds the multi-source consensus signal (added in 20260509050000) into
-- the match ranking. A row that has 3 independent sources confirming
-- it should rank above an equally-fitting row with 1 source — every
-- other thing equal. This is the moat aggregator competitors can't
-- match: they list scholarships without evidence chains, while we
-- can prove "$10K Gates Cambridge — confirmed by 3 sources including
-- the official site."
--
-- Bounded magnitude (max +0.015) so similarity stays dominant. Mapping:
--   * consensus_score ≥ 8 →  +0.015   (3+ independent sources)
--   * consensus_score ≥ 6 →  +0.010   (1 official source OR 2 sources)
--   * consensus_score ≥ 4 →  +0.005   (1 university listing or 2 aggregators)
--   * else / NULL          →   0.000   (fewer or zero sources — no boost)
--
-- Why not bigger: consensus correlates with confidence + provider_trust,
-- so we don't double-count.
-- =============================================================================

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
  ORDER BY r.passes_eligibility DESC NULLS LAST,
           (r.composite - (CASE WHEN r.country_rank > 5 THEN 0.005 * (r.country_rank - 5) ELSE 0 END)) DESC
  LIMIT p_max_results;
$$;

GRANT EXECUTE ON FUNCTION public.match_scholarships(
  vector(1536), text, numeric, numeric, text, int, numeric, numeric
) TO anon, authenticated;

COMMENT ON FUNCTION public.match_scholarships(vector(1536), text, numeric, numeric, text, int, numeric, numeric) IS
  'Composite-ranked vector match. Score = similarity + deadline + value + recency + confidence_adj + completeness + engagement + provider_trust + consensus − country_crowding.';

-- ─── match_score_breakdown — surface consensus row in UI popover ──────
DROP FUNCTION IF EXISTS public.match_score_breakdown(uuid, vector(1536), text, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.match_score_breakdown(
  scholarship_id   uuid,
  query_embedding  vector(1536),
  p_nationality    text     DEFAULT NULL,
  p_min_gpa        numeric  DEFAULT NULL,
  p_min_ielts      numeric  DEFAULT NULL,
  p_degree_level   text     DEFAULT NULL
)
RETURNS TABLE (
  similarity                real,
  similarity_reason         text,
  passes_eligibility        boolean,
  eligibility_reason        text,
  deadline_boost            real,
  deadline_reason           text,
  value_boost               real,
  value_reason              text,
  recency_boost             real,
  recency_reason            text,
  confidence_adj            real,
  confidence_reason         text,
  completeness_boost        real,
  completeness_reason       text,
  engagement_boost          real,
  engagement_reason         text,
  provider_trust_boost      real,
  provider_trust_reason     text,
  consensus_boost           real,
  consensus_reason          text,
  composite_score           real
)
LANGUAGE sql
STABLE
AS $$
  WITH r AS (
    SELECT
      s.scholarship_id,
      (1 - (s.embedding <=> query_embedding))::real AS similarity,
      public.scholarship_passes_eligibility(s, p_nationality, p_min_gpa, p_min_ielts, p_degree_level) AS passes_eligibility,
      s.application_deadline,
      s.estimated_total_value_usd,
      s.last_verified_date,
      s.host_country,
      s.scholarship_name,
      s.confidence,
      s.data_completeness_score,
      s.provider_id,
      s.consensus_score,
      (SELECT count(DISTINCT source_domain)::int FROM public.scholarship_evidence WHERE scholarship_id = s.scholarship_id) AS source_domain_count
    FROM public.scholarships s
    WHERE s.scholarship_id = match_score_breakdown.scholarship_id
      AND s.embedding IS NOT NULL
  ),
  ev AS (
    SELECT COALESCE(stats.save_count_30d, 0) AS saves
    FROM public.scholarship_stats stats
    WHERE stats.scholarship_id = match_score_breakdown.scholarship_id
  ),
  pv AS (
    SELECT p.trust_tier, p.canonical_name
    FROM public.providers p, r
    WHERE p.provider_id = r.provider_id
  )
  SELECT
    r.similarity,
    CASE
      WHEN r.similarity >= 0.85 THEN 'Strong semantic match — your profile aligns closely with the funded fields and goals.'
      WHEN r.similarity >= 0.70 THEN 'Good semantic match — the program targets students with backgrounds like yours.'
      WHEN r.similarity >= 0.55 THEN 'Moderate match — overlap with your stated targets, worth exploring.'
      ELSE                          'Weaker match — out of your stated focus area but may still apply.'
    END AS similarity_reason,
    r.passes_eligibility,
    CASE
      WHEN r.passes_eligibility THEN 'Your nationality + scores meet the gating thresholds.'
      ELSE                            'One or more eligibility filters (nationality, GPA, IELTS) are not met or unknown.'
    END AS eligibility_reason,
    (CASE
      WHEN r.application_deadline IS NULL THEN 0.0
      WHEN r.application_deadline < current_date THEN -0.020
      WHEN r.application_deadline <= current_date + interval '14 days' THEN 0.040
      WHEN r.application_deadline <= current_date + interval '30 days' THEN 0.025
      WHEN r.application_deadline <= current_date + interval '60 days' THEN 0.012
      ELSE 0.0
    END)::real AS deadline_boost,
    CASE
      WHEN r.application_deadline IS NULL THEN 'Deadline unknown — no time-pressure boost.'
      WHEN r.application_deadline < current_date THEN 'Deadline already passed — small penalty until lifecycle cron retires it.'
      WHEN r.application_deadline <= current_date + interval '14 days' THEN 'Closes within 2 weeks — strong urgency boost.'
      WHEN r.application_deadline <= current_date + interval '30 days' THEN 'Closes within 30 days — moderate urgency boost.'
      WHEN r.application_deadline <= current_date + interval '60 days' THEN 'Closes within 60 days — small urgency nudge.'
      ELSE 'Deadline far out — no urgency boost yet.'
    END AS deadline_reason,
    (CASE
      WHEN r.estimated_total_value_usd IS NULL OR r.estimated_total_value_usd <= 0 THEN 0.0
      ELSE LEAST(0.030, (ln(GREATEST(1, r.estimated_total_value_usd))::numeric / ln(100000.0::numeric))::numeric * 0.030)
    END)::real AS value_boost,
    CASE
      WHEN r.estimated_total_value_usd IS NULL OR r.estimated_total_value_usd <= 0 THEN 'Funding amount not yet captured.'
      ELSE 'High-value award gets a logarithmic boost.'
    END AS value_reason,
    (CASE
      WHEN r.last_verified_date IS NULL THEN 0.0
      WHEN r.last_verified_date >= current_date - interval '90 days' THEN 0.020
      WHEN r.last_verified_date >= current_date - interval '180 days' THEN 0.010
      ELSE 0.0
    END)::real AS recency_boost,
    CASE
      WHEN r.last_verified_date IS NULL THEN 'Never verified — neutral weighting until verify-cron touches it.'
      WHEN r.last_verified_date >= current_date - interval '90 days' THEN 'Re-verified in the last 90 days — fresh data.'
      WHEN r.last_verified_date >= current_date - interval '180 days' THEN 'Re-verified within 6 months.'
      ELSE 'Verification getting stale — verify-cron will revisit soon.'
    END AS recency_reason,
    (CASE
      WHEN r.confidence IS NULL THEN 0.0
      WHEN r.confidence >= 0.85 THEN 0.0
      ELSE -1.0 * LEAST(0.040, (0.85 - GREATEST(0, r.confidence)) * 0.050)
    END)::real AS confidence_adj,
    CASE
      WHEN r.confidence IS NULL THEN 'Extraction confidence not captured — neutral weighting.'
      WHEN r.confidence >= 0.85 THEN 'High extraction confidence — no penalty.'
      ELSE 'Lower extraction confidence — small penalty so well-grounded rows surface first.'
    END AS confidence_reason,
    (CASE
      WHEN r.data_completeness_score IS NULL THEN 0.0
      WHEN r.data_completeness_score <= 8 THEN 0.0
      ELSE LEAST(0.030, ((r.data_completeness_score - 8)::numeric / 10.0) * 0.030)
    END)::real AS completeness_boost,
    CASE
      WHEN r.data_completeness_score IS NULL THEN 'Completeness score not captured.'
      WHEN r.data_completeness_score <= 8 THEN 'Sparse row — no boost yet; verify cron will progressively backfill.'
      ELSE 'Well-populated row — boosts visibility over thinner peers.'
    END AS completeness_reason,
    (SELECT LEAST(0.020, (ln(ev.saves + 1)::numeric / 80.0))::real FROM ev) AS engagement_boost,
    (SELECT
      CASE
        WHEN ev.saves >= 50 THEN 'Strong student interest — many recent saves.'
        WHEN ev.saves >= 10 THEN 'Growing interest — saved by multiple students recently.'
        WHEN ev.saves >  0 THEN 'Some recent saves — early signal.'
        ELSE                  'No save signal yet — neutral weighting.'
      END
     FROM ev) AS engagement_reason,
    (SELECT
      CASE pv.trust_tier
        WHEN 'high'    THEN 0.020
        WHEN 'medium'  THEN 0.010
        WHEN 'low'     THEN -0.005
        ELSE 0.0
      END::real
     FROM pv) AS provider_trust_boost,
    (SELECT
      CASE pv.trust_tier
        WHEN 'high'    THEN 'Verified funder — ' || pv.canonical_name || ' is a recognised authoritative source.'
        WHEN 'medium'  THEN 'Recognised funder — ' || pv.canonical_name || ' is in our verified provider list.'
        WHEN 'low'     THEN 'Lower-trust funder signal.'
        ELSE                'Provider not yet verified — neutral weighting.'
      END
     FROM pv) AS provider_trust_reason,
    (CASE
      WHEN r.consensus_score IS NULL THEN 0.0
      WHEN r.consensus_score >= 8 THEN 0.015
      WHEN r.consensus_score >= 6 THEN 0.010
      WHEN r.consensus_score >= 4 THEN 0.005
      ELSE 0.0
    END)::real AS consensus_boost,
    CASE
      WHEN r.consensus_score IS NULL OR r.source_domain_count = 0 THEN 'No source evidence yet — neutral weighting.'
      WHEN r.consensus_score >= 8 THEN 'Strong source consensus — confirmed by ' || r.source_domain_count || ' independent sources.'
      WHEN r.consensus_score >= 6 THEN 'Solid source consensus — confirmed by ' || r.source_domain_count || ' source(s) including authoritative ones.'
      WHEN r.consensus_score >= 4 THEN 'Moderate source consensus — ' || r.source_domain_count || ' source(s) with mixed authority.'
      ELSE 'Single low-authority source — minimal corroboration boost.'
    END AS consensus_reason,
    (r.similarity
     + (CASE
         WHEN r.application_deadline IS NULL THEN 0.0
         WHEN r.application_deadline < current_date THEN -0.020
         WHEN r.application_deadline <= current_date + interval '14 days' THEN 0.040
         WHEN r.application_deadline <= current_date + interval '30 days' THEN 0.025
         WHEN r.application_deadline <= current_date + interval '60 days' THEN 0.012
         ELSE 0.0
       END)
     + (CASE
         WHEN r.estimated_total_value_usd IS NULL OR r.estimated_total_value_usd <= 0 THEN 0.0
         ELSE LEAST(0.030, (ln(GREATEST(1, r.estimated_total_value_usd))::numeric / ln(100000.0::numeric))::numeric * 0.030)
       END)
     + (CASE
         WHEN r.last_verified_date IS NULL THEN 0.0
         WHEN r.last_verified_date >= current_date - interval '90 days' THEN 0.020
         WHEN r.last_verified_date >= current_date - interval '180 days' THEN 0.010
         ELSE 0.0
       END)
     + (CASE
         WHEN r.confidence IS NULL OR r.confidence >= 0.85 THEN 0.0
         ELSE -1.0 * LEAST(0.040, (0.85 - GREATEST(0, r.confidence)) * 0.050)
       END)
     + (CASE
         WHEN r.data_completeness_score IS NULL OR r.data_completeness_score <= 8 THEN 0.0
         ELSE LEAST(0.030, ((r.data_completeness_score - 8)::numeric / 10.0) * 0.030)
       END)
     + COALESCE((SELECT LEAST(0.020, (ln(ev.saves + 1)::numeric / 80.0)) FROM ev), 0)
     + COALESCE((SELECT
         CASE pv.trust_tier
           WHEN 'high'    THEN 0.020
           WHEN 'medium'  THEN 0.010
           WHEN 'low'     THEN -0.005
           ELSE 0.0
         END
        FROM pv), 0)
     + (CASE
         WHEN r.consensus_score IS NULL THEN 0.0
         WHEN r.consensus_score >= 8 THEN 0.015
         WHEN r.consensus_score >= 6 THEN 0.010
         WHEN r.consensus_score >= 4 THEN 0.005
         ELSE 0.0
       END)
    )::real AS composite_score
  FROM r;
$$;

GRANT EXECUTE ON FUNCTION public.match_score_breakdown(uuid, vector(1536), text, numeric, numeric, text) TO anon, authenticated;

COMMENT ON FUNCTION public.match_score_breakdown(uuid, vector(1536), text, numeric, numeric, text) IS
  'Per-row score explainer for the UI popover. Now surfaces 9 factors: similarity, eligibility, deadline, value, recency, confidence, completeness, engagement, provider_trust, consensus.';
