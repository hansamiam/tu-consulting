-- =============================================================================
-- Completeness scoring — length floors for prose fields
-- =============================================================================
-- The original score (migration 20260507190000) counted award_amount_text
-- and eligibility_requirements simply as "non-null". That left rows with
-- stub prose like "Funded" / "Apply now" / "Various" scoring the same as
-- rows with full multi-sentence overviews, so verify-scholarship-cron
-- never prioritized re-fetching the stubs.
--
-- This migration:
--   * Adds 40-char floors to award_amount_text + eligibility_requirements
--     so stub prose stops counting as "complete".
--   * Adds a 30-char floor to citizenship_requirements (same reason).
--   * Adds language_requirements + duration_text to the score (also with
--     length floors). These flow into the Discover Overview tab and were
--     previously absent from completeness scoring.
--   * Backfill: touches every row so the trigger recomputes its score.
--     Rows with stubs will fall to the back of the completeness queue,
--     which means verify-scholarship-cron picks them up FIRST on its next
--     pass (it ORDERs by data_completeness_score ASC).
--
-- Net effect: combined with the verify-scholarship prose-backfill change
-- (NULL/short → substantive value flows silently) the catalog progressively
-- heals from "thin overview" → "rich overview" with no admin intervention.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.compute_completeness_score(s public.scholarships)
RETURNS smallint
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score smallint := 0;
BEGIN
  -- Required-ish core
  IF s.scholarship_name IS NOT NULL AND length(trim(s.scholarship_name)) > 0 THEN score := score + 1; END IF;
  IF s.provider_name    IS NOT NULL AND length(trim(s.provider_name)) > 0    THEN score := score + 1; END IF;
  IF s.host_country     IS NOT NULL AND length(trim(s.host_country)) > 0     THEN score := score + 1; END IF;
  IF s.coverage_type    IS NOT NULL                                          THEN score := score + 1; END IF;
  IF s.official_url     IS NOT NULL AND length(trim(s.official_url)) > 8     THEN score := score + 1; END IF;

  -- Deadline signal
  IF s.application_deadline IS NOT NULL THEN score := score + 1; END IF;
  IF s.deadline_type IS NOT NULL AND s.deadline_type <> 'unknown' THEN score := score + 1; END IF;

  -- Funding signal — award_amount_text now requires substantive prose
  -- (40+ chars). "Funded" / "Apply now" / "Varies" no longer count.
  IF s.estimated_total_value_usd IS NOT NULL AND s.estimated_total_value_usd > 0 THEN score := score + 1; END IF;
  IF s.award_amount_text IS NOT NULL AND length(trim(s.award_amount_text)) >= 40 THEN score := score + 1; END IF;

  -- Targeting (degree / field / eligibility) — citizenship + eligibility
  -- now require real prose (30 / 40 chars) so stubs stop padding scores.
  IF s.target_degree_level IS NOT NULL AND cardinality(s.target_degree_level) > 0 THEN score := score + 1; END IF;
  IF s.target_fields IS NOT NULL AND cardinality(s.target_fields) > 0             THEN score := score + 1; END IF;
  IF s.eligible_countries IS NOT NULL AND cardinality(s.eligible_countries) > 0   THEN score := score + 1; END IF;
  IF s.citizenship_requirements IS NOT NULL AND length(trim(s.citizenship_requirements)) >= 30 THEN score := score + 1; END IF;
  IF s.eligibility_requirements IS NOT NULL AND length(trim(s.eligibility_requirements)) >= 40 THEN score := score + 1; END IF;

  -- Narrative depth (only counts if substantively populated)
  IF s.ideal_candidate_profile IS NOT NULL AND length(trim(s.ideal_candidate_profile)) >= 60 THEN score := score + 1; END IF;
  IF s.why_this_fits           IS NOT NULL AND length(trim(s.why_this_fits))           >= 60 THEN score := score + 1; END IF;
  IF s.how_to_win              IS NOT NULL AND length(trim(s.how_to_win))              >= 60 THEN score := score + 1; END IF;

  -- Overview-tab supporting prose. Soft floors — these tend to be short
  -- naturally, so 12-char floors weed out only the literal stubs ("TBA",
  -- "Varies").
  IF s.language_requirements IS NOT NULL AND length(trim(s.language_requirements)) >= 12 THEN score := score + 1; END IF;
  IF s.duration_text         IS NOT NULL AND length(trim(s.duration_text))         >= 12 THEN score := score + 1; END IF;

  -- Visual + duration
  IF s.cover_image_url IS NOT NULL AND length(trim(s.cover_image_url)) > 8 THEN score := score + 1; END IF;

  RETURN score;
END
$$;

-- Backfill: trigger recomputes scores for every row so the new length
-- floors take effect across the catalog.
UPDATE public.scholarships
SET scholarship_name = scholarship_name;

COMMENT ON FUNCTION public.compute_completeness_score(public.scholarships) IS
  'Counts populated substantive fields, 0–20. Adds 40-char floors to award_amount_text + eligibility_requirements + 30-char floor to citizenship_requirements (no longer counts stubs like "Funded"/"Various"). Adds language_requirements + duration_text. See migration 20260510070000.';
