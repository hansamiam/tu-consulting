-- =============================================================================
-- Audit — is canonical-URL scraping actually wired up end-to-end?
-- =============================================================================
-- User wants honest answer to: "did you truly improve canonical scraping?"
-- Diagnostic-only — no mutations.
-- =============================================================================

DO $$
DECLARE
  v_paf_count int;
  v_paf_states_active int;
  v_paf_states_discontinued int;
  v_paf_states_between int;
  v_paf_with_url int;
  v_providers_count int;
  v_scholarships_with_canonical_provider int;
  v_cron_count int;
  v_truth_probe_scheduled int;
  v_app_token_set int;
BEGIN
  -- Registry table size
  BEGIN
    SELECT count(*) INTO v_paf_count FROM public.provider_authoritative_facts;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE '[scraping_audit] ❌ provider_authoritative_facts TABLE DOES NOT EXIST';
    RETURN;
  END;
  RAISE NOTICE '[scraping_audit] provider_authoritative_facts rows: %', v_paf_count;

  -- States distribution
  SELECT count(*) INTO v_paf_states_active       FROM public.provider_authoritative_facts WHERE lifecycle_state = 'active';
  SELECT count(*) INTO v_paf_states_discontinued FROM public.provider_authoritative_facts WHERE lifecycle_state = 'discontinued';
  SELECT count(*) INTO v_paf_states_between      FROM public.provider_authoritative_facts WHERE lifecycle_state = 'between_cycles';
  SELECT count(*) INTO v_paf_with_url            FROM public.provider_authoritative_facts WHERE canonical_url IS NOT NULL AND length(btrim(canonical_url)) > 8;

  RAISE NOTICE '[scraping_audit] active=%, discontinued=%, between_cycles=%, with_canonical_url=%/%',
    v_paf_states_active, v_paf_states_discontinued, v_paf_states_between, v_paf_with_url, v_paf_count;

  -- Provider linkage to scholarships
  SELECT count(*) INTO v_providers_count FROM public.providers;

  SELECT count(*) INTO v_scholarships_with_canonical_provider
  FROM public.scholarships s
  WHERE s.provider_id IN (
    SELECT p.provider_id FROM public.providers p
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  );

  RAISE NOTICE '[scraping_audit] providers total: %, scholarships linked to a registry-tracked funder: %',
    v_providers_count, v_scholarships_with_canonical_provider;

  -- Cron status
  BEGIN
    SELECT count(*) INTO v_cron_count FROM cron.job;
    SELECT count(*) INTO v_truth_probe_scheduled FROM cron.job WHERE jobname = 'funder-truth-probe-cron';
    RAISE NOTICE '[scraping_audit] pg_cron jobs total: %, funder-truth-probe scheduled: %',
      v_cron_count, v_truth_probe_scheduled;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
    RAISE NOTICE '[scraping_audit] cron schema not readable from this role — cron may still be scheduled';
  END;

  -- app.cron_token GUC
  v_app_token_set := CASE WHEN current_setting('app.cron_token', true) IS NOT NULL
                          AND length(btrim(current_setting('app.cron_token', true))) > 0 THEN 1 ELSE 0 END;
  RAISE NOTICE '[scraping_audit] app.cron_token GUC set: %', CASE WHEN v_app_token_set = 1 THEN 'YES' ELSE 'NO — crons cannot fire HTTP calls' END;

  -- Sample known-trouble rows from registry
  RAISE NOTICE '─── Sample of registry entries ───';
  RAISE NOTICE '[reg] Top 5 by lifecycle_state distribution:';
END $$;

DO $$
DECLARE r record; v_i int := 0;
BEGIN
  FOR r IN
    SELECT provider_slug, lifecycle_state, canonical_url
    FROM public.provider_authoritative_facts
    ORDER BY provider_slug
    LIMIT 8
  LOOP
    v_i := v_i + 1;
    RAISE NOTICE '[reg %] slug=% | state=% | url=%',
      v_i, r.provider_slug, r.lifecycle_state,
      left(coalesce(r.canonical_url, '∅'), 50);
  END LOOP;
END $$;
