-- =============================================================================
-- Data completeness score — measurable per-row quality signal
-- =============================================================================
-- Until now we had no objective way to ask "how much real information does
-- this scholarship row carry?" That left two problems:
--   1. We couldn't prioritize which rows verify-scholarship-cron should
--      re-fetch first. The cron picks oldest-verified, so a thin row with
--      almost no data sits in the queue equally next to a fully-populated
--      row that just rotated past its TTL.
--   2. We couldn't measure catalog quality drift over time. "Average
--      completeness" is the kind of number we want trending up.
--
-- Adds:
--   * `data_completeness_score smallint` on public.scholarships — count of
--     populated substantive fields, max 18.
--   * `compute_completeness_score(scholarships)` — IMMUTABLE row function
--     scoring the row. Each populated substantive field counts 1.
--   * BEFORE INSERT/UPDATE trigger that maintains the score automatically.
--   * Backfill UPDATE for all existing rows.
--   * Index on (data_completeness_score, last_verified_at) so verify-cron
--     can sort cheaply.
-- =============================================================================

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS data_completeness_score smallint;

COMMENT ON COLUMN public.scholarships.data_completeness_score IS
  'Count of populated substantive fields, 0–18. Maintained by trigger. Use for verify-cron prioritization and admin quality dashboards.';

CREATE OR REPLACE FUNCTION public.compute_completeness_score(s public.scholarships)
RETURNS smallint
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score smallint := 0;
BEGIN
  -- Required-ish core (always present for valid rows but kept for honesty)
  IF s.scholarship_name IS NOT NULL AND length(trim(s.scholarship_name)) > 0 THEN score := score + 1; END IF;
  IF s.provider_name    IS NOT NULL AND length(trim(s.provider_name)) > 0    THEN score := score + 1; END IF;
  IF s.host_country     IS NOT NULL AND length(trim(s.host_country)) > 0     THEN score := score + 1; END IF;
  IF s.coverage_type    IS NOT NULL                                          THEN score := score + 1; END IF;
  IF s.official_url     IS NOT NULL AND length(trim(s.official_url)) > 8     THEN score := score + 1; END IF;

  -- Deadline signal
  IF s.application_deadline IS NOT NULL THEN score := score + 1; END IF;
  IF s.deadline_type IS NOT NULL AND s.deadline_type <> 'unknown' THEN score := score + 1; END IF;

  -- Funding signal
  IF s.estimated_total_value_usd IS NOT NULL AND s.estimated_total_value_usd > 0 THEN score := score + 1; END IF;
  IF s.award_amount_text IS NOT NULL AND length(trim(s.award_amount_text)) > 0   THEN score := score + 1; END IF;

  -- Targeting (degree / field / eligibility)
  IF s.target_degree_level IS NOT NULL AND cardinality(s.target_degree_level) > 0 THEN score := score + 1; END IF;
  IF s.target_fields IS NOT NULL AND cardinality(s.target_fields) > 0             THEN score := score + 1; END IF;
  IF s.eligible_countries IS NOT NULL AND cardinality(s.eligible_countries) > 0   THEN score := score + 1; END IF;
  IF s.citizenship_requirements IS NOT NULL AND length(trim(s.citizenship_requirements)) > 0 THEN score := score + 1; END IF;
  IF s.eligibility_requirements IS NOT NULL AND length(trim(s.eligibility_requirements)) > 0 THEN score := score + 1; END IF;

  -- Narrative depth (only counts if substantively populated)
  IF s.ideal_candidate_profile IS NOT NULL AND length(trim(s.ideal_candidate_profile)) >= 60 THEN score := score + 1; END IF;
  IF s.why_this_fits           IS NOT NULL AND length(trim(s.why_this_fits))           >= 60 THEN score := score + 1; END IF;
  IF s.how_to_win              IS NOT NULL AND length(trim(s.how_to_win))              >= 60 THEN score := score + 1; END IF;

  -- Visual + duration
  IF s.cover_image_url IS NOT NULL AND length(trim(s.cover_image_url)) > 8 THEN score := score + 1; END IF;

  RETURN score;
END
$$;

GRANT EXECUTE ON FUNCTION public.compute_completeness_score(public.scholarships) TO service_role;

-- ─── Trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.maintain_completeness_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.data_completeness_score := public.compute_completeness_score(NEW);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS scholarships_completeness_score ON public.scholarships;
CREATE TRIGGER scholarships_completeness_score
  BEFORE INSERT OR UPDATE ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_completeness_score();

-- ─── Backfill existing rows ────────────────────────────────────────
-- Touch every row so the trigger fires. Use a no-op SET that won't
-- change semantics but does cause BEFORE UPDATE to recompute the score.
UPDATE public.scholarships
SET scholarship_name = scholarship_name
WHERE data_completeness_score IS NULL;

-- ─── Index for verify-cron prioritization ─────────────────────────
-- verify-scholarship-cron will ORDER BY data_completeness_score ASC,
-- last_verified_at ASC NULLS FIRST so low-quality rows + never-verified
-- rows surface to the top of the queue.
CREATE INDEX IF NOT EXISTS scholarships_completeness_verify_idx
  ON public.scholarships (data_completeness_score ASC, last_verified_at ASC NULLS FIRST)
  WHERE source_url IS NOT NULL AND verification_status <> 'broken';
