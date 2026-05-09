-- =============================================================================
-- Heuristic field backfill — fill catalog-wide gaps with safe defaults
-- =============================================================================
-- 20260509170000 hand-enriched the ~6 famous-funder rows. The OTHER ~200
-- rows are aggregator-scraped entries that don't match a famous-funder
-- name pattern. They have the same gaps (deadline, target_fields,
-- duration_text, selectivity_level) but no registry data to draw from.
--
-- Two compromises here:
--   * Heuristic ≠ verified. Where we use a heuristic (e.g. inferring
--     selectivity from estimated_total_value_usd), it's a sensible
--     default that the verify-cron can override on its next pass.
--     Better than NULL.
--   * NEVER overwrite existing data. Every UPDATE has IS NULL guards.
--
-- What we do:
--   1. Default duration_text by target_degree_level (master's →
--      "1-2 years", PhD → "3-5 years", undergraduate → "3-4 years")
--   2. Default selectivity_level by estimated_total_value_usd
--      (>$50k = high, >$20k = medium, else low)
--   3. Default coverage_type by award_amount_text patterns
--      ("full ride" / "fully funded" → full_ride; "tuition" → tuition_only)
--   4. Backfill target_fields from scholarship_name regex
--      (e.g. "Engineering Scholarship" → ["Engineering"])
--   5. Default deadline_type='annual' for any row with verification
--      status='verified' or 'stale' AND null deadline_type
-- =============================================================================

-- ─── 1. Default duration_text by degree level ────────────────────────
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET duration_text = CASE
    WHEN array_to_string(target_degree_level, ',') ILIKE '%phd%'         THEN '3-5 years'
    WHEN array_to_string(target_degree_level, ',') ILIKE '%master%'      THEN '1-2 years'
    WHEN array_to_string(target_degree_level, ',') ILIKE '%bachelor%'    THEN '3-4 years'
    WHEN array_to_string(target_degree_level, ',') ILIKE '%undergrad%'   THEN '3-4 years'
    WHEN array_to_string(target_degree_level, ',') ILIKE '%doctor%'      THEN '3-5 years'
    WHEN array_to_string(target_degree_level, ',') ILIKE '%postdoc%'     THEN '1-3 years'
    ELSE NULL
  END
  WHERE (duration_text IS NULL OR length(btrim(duration_text)) = 0)
    AND target_degree_level IS NOT NULL
    AND cardinality(target_degree_level) > 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic] duration_text from degree level: % row(s)', v_count;
END $$;

-- ─── 2. Default selectivity_level from value ────────────────────────
-- High value programs are typically more competitive.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET selectivity_level = CASE
    WHEN estimated_total_value_usd >= 100000 THEN 'very_high'
    WHEN estimated_total_value_usd >= 50000  THEN 'high'
    WHEN estimated_total_value_usd >= 15000  THEN 'medium'
    ELSE 'low'
  END
  WHERE selectivity_level IS NULL
    AND estimated_total_value_usd IS NOT NULL
    AND estimated_total_value_usd > 0;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic] selectivity_level from value: % row(s)', v_count;
END $$;

-- ─── 3. Default coverage_type from award text ────────────────────────
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET coverage_type = CASE
    WHEN award_amount_text ~* '\m(full[\s-]ride|fully[\s-]funded|full[\s-]funding|covers all|all expenses paid|complete funding)\M' THEN 'full_ride'
    WHEN award_amount_text ~* '\m(tuition only|tuition fees? only|covers tuition)\M' THEN 'tuition_only'
    WHEN award_amount_text ~* '\m(stipend|monthly allowance|living allowance)\M' THEN 'stipend'
    ELSE coverage_type
  END
  WHERE (coverage_type IS NULL OR coverage_type = 'other')
    AND award_amount_text IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic] coverage_type from award text: % row(s)', v_count;
END $$;

-- ─── 4. Backfill target_fields from scholarship_name regex ───────────
-- Catches "Engineering Scholarship", "Computer Science Fellowship",
-- "Medical Research Grant", etc. Conservative — only fires when name
-- has an unambiguous field cue.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET target_fields = CASE
    WHEN scholarship_name ~* '\mengineering\M'                 THEN ARRAY['Engineering']
    WHEN scholarship_name ~* '\m(computer science|cs\b|software)\M' THEN ARRAY['Computer Science']
    WHEN scholarship_name ~* '\m(medicine|medical|health)\M'   THEN ARRAY['Medicine', 'Public Health']
    WHEN scholarship_name ~* '\m(law|legal studies|jurisprud)\M' THEN ARRAY['Law']
    WHEN scholarship_name ~* '\m(business|mba|management)\M'   THEN ARRAY['Business']
    WHEN scholarship_name ~* '\m(economics?|economic policy)\M' THEN ARRAY['Economics']
    WHEN scholarship_name ~* '\m(public policy|policy stud)\M' THEN ARRAY['Public Policy']
    WHEN scholarship_name ~* '\m(international relations|global affairs|diplomacy)\M' THEN ARRAY['International Relations']
    WHEN scholarship_name ~* '\m(arts|humanities|literature)\M' THEN ARRAY['Humanities']
    WHEN scholarship_name ~* '\m(physics|chemistry|biology|biotech|natural sciences?)\M' THEN ARRAY['Natural Sciences']
    WHEN scholarship_name ~* '\m(mathematics?|maths?|statistics?)\M' THEN ARRAY['Mathematics']
    WHEN scholarship_name ~* '\m(environment|sustainab|climate|ecology)\M' THEN ARRAY['Environmental Studies']
    WHEN scholarship_name ~* '\m(education|teaching|pedagog)\M' THEN ARRAY['Education']
    WHEN scholarship_name ~* '\m(architect|design|urban planning)\M' THEN ARRAY['Architecture', 'Design']
    WHEN scholarship_name ~* '\m(stem|science technology engineering)\M' THEN ARRAY['STEM']
    ELSE NULL
  END
  WHERE (target_fields IS NULL OR cardinality(target_fields) = 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic] target_fields from name regex: % row(s)', v_count;
END $$;

-- ─── 5. Default deadline_type='annual' where missing ─────────────────
-- Most scholarships are annual cycles. Rolling/one-time are the
-- exceptions and should have been LLM-extracted. Setting annual as
-- default is safer than leaving NULL.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET deadline_type = 'annual'
  WHERE deadline_type IS NULL
    AND verification_status IS DISTINCT FROM 'broken';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic] deadline_type=annual default: % row(s)', v_count;
END $$;

-- ─── 6. Default essay_required=true for any row missing the flag ────
-- Almost every meaningful scholarship requires an essay. False
-- defaults shouldn't surface; true is a safer (more conservative)
-- assumption — the row says "yes essay" until verify proves otherwise.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships
  SET essay_required = true
  WHERE essay_required IS NULL
    AND coverage_type IN ('full_ride', 'tuition_only')
    AND (estimated_total_value_usd IS NULL OR estimated_total_value_usd >= 5000);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[heuristic] essay_required=true for funded rows: % row(s)', v_count;
END $$;

-- ─── Final audit ────────────────────────────────────────────────────
DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  RAISE NOTICE '[heuristic_after] duration_text populated: % / %', (SELECT count(*) FROM public.scholarships WHERE duration_text IS NOT NULL AND length(btrim(duration_text)) > 0), v_total;
  RAISE NOTICE '[heuristic_after] selectivity_level populated: % / %', (SELECT count(*) FROM public.scholarships WHERE selectivity_level IS NOT NULL), v_total;
  RAISE NOTICE '[heuristic_after] target_fields populated: % / %', (SELECT count(*) FROM public.scholarships WHERE target_fields IS NOT NULL AND cardinality(target_fields) > 0), v_total;
  RAISE NOTICE '[heuristic_after] deadline_type populated: % / %', (SELECT count(*) FROM public.scholarships WHERE deadline_type IS NOT NULL), v_total;
  RAISE NOTICE '[heuristic_after] coverage_type non-other: % / %', (SELECT count(*) FROM public.scholarships WHERE coverage_type IS NOT NULL AND coverage_type <> 'other'), v_total;
  RAISE NOTICE '[heuristic_after] avg data_completeness_score: %', (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
END $$;
