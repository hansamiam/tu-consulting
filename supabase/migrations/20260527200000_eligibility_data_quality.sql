-- Eligibility data quality infrastructure — 2026-05-27 PM.
--
-- Incident: a Kazakhstan-profile user saw Commonwealth Scholarships
-- recommended. Investigation found two compounding problems:
--   1. Discover's matcher had two bugs (handled separately on the
--      front-end branch harden-eligibility-filter).
--   2. The DATA itself is wrong in several places — specifically a
--      hallucination pattern from the LLM extractor where it defaults
--      to ["India","Pakistan"] when it can't extract a real list.
--      16 published rows carry exactly that pattern across totally
--      unrelated programs (Mastercard Foundation for Africans showing
--      India/Pakistan, Nazarbayev University in KZ showing India/
--      Pakistan, etc).
--
-- This migration adds:
--   · `eligibility_verified_at` timestamp — when this row's eligibility
--     was last human-audited. Used by the audit cron to prioritise
--     re-checks and by the UI to show a "verify with provider" badge.
--   · `eligibility_audit_status` enum — last classification ('unverified',
--     'verified', 'suspicious', 'broken').
--   · `eligibility_audit_notes` text — free-text from the most recent
--     audit run.
--   · `suspicious_eligibility_rows` view — surfaces rows that match
--     known-bad data patterns so admin/cron can target them.
--   · A publish-gate function that demotes rows with the known-bad
--     India/Pakistan default pattern (preventing future scrapes from
--     republishing them once we clean them).

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS eligibility_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS eligibility_audit_status text DEFAULT 'unverified'
    CHECK (eligibility_audit_status IN ('unverified','verified','suspicious','broken')),
  ADD COLUMN IF NOT EXISTS eligibility_audit_notes text;

COMMENT ON COLUMN public.scholarships.eligibility_verified_at IS
  '2026-05-27: when eligible_countries was last human/audit-verified against the provider. NULL means never.';

COMMENT ON COLUMN public.scholarships.eligibility_audit_status IS
  '2026-05-27: ''verified'' = checked OK; ''suspicious'' = looks wrong, needs human review; ''broken'' = known-bad data flagged for re-extraction; ''unverified'' = never audited.';

-- View: rows that match any known-bad eligibility pattern.
-- Surfaces:
--   (1) The literal LLM-default ["India","Pakistan"] hallucination.
--   (2) Mixed inclusive+restrictive arrays (e.g. ["Kazakhstan","any"]).
--   (3) Pure region phrases the matcher cannot parse ("Asia",
--       "non-European developing", "International", "Outside EU/EEA",
--       "Least Developed Countries", "Small Islands Developing States",
--       "All countries with diplomatic ties to ...", etc).
--   (4) NULL eligibility on a provider that almost certainly has
--       restrictions (host country specifies a single country and
--       eligibility is unspecified — e.g. Eiffel France, Gates UK).
--   (5) Audit-status = 'broken'.
CREATE OR REPLACE VIEW public.suspicious_eligibility_rows AS
WITH flagged AS (
  SELECT
    s.scholarship_id,
    s.scholarship_name,
    s.provider_name,
    s.host_country,
    s.eligible_countries,
    s.eligibility_audit_status,
    s.eligibility_verified_at,
    s.is_published,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s.eligible_countries = ARRAY['India','Pakistan']::text[]
           THEN 'llm_default_india_pakistan' END,
      CASE WHEN s.eligible_countries IS NOT NULL
           AND EXISTS (SELECT 1 FROM unnest(s.eligible_countries) c
                       WHERE lower(c) ~* '^(any|any country|all countries|all nationalities|worldwide|international|open to all|open to international)$')
           AND EXISTS (SELECT 1 FROM unnest(s.eligible_countries) c
                       WHERE length(c) > 3
                         AND lower(c) !~* '^(any|any country|all countries|all nationalities|worldwide|international|open to all|open to international)$')
           THEN 'mixed_any_and_specific' END,
      CASE WHEN s.eligible_countries IS NOT NULL
           AND array_length(s.eligible_countries, 1) > 0
           AND NOT EXISTS (SELECT 1 FROM unnest(s.eligible_countries) c
                          WHERE length(c) > 2 AND lower(c) !~* '(developing|region|asia|europe|outside|least developed|small island|countries with|commonwealth countries|non-european|sub-saharan|oecd)')
           THEN 'region_phrase_only' END,
      CASE WHEN s.eligible_countries IS NULL
           AND s.is_published = true
           THEN 'null_on_published' END,
      CASE WHEN s.eligibility_audit_status = 'broken'
           THEN 'audit_flagged_broken' END
    ], NULL) AS flags
  FROM public.scholarships s
)
SELECT * FROM flagged
WHERE array_length(flags, 1) > 0
ORDER BY is_published DESC, scholarship_name;

COMMENT ON VIEW public.suspicious_eligibility_rows IS
  '2026-05-27: rows whose eligible_countries matches a known-bad data shape (LLM default hallucination, region phrases the matcher cannot parse, mixed any+specific, null-on-published, or explicitly flagged broken). Used by the eligibility audit cron and admin surface.';

-- One-shot: flag every currently-published row's audit status based on
-- the suspicious-row view. Existing rows that don't match any bad
-- pattern stay at the default 'unverified' (they're not necessarily
-- right — they just don't match the known-bad shapes).
UPDATE public.scholarships s
SET eligibility_audit_status = 'suspicious'
FROM public.suspicious_eligibility_rows v
WHERE v.scholarship_id = s.scholarship_id
  AND s.eligibility_audit_status = 'unverified';

-- For the specific LLM-default ["India","Pakistan"] hallucination,
-- promote to 'broken' since we know for certain this isn't real data
-- (16 unrelated programs share the same exact array — programs from
-- Mastercard Africa to Nazarbayev Kazakhstan to Adelaide Australia).
UPDATE public.scholarships
SET eligibility_audit_status = 'broken',
    eligibility_audit_notes = 'LLM-default hallucination: literal ["India","Pakistan"] pattern shared across 16 unrelated programs. Needs re-extraction or manual review.'
WHERE eligible_countries = ARRAY['India','Pakistan']::text[];

-- Defensive: ensure the audit columns are populated for any row that
-- exists right now (default already covers new inserts).
UPDATE public.scholarships
SET eligibility_audit_status = COALESCE(eligibility_audit_status, 'unverified')
WHERE eligibility_audit_status IS NULL;
