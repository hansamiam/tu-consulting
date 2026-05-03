-- =============================================================================
-- Per-scholarship match-score breakdown for transparency
-- =============================================================================
-- The composite ranking shipped in 9869c86 (similarity + deadline +
-- value + recency + country crowding) is opaque to the user — they see
-- a 0-100 number with no idea WHY this rank.
--
-- This migration ships a SQL helper `match_score_breakdown` that returns
-- the per-factor sub-scores + a one-line human-readable reason for each.
-- The frontend renders the breakdown in a popover when a user hovers a
-- score on Discover or in the brief.
--
-- Reproducible: same inputs → same output, identical math to
-- match_scholarships RPC. See docs/MATCH_SCORING.md for the algorithm.
-- =============================================================================

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
      s.scholarship_name
    FROM public.scholarships s
    WHERE s.scholarship_id = match_score_breakdown.scholarship_id
      AND s.embedding IS NOT NULL
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

    /* Deadline boost — same formula as match_scholarships RPC */
    CASE
      WHEN r.application_deadline IS NULL THEN 0.0
      WHEN r.application_deadline < CURRENT_DATE THEN 0.0
      WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '7 days'  THEN 0.020
      WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 0.040
      WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '90 days' THEN 0.025
      WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '180 days' THEN 0.010
      ELSE 0.0
    END::real AS deadline_boost,
    CASE
      WHEN r.application_deadline IS NULL THEN 'No fixed deadline.'
      WHEN r.application_deadline < CURRENT_DATE THEN 'Deadline has passed — adjusted out of consideration.'
      WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 'Deadline imminent — boosts urgency.'
      WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '90 days' THEN 'Deadline within 90 days — slight boost.'
      WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '180 days' THEN 'Deadline within 6 months — minor boost.'
      ELSE 'Deadline far out — no boost.'
    END AS deadline_reason,

    /* Value boost */
    LEAST(0.040, CASE WHEN COALESCE(r.estimated_total_value_usd, 0) <= 0 THEN 0.0
                       ELSE ln(r.estimated_total_value_usd::numeric + 1) / 200.0 END)::real AS value_boost,
    CASE
      WHEN COALESCE(r.estimated_total_value_usd, 0) <= 0 THEN 'No estimated dollar value on file.'
      WHEN r.estimated_total_value_usd >= 100000 THEN 'High-value award — gets a small boost.'
      WHEN r.estimated_total_value_usd >= 30000 THEN 'Solid funding amount — modest boost.'
      ELSE 'Lower funding tier — minimal boost.'
    END AS value_reason,

    /* Recency boost */
    CASE
      WHEN r.last_verified_date IS NULL THEN 0.0
      WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '30 days' THEN 0.020
      WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '90 days' THEN 0.010
      WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '365 days' THEN 0.0
      ELSE -0.020
    END::real AS recency_boost,
    CASE
      WHEN r.last_verified_date IS NULL THEN 'Never verified — no recency signal.'
      WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '30 days' THEN 'Verified in the last 30 days — full freshness boost.'
      WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '90 days' THEN 'Verified within 90 days — small boost.'
      WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '365 days' THEN 'Verified within the past year — neutral.'
      ELSE 'Last verified over a year ago — small recency penalty.'
    END AS recency_reason,

    (r.similarity
      + (CASE
          WHEN r.application_deadline IS NULL THEN 0.0
          WHEN r.application_deadline < CURRENT_DATE THEN 0.0
          WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '7 days'  THEN 0.020
          WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 0.040
          WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '90 days' THEN 0.025
          WHEN r.application_deadline <= CURRENT_DATE + INTERVAL '180 days' THEN 0.010
          ELSE 0.0
        END)
      + LEAST(0.040, CASE WHEN COALESCE(r.estimated_total_value_usd, 0) <= 0 THEN 0.0
                          ELSE ln(r.estimated_total_value_usd::numeric + 1) / 200.0 END)
      + (CASE
          WHEN r.last_verified_date IS NULL THEN 0.0
          WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '30 days' THEN 0.020
          WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '90 days' THEN 0.010
          WHEN r.last_verified_date > CURRENT_DATE - INTERVAL '365 days' THEN 0.0
          ELSE -0.020
        END)
    )::real AS composite_score
  FROM r;
$$;

GRANT EXECUTE ON FUNCTION public.match_score_breakdown(uuid, vector(1536), text, numeric, numeric, text) TO anon, authenticated;

COMMENT ON FUNCTION public.match_score_breakdown(uuid, vector(1536), text, numeric, numeric, text) IS
  'Per-scholarship breakdown of the composite match score for UI transparency. Same math as match_scholarships RPC. See docs/MATCH_SCORING.md.';
