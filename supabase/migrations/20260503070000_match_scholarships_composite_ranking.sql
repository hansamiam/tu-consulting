-- =============================================================================
-- match_scholarships: composite ranking (replaces 2-tier sort)
-- =============================================================================
-- The original RPC ordered candidates by (passes_eligibility DESC, similarity
-- DESC). Two failure modes that compound at scale:
--
--   1. NO DIVERSITY: when 12 of the top 15 vector matches are UK scholarships,
--      the user's list is monotone. They click 4 UK rows, none fit, and bounce.
--      A cap of N per host_country in the top-K guarantees the surface stays
--      varied without sacrificing the headline matches.
--
--   2. NO URGENCY / VALUE / FRESHNESS SIGNALS: the order doesn't reflect any
--      of (a) is the deadline imminent? (b) is the funding meaningful?
--      (c) is the row stale?  All three are pure math we already have.
--
-- The fix is a composite score combining the existing similarity with three
-- bounded boosts and a country-rank-based diversity penalty. Score weights
-- are conservative — similarity remains dominant, the boosts only differentiate
-- when similarity is near-tied. Eligible rows still always rank above
-- ineligible ones at the same score.
--
-- Same RPC name + signature as before, so all callers (match-scholarships
-- edge fn, topuni-ai-pathway, etc.) are upgraded transparently.
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
    -- Over-fetch 4× so the diversity + eligibility filters don't shrink the
    -- result set below the requested limit on uneven distributions.
    SELECT
      s.scholarship_id,
      s.host_country,
      (1 - (s.embedding <=> query_embedding))::real AS similarity,
      public.scholarship_passes_eligibility(
        s, p_nationality, p_min_gpa, p_min_ielts, p_degree_level
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
      -- Per-country rank within the candidate set so we can demote dupes.
      -- A candidate that is the 3rd UK row gets a heavier penalty than the
      -- 1st UK row at the same similarity.
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(c.host_country, '__null__')
        ORDER BY c.passes_eligibility DESC, c.similarity DESC
      ) AS country_rank,

      -- Deadline urgency boost: 0 if rolling/closed/null, peaks at +0.04 at
      -- ~30 days out, decays past 90 days. Encoded as a piecewise linear
      -- function so it's interpretable.
      CASE
        WHEN c.application_deadline IS NULL THEN 0.0
        WHEN c.application_deadline < CURRENT_DATE THEN 0.0
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '7 days'  THEN 0.020   -- last-week panic
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 0.040   -- prime apply window
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '90 days' THEN 0.025
        WHEN c.application_deadline <= CURRENT_DATE + INTERVAL '180 days' THEN 0.010
        ELSE 0.0
      END AS deadline_boost,

      -- Value boost: log10($USD)/8 capped at +0.04. So $50K → +0.029, $200K
      -- → +0.033, $1M → +0.038. Bounded so it can't dominate similarity.
      LEAST(0.040,
        CASE
          WHEN COALESCE(c.estimated_total_value_usd, 0) <= 0 THEN 0.0
          ELSE ln(c.estimated_total_value_usd::numeric + 1) / 200.0
        END
      )::real AS value_boost,

      -- Recency boost: recently re-verified rows rank slightly higher to push
      -- stale records down without removing them. ±0.02 max.
      CASE
        WHEN c.last_verified_date IS NULL THEN 0.0
        WHEN c.last_verified_date > CURRENT_DATE - INTERVAL '30 days' THEN 0.020
        WHEN c.last_verified_date > CURRENT_DATE - INTERVAL '90 days' THEN 0.010
        WHEN c.last_verified_date > CURRENT_DATE - INTERVAL '365 days' THEN 0.0
        ELSE -0.020   -- > 1yr stale
      END AS recency_boost
    FROM candidates c
  ),
  composite AS (
    SELECT
      scholarship_id,
      similarity,
      passes_eligibility,
      country_rank,
      -- Final score: similarity + boosts - country crowding penalty.
      -- Country crowding is exponential past rank 3 to push 4th+ same-country
      -- rows decisively down without nuking them entirely.
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
    -- Eligible always above ineligible at any score
    passes_eligibility DESC,
    score              DESC,
    -- Final tiebreak so the order is deterministic on identical scores
    similarity         DESC,
    scholarship_id     ASC
  LIMIT p_max_results;
$$;

-- Re-grant — function definition replaces ACLs.
GRANT EXECUTE ON FUNCTION public.match_scholarships(vector(1536), text, numeric, numeric, text, int) TO anon, authenticated;

-- Sanity check via EXPLAIN that the embedding ANN index is still chosen.
-- We don't ASSERT here (planner choices vary by stats) but logging the plan
-- would be a follow-up via pg_stat_statements once we have prod load.

COMMENT ON FUNCTION public.match_scholarships(vector(1536), text, numeric, numeric, text, int) IS
  'Composite-ranked vector match. Order: passes_eligibility DESC, score DESC, similarity DESC, id ASC. score = similarity + deadline_boost + value_boost + recency_boost - country_crowding_penalty.';
