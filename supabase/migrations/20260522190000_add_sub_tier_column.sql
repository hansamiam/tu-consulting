-- ============================================================================
-- Migration: 20260522190000_add_sub_tier_column
-- Purpose:   Add sub_tier column for §1.5b "named but partial coverage"
--            handling. Flag Leiden LExS + Radboud RSP as the initial members.
-- Spec:      docs/source_audit_2026-05-22.md §1.5b
-- Risk:      Additive column + 2 targeted UPDATEs. Reversible via column drop.
-- ============================================================================

ALTER TABLE public.scholarship_sources
  ADD COLUMN IF NOT EXISTS sub_tier TEXT
    CHECK (sub_tier IS NULL OR sub_tier IN ('partial_coverage_named', 'demographic_tagged'));

CREATE INDEX IF NOT EXISTS idx_scholarship_sources_sub_tier
  ON public.scholarship_sources (sub_tier)
  WHERE sub_tier IS NOT NULL;

COMMENT ON COLUMN public.scholarship_sources.sub_tier IS
  'Optional sub-tier flag for sources that pass the gate but need special UX handling. partial_coverage_named: named flagship but does not cover full ride (see audit §1.5b). demographic_tagged: narrow eligibility, route via personalization only. NULL = standard flagship treatment.';

-- Initial members of §1.5b — confirmed partial-coverage in 2026-05-22 audit
UPDATE public.scholarship_sources
SET sub_tier = 'partial_coverage_named',
    updated_at = now()
WHERE category = 'university'
  AND name IN (
    'Leiden University Excellence Scholarship',
    'Radboud Scholarship Programme (RSP)'
  );

-- Future cleanup (separate migration): backfill sub_tier = 'demographic_tagged'
-- on rows whose parser_hint starts with '[demographic_tagged:...]'. Pass 1
-- used parser_hint as the storage; once both pathways are unified the
-- parser_hint prefix can be dropped.
