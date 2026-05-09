-- =============================================================================
-- Post-heuristic audit — measure where we stand after 3 backfill passes
-- =============================================================================

DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;

  RAISE NOTICE '─── Catalog completeness audit (post heuristic backfills) ───';
  RAISE NOTICE 'total rows: %', v_total;
  RAISE NOTICE '';
  RAISE NOTICE 'Score-bearing fields:';
  RAISE NOTICE '  scholarship_name           % / %', (SELECT count(*) FROM public.scholarships WHERE scholarship_name IS NOT NULL), v_total;
  RAISE NOTICE '  provider_name              % / %', (SELECT count(*) FROM public.scholarships WHERE provider_name IS NOT NULL), v_total;
  RAISE NOTICE '  host_country               % / %', (SELECT count(*) FROM public.scholarships WHERE host_country IS NOT NULL), v_total;
  RAISE NOTICE '  coverage_type              % / %', (SELECT count(*) FROM public.scholarships WHERE coverage_type IS NOT NULL), v_total;
  RAISE NOTICE '  official_url               % / %', (SELECT count(*) FROM public.scholarships WHERE official_url IS NOT NULL AND length(btrim(official_url)) > 8), v_total;
  RAISE NOTICE '  application_deadline       % / %  ← STILL THIN', (SELECT count(*) FROM public.scholarships WHERE application_deadline IS NOT NULL), v_total;
  RAISE NOTICE '  deadline_type              % / %', (SELECT count(*) FROM public.scholarships WHERE deadline_type IS NOT NULL AND deadline_type <> 'unknown'), v_total;
  RAISE NOTICE '  estimated_total_value_usd  % / %', (SELECT count(*) FROM public.scholarships WHERE estimated_total_value_usd IS NOT NULL AND estimated_total_value_usd > 0), v_total;
  RAISE NOTICE '  award_amount_text          % / %', (SELECT count(*) FROM public.scholarships WHERE award_amount_text IS NOT NULL AND length(btrim(award_amount_text)) > 0), v_total;
  RAISE NOTICE '  target_degree_level        % / %', (SELECT count(*) FROM public.scholarships WHERE target_degree_level IS NOT NULL AND cardinality(target_degree_level) > 0), v_total;
  RAISE NOTICE '  target_fields              % / %', (SELECT count(*) FROM public.scholarships WHERE target_fields IS NOT NULL AND cardinality(target_fields) > 0), v_total;
  RAISE NOTICE '  eligible_countries         % / %', (SELECT count(*) FROM public.scholarships WHERE eligible_countries IS NOT NULL AND cardinality(eligible_countries) > 0), v_total;
  RAISE NOTICE '  citizenship_requirements   % / %', (SELECT count(*) FROM public.scholarships WHERE citizenship_requirements IS NOT NULL AND length(btrim(citizenship_requirements)) > 0), v_total;
  RAISE NOTICE '  eligibility_requirements   % / %', (SELECT count(*) FROM public.scholarships WHERE eligibility_requirements IS NOT NULL AND length(btrim(eligibility_requirements)) > 0), v_total;
  RAISE NOTICE '  ideal_candidate_profile≥60 % / %  ← LLM GAP', (SELECT count(*) FROM public.scholarships WHERE ideal_candidate_profile IS NOT NULL AND length(btrim(ideal_candidate_profile)) >= 60), v_total;
  RAISE NOTICE '  why_this_fits ≥60          % / %  ← LLM GAP', (SELECT count(*) FROM public.scholarships WHERE why_this_fits IS NOT NULL AND length(btrim(why_this_fits)) >= 60), v_total;
  RAISE NOTICE '  how_to_win ≥60             % / %  ← LLM GAP', (SELECT count(*) FROM public.scholarships WHERE how_to_win IS NOT NULL AND length(btrim(how_to_win)) >= 60), v_total;
  RAISE NOTICE '  cover_image_url            % / %', (SELECT count(*) FROM public.scholarships WHERE cover_image_url IS NOT NULL AND length(btrim(cover_image_url)) > 8), v_total;
  RAISE NOTICE '';
  RAISE NOTICE 'Verification status:';
  RAISE NOTICE '  verified                   %', (SELECT count(*) FROM public.scholarships WHERE verification_status = 'verified');
  RAISE NOTICE '  stale                      % (queued for verify-cron drain)', (SELECT count(*) FROM public.scholarships WHERE verification_status = 'stale');
  RAISE NOTICE '  pending                    %', (SELECT count(*) FROM public.scholarships WHERE verification_status = 'pending');
  RAISE NOTICE '  broken                     %', (SELECT count(*) FROM public.scholarships WHERE verification_status = 'broken');
  RAISE NOTICE '';
  RAISE NOTICE 'Composite signals:';
  RAISE NOTICE '  avg data_completeness_score    %', (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
  RAISE NOTICE '  median data_completeness_score %', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY data_completeness_score) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
  RAISE NOTICE '  rows ≥14/18 (78%%)             %', (SELECT count(*) FROM public.scholarships WHERE data_completeness_score >= 14);
  RAISE NOTICE '  rows ≥10/18 (56%%)             %', (SELECT count(*) FROM public.scholarships WHERE data_completeness_score >= 10);
  RAISE NOTICE '  rows  <8/18 (44%%)             %', (SELECT count(*) FROM public.scholarships WHERE data_completeness_score < 8);
END $$;
