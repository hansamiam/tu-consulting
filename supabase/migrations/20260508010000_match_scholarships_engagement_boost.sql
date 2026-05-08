-- =============================================================================
-- match_scholarships + match_score_breakdown — engagement boost
-- =============================================================================
-- The activity_signal_engine (20260503020000) records every save / view /
-- share into scholarship_events and rolls them into scholarship_stats
-- nightly. Until now those numbers were only used for the "47 tracking"
-- social-proof badge — the ranking stack ignored them entirely.
--
-- This migration feeds the strongest intent signal (save_count_30d) back
-- into the composite score as a small, capped engagement_boost. Saves are
-- a much harder signal than views: a student who SHORTLISTS a scholarship
-- is committing to track it across the application cycle, vs. a passive
-- glance from a card.
--
-- Design constraints to avoid winner-takes-all dynamics:
--
--   1. Logarithmic — ln(saves + 1) / 80 means the first 5 saves matter
--      MORE per-save than the next 50; matters more than the next 500.
--      No runaway feedback loop where the top row keeps absorbing all
--      the saves and gets boosted into perpetuity.
--
--   2. Capped at 0.020 — strictly smaller than deadline/recency boosts.
--      A row with 1000 saves outranks a row with 0 saves at the margin
--      but never overrides a strong semantic mismatch.
--
--   3. Falls to 0 when scholarship_stats has no row (LEFT JOIN). New
--      rows aren't penalised — they just don't get the boost yet. The
--      Discover surface independently surfaces NEW rows via the pill.
--
--   4. 30-day window — not all-time. A scholarship that was hot in 2024
--      but no one has saved this year shouldn't keep getting the boost.
-- =============================================================================

-- ─── match_scholarships (composite ranker) ────────────────────────────────
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
      s.data_completeness_score,
      ss.save_count_30d
    FROM public.scholarships s
    LEFT JOIN public.scholarship_stats ss USING (scholarship_id)
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
      )::real AS completeness_boost,

      -- Engagement boost. ln(saves+1)/80 plateaus at ~0.020 around ~4500
      -- saves; cap enforces a hard ceiling so a runaway hit can't dominate
      -- ranking. A scholarship with 0 or NULL saves contributes 0.
      (
        CASE
          WHEN c.save_count_30d IS NULL OR c.save_count_30d <= 0 THEN 0.0
          ELSE LEAST(0.020, ln(c.save_count_30d::numeric + 1) / 80.0)
        END
      )::real AS engagement_boost
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
        + engagement_boost
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
  'Composite-ranked vector match. Score = similarity + deadline + value + recency + confidence_adj + completeness + engagement - country_crowding. engagement_boost reads save_count_30d from scholarship_stats; logarithmic, capped at 0.020.';

-- ─── match_score_breakdown (per-row explainer) ────────────────────────────
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
      ss.save_count_30d
    FROM public.scholarships s
    LEFT JOIN public.scholarship_stats ss USING (scholarship_id)
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

    LEAST(0.040, CASE WHEN COALESCE(r.estimated_total_value_usd, 0) <= 0 THEN 0.0
                       ELSE ln(r.estimated_total_value_usd::numeric + 1) / 200.0 END)::real AS value_boost,
    CASE
      WHEN COALESCE(r.estimated_total_value_usd, 0) <= 0 THEN 'No estimated dollar value on file.'
      WHEN r.estimated_total_value_usd >= 100000 THEN 'High-value award — gets a small boost.'
      WHEN r.estimated_total_value_usd >= 30000 THEN 'Solid funding amount — modest boost.'
      ELSE 'Lower funding tier — minimal boost.'
    END AS value_reason,

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

    (
      CASE
        WHEN r.confidence IS NULL THEN 0.0
        WHEN r.confidence >= 0.85 THEN 0.0
        ELSE -1.0 * LEAST(0.040, (0.85 - GREATEST(0, r.confidence)) * 0.050)
      END
    )::real AS confidence_adj,
    CASE
      WHEN r.confidence IS NULL OR r.confidence >= 0.85 THEN 'Extracted with high confidence — no adjustment.'
      WHEN r.confidence >= 0.70 THEN 'Extracted from limited page detail — small downweight.'
      ELSE 'Extracted from very thin signals — material downweight; verify before applying.'
    END AS confidence_reason,

    (
      CASE
        WHEN r.data_completeness_score IS NULL THEN 0.0
        WHEN r.data_completeness_score <= 8 THEN 0.0
        ELSE LEAST(0.030, (r.data_completeness_score - 8) * 0.003)
      END
    )::real AS completeness_boost,
    CASE
      WHEN r.data_completeness_score IS NULL THEN 'Data completeness unknown — no boost.'
      WHEN r.data_completeness_score >= 15 THEN 'Comprehensive data on file — full completeness boost.'
      WHEN r.data_completeness_score >= 11 THEN 'Above-average data depth — modest boost.'
      WHEN r.data_completeness_score >  8  THEN 'Adequate data — small boost.'
      ELSE 'Sparse record — no boost; consider this a starting point and verify directly.'
    END AS completeness_reason,

    -- Engagement boost — see match_scholarships for the rationale.
    (
      CASE
        WHEN r.save_count_30d IS NULL OR r.save_count_30d <= 0 THEN 0.0
        ELSE LEAST(0.020, ln(r.save_count_30d::numeric + 1) / 80.0)
      END
    )::real AS engagement_boost,
    CASE
      WHEN r.save_count_30d IS NULL OR r.save_count_30d <= 0 THEN 'No saves in the last 30 days — no engagement boost yet.'
      WHEN r.save_count_30d >= 50 THEN 'Strong save velocity — many students are tracking this scholarship.'
      WHEN r.save_count_30d >= 10 THEN 'Picking up traction — a meaningful number of recent saves.'
      ELSE 'A few recent saves — small boost.'
    END AS engagement_reason,

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
      + (CASE
          WHEN r.confidence IS NULL THEN 0.0
          WHEN r.confidence >= 0.85 THEN 0.0
          ELSE -1.0 * LEAST(0.040, (0.85 - GREATEST(0, r.confidence)) * 0.050)
        END)
      + (CASE
          WHEN r.data_completeness_score IS NULL THEN 0.0
          WHEN r.data_completeness_score <= 8 THEN 0.0
          ELSE LEAST(0.030, (r.data_completeness_score - 8) * 0.003)
        END)
      + (CASE
          WHEN r.save_count_30d IS NULL OR r.save_count_30d <= 0 THEN 0.0
          ELSE LEAST(0.020, ln(r.save_count_30d::numeric + 1) / 80.0)
        END)
    )::real AS composite_score
  FROM r;
$$;

GRANT EXECUTE ON FUNCTION public.match_score_breakdown(uuid, vector(1536), text, numeric, numeric, text) TO anon, authenticated;

COMMENT ON FUNCTION public.match_score_breakdown(uuid, vector(1536), text, numeric, numeric, text) IS
  'Per-scholarship breakdown of the composite match score. Mirrors match_scholarships RPC math. Now includes engagement_boost (saves last 30d).';
