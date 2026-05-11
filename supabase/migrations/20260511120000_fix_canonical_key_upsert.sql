-- THE SILENT-FAILURE BUG.
--
-- scrape-source's auto-publish path runs
--   supabase.from("scholarships").upsert(payload, { onConflict: "canonical_key" })
-- supabase-js generates a SQL of the form
--   INSERT ... ON CONFLICT (canonical_key) DO UPDATE ...
-- which requires PostgreSQL to find a unique constraint or unique
-- index on canonical_key whose predicate (if any) matches.
--
-- The existing index was created PARTIAL:
--   CREATE UNIQUE INDEX uniq_scholarships_canonical_key
--     ON public.scholarships(canonical_key)
--     WHERE canonical_key IS NOT NULL;
-- For ON CONFLICT to use a partial index, the statement must include
-- a matching WHERE clause — which supabase-js never emits. Postgres
-- therefore fails the upsert with
--   "there is no unique or exclusion constraint matching the ON
--    CONFLICT specification"
-- but scrape-source catches the error in a `continue` block (silent
-- swallow), and the only visible symptom is staging rows piling up
-- with status='auto_published' while public.scholarships stays empty
-- of those rows.
--
-- This was the root cause of the user's "missing recent scholarships
-- from opportunitiesforyouth.org / opportunitytracker.ug" complaint
-- the whole afternoon — auth was wrong AND, even after the auth fix,
-- the upsert silently no-op'd.
--
-- Fix: drop the partial index, replace with a non-partial one.
-- PostgreSQL's UNIQUE NULLS DISTINCT semantics (the default behavior
-- across PG versions) means multiple NULL canonical_key values are
-- still allowed; only non-null values are checked for uniqueness —
-- exactly the behavior the partial index was emulating, just now
-- expressed in a form ON CONFLICT can use.

DROP INDEX IF EXISTS public.uniq_scholarships_canonical_key;

-- Recreate as non-partial. Existing data was already kept unique
-- on non-null canonical_key by the partial index, so this can't
-- find duplicates to choke on.
CREATE UNIQUE INDEX uniq_scholarships_canonical_key
  ON public.scholarships(canonical_key);

COMMENT ON INDEX public.uniq_scholarships_canonical_key IS
  'Unique on canonical_key. Non-partial so supabase-js upsert with
   onConflict=canonical_key can use it as the conflict target. Null
   canonical_key values are allowed to repeat (standard PG UNIQUE
   nulls-distinct behavior).';

-- Now retry the Ferguson promotion. Should land cleanly this time.
DO $$
DECLARE
  v_parsed jsonb;
  v_source_url text := 'https://opportunitiesforyouth.org/2026/05/09/ferguson-scholarship-2026-at-aston-university-fully-funded-masters-opportunity-for-students-from-africa-and-india/';
  v_err text;
BEGIN
  SELECT stg.parsed_data INTO v_parsed
  FROM public.scholarships_staging stg
  JOIN public.scholarship_sources src USING (source_id)
  WHERE src.url = v_source_url
    AND stg.status = 'auto_published'
  ORDER BY stg.created_at DESC
  LIMIT 1;

  IF v_parsed IS NULL THEN
    RAISE NOTICE 'No staging row to promote';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.scholarships (
      scholarship_name, provider_name, host_country, official_url, source_url,
      coverage_type, award_amount_text, estimated_total_value_usd, duration_text,
      target_degree_level, target_fields, eligible_countries, citizenship_requirements,
      application_deadline, deadline_type, essay_required,
      recommendation_letters_required, interview_required,
      selectivity_level, effort_level, ideal_candidate_profile, weak_candidate_warning,
      best_for_tags, target_demographics, why_this_fits, how_to_win,
      what_to_prepare_first, eligibility_requirements,
      confidence, verified, last_verified_at, last_verified_date, verification_status
    ) VALUES (
      v_parsed->>'scholarship_name', v_parsed->>'provider_name', v_parsed->>'host_country',
      COALESCE(v_parsed->>'official_url', v_source_url), v_source_url,
      v_parsed->>'coverage_type', v_parsed->>'award_amount_text',
      (v_parsed->>'estimated_total_value_usd')::numeric, v_parsed->>'duration_text',
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'target_degree_level')),
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'target_fields')),
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'eligible_countries')),
      v_parsed->>'citizenship_requirements',
      (v_parsed->>'application_deadline')::date,
      v_parsed->>'deadline_type', (v_parsed->>'essay_required')::boolean,
      (v_parsed->>'recommendation_letters_required')::int,
      (v_parsed->>'interview_required')::boolean,
      v_parsed->>'selectivity_level', v_parsed->>'effort_level',
      v_parsed->>'ideal_candidate_profile', v_parsed->>'weak_candidate_warning',
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'best_for_tags')),
      ARRAY(SELECT jsonb_array_elements_text(v_parsed->'target_demographics')),
      v_parsed->>'why_this_fits', v_parsed->>'how_to_win',
      v_parsed->>'what_to_prepare_first', v_parsed->>'eligibility_requirements',
      (v_parsed->>'confidence')::numeric,
      false, now(), CURRENT_DATE, 'pending'
    )
    ON CONFLICT (canonical_key) DO UPDATE SET
      updated_at = now();
    RAISE NOTICE 'Ferguson inserted/updated cleanly';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    RAISE NOTICE 'INSERT STILL FAILING: %', v_err;
  END;
END $$;

-- Re-fire the scrape pipeline so all the other staging rows that
-- were stuck behind this bug get a chance to insert successfully.
SELECT net.http_post(
  url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/scrape-cron-dispatcher',
  headers := jsonb_build_object(
    'apikey',       public.app_cron_token(),
    'Content-Type', 'application/json'
  ),
  body    := jsonb_build_object('force_all', true)
);
