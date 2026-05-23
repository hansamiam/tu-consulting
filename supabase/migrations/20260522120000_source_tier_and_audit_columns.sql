-- Discover v1 — Phase A.1
-- Add source_tier classification + deactivation audit trail to scholarship_sources.
-- Pure additive; no row changes.
--
-- source_tier semantics (per spec D4):
--   official_program          = T1: official program site (e.g. chevening.org)
--   funder_portal             = T2: government/funder portal listing many programs (e.g. campusfrance.org)
--   aggregator_discovery_only = T3: whitelisted aggregator scanned for discovery only
--                                    (opportunitiesforyouth.org, opportunitiestracker.ug)
--
-- Deactivation audit (per spec D6): when is_active flips to false we record
-- WHY and under WHICH policy version so future-Samuel can revisit decisions.

ALTER TABLE public.scholarship_sources
  ADD COLUMN IF NOT EXISTS source_tier TEXT
    CHECK (source_tier IN ('official_program', 'funder_portal', 'aggregator_discovery_only'));

ALTER TABLE public.scholarship_sources
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

ALTER TABLE public.scholarship_sources
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE public.scholarship_sources
  ADD COLUMN IF NOT EXISTS deactivation_policy_version TEXT;

-- Backfill source_tier from the existing freeform category field so admin pages
-- have a useful value immediately. Anything unclear is left NULL for hand audit.
UPDATE public.scholarship_sources
SET source_tier = CASE
  WHEN category = 'aggregator' THEN 'aggregator_discovery_only'
  WHEN category IN ('government', 'foundation', 'ngo') THEN 'funder_portal'
  WHEN category = 'university' THEN 'official_program'
  ELSE NULL
END
WHERE source_tier IS NULL;

CREATE INDEX IF NOT EXISTS idx_scholarship_sources_tier_active
  ON public.scholarship_sources (source_tier, is_active);

COMMENT ON COLUMN public.scholarship_sources.source_tier IS
  'T1 (official_program) and T2 (funder_portal) are the only data-extraction sources. T3 (aggregator_discovery_only) is scanned for discovery only — its URL is never stored as a row''s official_url. Set by Discover v1 plan 2026-05-22.';
COMMENT ON COLUMN public.scholarship_sources.deactivation_reason IS
  'Free-text reason this source was set is_active=false. Filled at deactivation time. NULL means active.';
COMMENT ON COLUMN public.scholarship_sources.deactivation_policy_version IS
  'Policy version under which this source was deactivated, e.g. "v1-2026-05-22". Lets future audits group decisions by the rubric that produced them.';
