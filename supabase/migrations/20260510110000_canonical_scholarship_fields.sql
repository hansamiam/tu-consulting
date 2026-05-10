-- Canonical scholarship pipeline — foundational fields
--
-- Per user direction (2026-05-10): "we need a real canonical system
-- engineered solution for: scholarship overviews, deadlines, funding
-- amounts, requirements, real canonical links."
--
-- This migration adds parallel canonical_* columns alongside the
-- existing fields. Existing fields stay where they are (they may have
-- been populated by sparse scrapes or manual entry); canonical_*
-- columns are populated by a dedicated canonical-extract edge
-- function that does deep-extraction with LLM + URL validation.
--
-- Frontend reads:
--   overview  = canonical_overview ?? why_this_fits ?? buildBlurb(...)
--   deadline  = canonical_deadline_iso ?? application_deadline
--   funding   = canonical_funding_text ?? award_amount_text ?? COVERAGE_LABEL[coverage_type]
--   link      = canonical_official_url ?? official_url
--
-- The canonical_quality_score (0-100) gives the frontend a single
-- signal for how "verified canonical" a row is, useful for sorting
-- premium results above sparse ones.

ALTER TABLE public.scholarships
  -- One-sentence editorial overview from the institution's official
  -- program page, NOT a per-user personalised line. Distinct from
  -- why_this_fits (which is profile-aware).
  ADD COLUMN IF NOT EXISTS canonical_overview text,
  ADD COLUMN IF NOT EXISTS canonical_overview_source text,
  ADD COLUMN IF NOT EXISTS canonical_overview_at timestamptz,

  -- Verified application deadline. Separate from application_deadline
  -- (which gets rolled forward annually for recurring programs and
  -- may be a guess) so we have a definitive answer for THIS year's
  -- cycle. Null when the program publishes only "rolling" or has no
  -- announced 2026/2027 deadline yet.
  ADD COLUMN IF NOT EXISTS canonical_deadline_iso date,
  ADD COLUMN IF NOT EXISTS canonical_deadline_at timestamptz,

  -- Verified funding amount. canonical_funding_text is the human-
  -- readable formatted string ("Full ride: tuition + $32K/yr stipend
  -- × 4yr"); canonical_funding_usd is the integer total a user can
  -- compare across programs.
  ADD COLUMN IF NOT EXISTS canonical_funding_text text,
  ADD COLUMN IF NOT EXISTS canonical_funding_usd integer,
  ADD COLUMN IF NOT EXISTS canonical_funding_at timestamptz,

  -- The DIRECT program page on the institution's domain (not an
  -- aggregator round-up). Validated against the aggregator domain
  -- list + a positive check that the page actually mentions the
  -- scholarship name. Null when no clean canonical URL was found.
  ADD COLUMN IF NOT EXISTS canonical_official_url text,
  ADD COLUMN IF NOT EXISTS canonical_official_url_at timestamptz,

  -- Structured eligibility requirements. JSONB shape:
  --   {
  --     citizenship: string[]   -- canonical country names
  --     levels: string[]        -- ["bachelor's", "master's", ...]
  --     fields: string[]        -- ["Computer Science", ...]
  --     min_gpa: number | null
  --     min_ielts: number | null
  --     min_toefl: number | null
  --     min_sat: number | null
  --     age_max: number | null
  --     other: string[]         -- free-form bullets we couldn't structure
  --   }
  ADD COLUMN IF NOT EXISTS canonical_requirements jsonb,
  ADD COLUMN IF NOT EXISTS canonical_requirements_at timestamptz,

  -- 0-100 score: count of canonical_* fields populated × 20.
  -- Frontend can boost rows with high canonical_quality_score so
  -- "fully verified" results surface above thin scrapes.
  ADD COLUMN IF NOT EXISTS canonical_quality_score smallint DEFAULT 0,

  -- Audit log. Each entry: { at: timestamp, source: "...", changed: [field, ...], confidence: 0-1 }
  ADD COLUMN IF NOT EXISTS canonical_audit jsonb DEFAULT '[]'::jsonb;

-- Composite index for the cron picker:
--   "rows that need canonical extraction first"
-- = nulls and stale before fresh.
CREATE INDEX IF NOT EXISTS idx_scholarships_canonical_freshness
  ON public.scholarships (canonical_overview_at NULLS FIRST, scholarship_id)
  WHERE verification_status IN ('verified', 'stale');

COMMENT ON COLUMN public.scholarships.canonical_overview IS
  'One-sentence editorial overview from the official program page. Distinct from why_this_fits (which is per-user). Populated by canonical-extract edge function.';
COMMENT ON COLUMN public.scholarships.canonical_quality_score IS
  '0-100 — % of canonical_* fields filled (overview, deadline, funding, url, requirements = 5 × 20). Frontend boosts high-score rows.';

-- Recompute trigger: keep canonical_quality_score in sync with which
-- canonical_* fields are populated. Fires on UPDATE so manual fills
-- and edge-function writes both update the score.
CREATE OR REPLACE FUNCTION public.recompute_canonical_quality_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.canonical_quality_score :=
      (CASE WHEN NEW.canonical_overview     IS NOT NULL AND length(NEW.canonical_overview) > 0   THEN 20 ELSE 0 END)
    + (CASE WHEN NEW.canonical_deadline_iso IS NOT NULL                                          THEN 20 ELSE 0 END)
    + (CASE WHEN NEW.canonical_funding_usd  IS NOT NULL                                          THEN 20 ELSE 0 END)
    + (CASE WHEN NEW.canonical_official_url IS NOT NULL AND length(NEW.canonical_official_url) > 0 THEN 20 ELSE 0 END)
    + (CASE WHEN NEW.canonical_requirements IS NOT NULL AND NEW.canonical_requirements::text <> '{}' AND NEW.canonical_requirements::text <> 'null' THEN 20 ELSE 0 END);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_canonical_quality_score ON public.scholarships;
CREATE TRIGGER trg_recompute_canonical_quality_score
  BEFORE INSERT OR UPDATE OF
    canonical_overview, canonical_deadline_iso, canonical_funding_usd,
    canonical_official_url, canonical_requirements
  ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_canonical_quality_score();
