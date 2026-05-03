-- =============================================================================
-- University data enrichment metadata
-- =============================================================================
-- Brief AI generation is bottlenecked by null fields on universities, programs,
-- admission_requirements, and applications. With null thresholds and null
-- acceptance rates the prompt feeds "—" to the model and the brief output
-- becomes vague.
--
-- This migration adds two columns per relevant table:
--   · enrichment_metadata jsonb — per-field { source, confidence, inferred_at }
--   · enriched_at timestamptz   — last AI enrichment pass timestamp
--
-- enrichment_metadata schema example:
--   {
--     "global_ranking":         { "source": "ai", "confidence": 0.85, "inferred_at": "2026-05-03T..." },
--     "tuition_usd_per_year":   { "source": "ai", "confidence": 0.78, "inferred_at": "2026-05-03T..." },
--     "ielts_score_min":        { "source": "verified", "verified_at": "2026-04-01T..." }
--   }
--
-- Field-level metadata so admins can see which values are AI-inferred (and
-- might be wrong) vs explicitly verified by the team. Verified values
-- override AI values; AI values are written only when the existing column
-- is null OR enriched_at is older than the staleness window.
--
-- Pure schema additions — every new column is nullable / defaulted to null,
-- so existing rows render unchanged.
-- =============================================================================

-- universities: global_ranking, tuition_usd_per_year, cost_of_living_index
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS enrichment_metadata jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at         timestamptz;

CREATE INDEX IF NOT EXISTS idx_universities_enriched_at
  ON public.universities(enriched_at NULLS FIRST);

-- programs: duration_years (rare null, but possible)
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS enrichment_metadata jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at         timestamptz;

-- admission_requirements: ielts_score_min, sat_score_min, gpa_min
ALTER TABLE public.admission_requirements
  ADD COLUMN IF NOT EXISTS enrichment_metadata jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at         timestamptz;

-- applications: acceptance_rate, visa_difficulty_score
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS enrichment_metadata jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at         timestamptz;

-- ─── Telemetry view: how much of the universe is enriched? ───────────
-- Used by /admin to surface coverage at a glance: "32 of 87 universities
-- have AI-enriched ranking data; 18 have human-verified data."
CREATE OR REPLACE VIEW public.university_enrichment_coverage_v AS
SELECT
  count(*)                                                              AS total_universities,
  count(*) FILTER (WHERE enriched_at IS NOT NULL)                       AS enriched_count,
  count(*) FILTER (WHERE enriched_at > now() - interval '180 days')     AS enriched_recent_count,
  count(*) FILTER (WHERE global_ranking IS NOT NULL)                    AS have_ranking,
  count(*) FILTER (WHERE tuition_usd_per_year IS NOT NULL)              AS have_tuition
FROM public.universities;

GRANT SELECT ON public.university_enrichment_coverage_v TO authenticated;
