-- =============================================================================
-- Per-field completeness audit — diagnostic output only
-- =============================================================================
-- Surfaces what % of rows have each critical field populated. Read the
-- push log to see which fields are most under-filled across the catalog.
-- =============================================================================

DO $$
DECLARE
  v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;

  RAISE NOTICE '[field_audit] total rows: %', v_total;
  RAISE NOTICE '[field_audit] application_deadline populated: % / %', (SELECT count(*) FROM public.scholarships WHERE application_deadline IS NOT NULL), v_total;
  RAISE NOTICE '[field_audit] estimated_total_value_usd populated: % / %', (SELECT count(*) FROM public.scholarships WHERE estimated_total_value_usd IS NOT NULL AND estimated_total_value_usd > 0), v_total;
  RAISE NOTICE '[field_audit] award_amount_text populated: % / %', (SELECT count(*) FROM public.scholarships WHERE award_amount_text IS NOT NULL AND length(btrim(award_amount_text)) > 0), v_total;
  RAISE NOTICE '[field_audit] eligible_countries populated: % / %', (SELECT count(*) FROM public.scholarships WHERE eligible_countries IS NOT NULL AND cardinality(eligible_countries) > 0), v_total;
  RAISE NOTICE '[field_audit] citizenship_requirements populated: % / %', (SELECT count(*) FROM public.scholarships WHERE citizenship_requirements IS NOT NULL AND length(btrim(citizenship_requirements)) > 0), v_total;
  RAISE NOTICE '[field_audit] eligibility_requirements populated: % / %', (SELECT count(*) FROM public.scholarships WHERE eligibility_requirements IS NOT NULL AND length(btrim(eligibility_requirements)) > 0), v_total;
  RAISE NOTICE '[field_audit] target_degree_level populated: % / %', (SELECT count(*) FROM public.scholarships WHERE target_degree_level IS NOT NULL AND cardinality(target_degree_level) > 0), v_total;
  RAISE NOTICE '[field_audit] target_fields populated: % / %', (SELECT count(*) FROM public.scholarships WHERE target_fields IS NOT NULL AND cardinality(target_fields) > 0), v_total;
  RAISE NOTICE '[field_audit] official_url populated: % / %', (SELECT count(*) FROM public.scholarships WHERE official_url IS NOT NULL AND length(btrim(official_url)) > 8), v_total;
  RAISE NOTICE '[field_audit] why_this_fits populated: % / %', (SELECT count(*) FROM public.scholarships WHERE why_this_fits IS NOT NULL AND length(btrim(why_this_fits)) > 30), v_total;
  RAISE NOTICE '[field_audit] ideal_candidate_profile populated: % / %', (SELECT count(*) FROM public.scholarships WHERE ideal_candidate_profile IS NOT NULL AND length(btrim(ideal_candidate_profile)) > 30), v_total;
  RAISE NOTICE '[field_audit] how_to_win populated: % / %', (SELECT count(*) FROM public.scholarships WHERE how_to_win IS NOT NULL AND length(btrim(how_to_win)) > 30), v_total;
  RAISE NOTICE '[field_audit] selectivity_level populated: % / %', (SELECT count(*) FROM public.scholarships WHERE selectivity_level IS NOT NULL), v_total;
  RAISE NOTICE '[field_audit] duration_text populated: % / %', (SELECT count(*) FROM public.scholarships WHERE duration_text IS NOT NULL AND length(btrim(duration_text)) > 0), v_total;
  RAISE NOTICE '[field_audit] cover_image_url populated: % / %', (SELECT count(*) FROM public.scholarships WHERE cover_image_url IS NOT NULL AND length(btrim(cover_image_url)) > 8), v_total;
  RAISE NOTICE '[field_audit] avg data_completeness_score: %', (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
  RAISE NOTICE '[field_audit] median data_completeness_score: %', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY data_completeness_score) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
END $$;
