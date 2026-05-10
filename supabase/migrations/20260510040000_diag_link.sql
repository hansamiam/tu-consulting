-- Diagnose why pass-3 / seed-providers didn't link these rows.
DO $$
DECLARE r record; v_i int := 0;
BEGIN
  RAISE NOTICE '─── direct match test for ADB ───';
  FOR r IN
    SELECT s.scholarship_id, s.scholarship_name, s.provider_id AS cur_pid,
      (SELECT p.provider_id FROM public.providers p WHERE p.slug = 'asian-development-bank-japan') AS target_pid,
      ('Asian Development Bank-Japan Scholarship (ADB-JSP)' ~* 'asian\s+development\s+bank') AS regex_match
    FROM public.scholarships s
    WHERE s.scholarship_name ILIKE 'Asian Development Bank%'
  LOOP
    v_i := v_i + 1;
    RAISE NOTICE '[diag %] sid=% | name=% | cur_pid=% | target_pid=% | regex_match=%',
      v_i, r.scholarship_id, r.scholarship_name, r.cur_pid, r.target_pid, r.regex_match;
  END LOOP;
END $$;

-- Check whether the provider_authoritative_facts join fails for asian-dev-bank
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.providers p
  JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  WHERE p.slug = 'asian-development-bank-japan';
  RAISE NOTICE '[diag] providers ⋈ paf for asian-dev-bank-japan: %', v_count;
END $$;
