-- Schema gap: existing fields (application_deadline + early_deadline +
-- early_decision_type) cover the "one early + one regular" case but break
-- for multi-deadline programs. Vanderbilt is the canonical example:
--   - College admissions ED I: Nov 1
--   - College admissions ED II: Jan 1
--   - College admissions RD: Jan 1
--   - Cornelius Vanderbilt Scholarship-specific deadline: Dec 1
-- All four are real; picking one is misleading.
--
-- Add deadlines_detail jsonb so we can store the full list as a structured
-- array. Existing application_deadline + early_deadline stay (they're the
-- "headline" + "earliest" the UI uses for sort + urgency); deadlines_detail
-- is the authoritative full picture for the detail surface.
--
-- Shape per item:
--   { "label": "Early Decision I",     "date": "2026-11-01", "type": "ED_I" }
--   { "label": "Scholarship deadline", "date": "2026-12-01", "type": "SCHOLARSHIP" }
--   { "label": "Regular Decision",     "date": "2027-01-01", "type": "RD" }
-- Types we'll use: ED_I, ED_II, EA, REA, SCEA, RD, SCHOLARSHIP,
-- NOMINATION, ROUND_1, ROUND_2, ROUND_3, ROUND_4, INTERVIEW, COUNTRY_SPECIFIC.
-- Free-form labels are allowed; types are a controlled enum for filtering.

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS deadlines_detail jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.scholarships.deadlines_detail IS
  '2026-05-27: structured array of all known deadlines for this program. '
  'Shape: [{label, date (YYYY-MM-DD), type}]. application_deadline + '
  'early_deadline remain the "headline" + "earliest" the UI sorts on; '
  'this column is the full picture for detail surfaces. Multi-deadline '
  'programs (US college aid with ED I/ED II/RD + scholarship-specific) '
  'must populate every meaningful date here so users are not misled.';

-- Helper: extract a typed deadline from the array — used by future SQL
-- views (e.g., upcoming-deadlines feed) without forcing every caller to
-- unpack the JSON.
CREATE OR REPLACE FUNCTION public.deadline_of_type(
  p_deadlines jsonb, p_type text
) RETURNS date
LANGUAGE sql IMMUTABLE AS $$
  SELECT (item->>'date')::date
  FROM jsonb_array_elements(COALESCE(p_deadlines, '[]'::jsonb)) AS item
  WHERE item->>'type' = p_type
  ORDER BY (item->>'date')::date ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.deadline_of_type(jsonb, text) IS
  'Pick the first deadline of a given type from a deadlines_detail array. '
  'Returns the earliest if multiple exist (e.g., regional ED_I dates).';
