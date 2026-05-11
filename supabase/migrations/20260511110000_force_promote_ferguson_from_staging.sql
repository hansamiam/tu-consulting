-- The Ferguson Scholarship staging row landed with status='auto_published'
-- and confidence=0.95 but never made it into public.scholarships — meaning
-- scrape-source's upsert into the live table errored silently (the code
-- console.warns and continues). Force-publish from the staging row's
-- parsed_data so the user can see it on Discover, and capture any error
-- via DO block so we know exactly what's failing for next time.

DO $$
DECLARE
  v_parsed jsonb;
  v_source_url text := 'https://opportunitiesforyouth.org/2026/05/09/ferguson-scholarship-2026-at-aston-university-fully-funded-masters-opportunity-for-students-from-africa-and-india/';
  v_err text;
BEGIN
  -- Grab the latest auto_published staging row for Ferguson
  SELECT stg.parsed_data INTO v_parsed
  FROM public.scholarships_staging stg
  JOIN public.scholarship_sources src USING (source_id)
  WHERE src.url = v_source_url
    AND stg.status = 'auto_published'
  ORDER BY stg.created_at DESC
  LIMIT 1;

  IF v_parsed IS NULL THEN
    RAISE NOTICE 'No auto_published staging row found for Ferguson';
    RETURN;
  END IF;

  -- Insert into scholarships. Catch any exception and re-raise as
  -- a notice so the migration log shows the exact reason.
  BEGIN
    INSERT INTO public.scholarships (
      scholarship_name,
      provider_name,
      host_country,
      official_url,
      source_url,
      coverage_type,
      award_amount_text,
      estimated_total_value_usd,
      duration_text,
      target_degree_level,
      target_fields,
      eligible_countries,
      citizenship_requirements,
      application_deadline,
      deadline_type,
      essay_required,
      recommendation_letters_required,
      interview_required,
      selectivity_level,
      effort_level,
      ideal_candidate_profile,
      weak_candidate_warning,
      best_for_tags,
      target_demographics,
      why_this_fits,
      how_to_win,
      what_to_prepare_first,
      eligibility_requirements,
      confidence,
      verified,
      last_verified_at,
      last_verified_date,
      verification_status
    ) VALUES (
      v_parsed->>'scholarship_name',
      v_parsed->>'provider_name',
      v_parsed->>'host_country',
      COALESCE(v_parsed->>'official_url', v_source_url),
      v_source_url,
      v_parsed->>'coverage_type',
      v_parsed->>'award_amount_text',
      (v_parsed->>'estimated_total_value_usd')::numeric,
      v_parsed->>'duration_text',
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'target_degree_level')),
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'target_fields')),
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'eligible_countries')),
      v_parsed->>'citizenship_requirements',
      (v_parsed->>'application_deadline')::date,
      v_parsed->>'deadline_type',
      (v_parsed->>'essay_required')::boolean,
      (v_parsed->>'recommendation_letters_required')::int,
      (v_parsed->>'interview_required')::boolean,
      v_parsed->>'selectivity_level',
      v_parsed->>'effort_level',
      v_parsed->>'ideal_candidate_profile',
      v_parsed->>'weak_candidate_warning',
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'best_for_tags')),
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'target_demographics')),
      v_parsed->>'why_this_fits',
      v_parsed->>'how_to_win',
      v_parsed->>'what_to_prepare_first',
      v_parsed->>'eligibility_requirements',
      (v_parsed->>'confidence')::numeric,
      false,
      now(),
      CURRENT_DATE,
      'pending'
    )
    ON CONFLICT (canonical_key) DO NOTHING;
    RAISE NOTICE 'Ferguson inserted successfully';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    RAISE NOTICE 'INSERT FAILED: %', v_err;
  END;
END $$;
