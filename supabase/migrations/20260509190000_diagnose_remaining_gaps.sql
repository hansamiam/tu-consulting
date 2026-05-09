-- =============================================================================
-- Diagnostic — sample rows with persisting gaps to inform next heuristic pass
-- =============================================================================
-- 180000 backfill closed duration_text (186/213) and deadline_type (213/213)
-- but target_fields (66/213) and selectivity_level (99/213) still under-filled.
-- This migration only RAISES NOTICE — doesn't mutate anything. Read the push
-- log to see what scholarship_name patterns we're missing.
-- =============================================================================

DO $$
DECLARE r record; v_i int := 0;
BEGIN
  RAISE NOTICE '─── target_fields IS NULL — sample 25 rows ───';
  FOR r IN
    SELECT scholarship_name, target_degree_level, award_amount_text
    FROM public.scholarships
    WHERE target_fields IS NULL OR cardinality(target_fields) = 0
    ORDER BY data_completeness_score DESC NULLS LAST, random()
    LIMIT 25
  LOOP
    v_i := v_i + 1;
    RAISE NOTICE '[gap_target_fields %] name=% | degree=% | award=%',
      v_i, r.scholarship_name,
      array_to_string(r.target_degree_level, ','),
      left(coalesce(r.award_amount_text, '∅'), 60);
  END LOOP;
END $$;

DO $$
DECLARE r record; v_i int := 0;
BEGIN
  RAISE NOTICE '─── selectivity_level IS NULL — sample 15 rows ───';
  FOR r IN
    SELECT scholarship_name, estimated_total_value_usd, award_amount_text
    FROM public.scholarships
    WHERE selectivity_level IS NULL
    ORDER BY random()
    LIMIT 15
  LOOP
    v_i := v_i + 1;
    RAISE NOTICE '[gap_selectivity %] name=% | value=% | award=%',
      v_i, r.scholarship_name, r.estimated_total_value_usd,
      left(coalesce(r.award_amount_text, '∅'), 60);
  END LOOP;
END $$;

DO $$
DECLARE r record; v_i int := 0;
BEGIN
  RAISE NOTICE '─── application_deadline IS NULL — sample 15 rows ───';
  FOR r IN
    SELECT scholarship_name, deadline_type, verification_status, last_verified_at
    FROM public.scholarships
    WHERE application_deadline IS NULL
    ORDER BY random()
    LIMIT 15
  LOOP
    v_i := v_i + 1;
    RAISE NOTICE '[gap_deadline %] name=% | type=% | status=% | last_verified=%',
      v_i, r.scholarship_name,
      r.deadline_type, r.verification_status, r.last_verified_at;
  END LOOP;
END $$;

DO $$
DECLARE
  v_total int;
  v_award int;
  v_elig int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  SELECT count(*) INTO v_award FROM public.scholarships WHERE award_amount_text IS NOT NULL AND length(btrim(award_amount_text)) > 0;
  SELECT count(*) INTO v_elig FROM public.scholarships WHERE eligibility_requirements IS NOT NULL AND length(btrim(eligibility_requirements)) > 30;
  RAISE NOTICE '[supplementary] total=% | award_amount_text=% | eligibility_requirements=%',
    v_total, v_award, v_elig;
END $$;
