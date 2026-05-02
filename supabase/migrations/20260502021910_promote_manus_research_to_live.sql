-- ─── Step 3 — Promote Manus AI intake rows into live scholarships ────
-- Strategy: bulk INSERT every loadable intake row whose name doesn't
-- already exist in the live scholarships table (case-insensitive name
-- match; substring match for prefix/suffix variants like "DAAD X" vs
-- "X"). All promoted rows are tagged:
--   data_source       = 'manus_ai_2026_05_03'
--   verified          = false
--   last_verified_date = '2026-05-02'  (the Manus research date)
-- The Discover UI reads data_source + verified to decide what badge
-- to show on each card.
--
-- This migration is idempotent at the row level: re-running won't
-- duplicate rows because the WHERE clause excludes any name that's
-- already in scholarships, and each promoted intake row is marked
-- promoted_to_live=true so we don't re-promote on re-run.

WITH live_names AS (
  SELECT LOWER(TRIM(scholarship_name)) AS norm_name FROM public.scholarships
),
to_promote AS (
  SELECT i.*
  FROM public.scholarships_research_intake i
  WHERE i.is_loadable = true
    AND i.promoted_to_live = false
    AND NOT EXISTS (
      SELECT 1 FROM live_names ln
      WHERE ln.norm_name = LOWER(TRIM(i.scholarship_name))
         OR LOWER(TRIM(i.scholarship_name)) LIKE '%' || ln.norm_name || '%'
         OR ln.norm_name LIKE '%' || LOWER(TRIM(i.scholarship_name)) || '%'
    )
),
inserted AS (
  INSERT INTO public.scholarships (
    scholarship_name, provider_name, host_country, official_url,
    coverage_type,
    award_amount_text, estimated_total_value_usd,
    target_degree_level, target_fields, eligible_countries,
    citizenship_requirements, eligibility_requirements,
    application_deadline, deadline_type,
    age_limit, selectivity_level,
    verified, last_verified_date, data_source
  )
  SELECT
    scholarship_name,
    provider_name,
    host_country,
    official_url,
    -- coverage_type is NOT NULL in live; fall back to 'stipend' if the
    -- intake row didn't get a confident classification.
    COALESCE(NULLIF(coverage_type, ''), 'stipend'),
    award_amount_text,
    estimated_total_value_usd,
    target_degree_level,
    target_fields,
    eligible_countries,
    citizenship_requirements,
    eligibility_requirements,
    application_deadline,
    deadline_type,
    age_limit,
    selectivity_level,
    false,                        -- verified
    '2026-05-02'::date,           -- last_verified_date
    'manus_ai_2026_05_03'         -- data_source
  FROM to_promote
  RETURNING scholarship_id, LOWER(TRIM(scholarship_name)) AS norm_name
)
-- Mark the corresponding intake rows as promoted, linking them to the
-- live scholarship_id we just inserted.
UPDATE public.scholarships_research_intake i
SET promoted_to_live    = true,
    promoted_at         = now(),
    live_scholarship_id = ins.scholarship_id
FROM inserted ins
WHERE LOWER(TRIM(i.scholarship_name)) = ins.norm_name
  AND i.is_loadable = true
  AND i.promoted_to_live = false;
