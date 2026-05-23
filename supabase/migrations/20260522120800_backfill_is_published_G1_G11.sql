-- Discover v1 — Phase A.6 backfill
--
-- Applied 2026-05-23 against live DB via Supabase MCP. Result: 20 rows
-- published, 563 unpublished with gate_fail_reason stamped. Catalog target
-- of 30+ requires follow-up data-quality work (re-verifying G9a rejects,
-- repairing G3b aggregator-URL pollution by expanding is_aggregator_url()).
--
-- Applies the Tight publish gate G1–G11 (plan D7) against every row in
-- public.scholarships, setting is_published + gate_fail_reason accordingly.
--
-- Rules (any failure → is_published=false + gate_fail_reason set):
--   G1: scholarship_name non-empty, ≥10 chars, no "Untitled"
--   G2: provider_name non-empty
--   G3: official_url non-null, NOT aggregator domain, url_consecutive_fails=0
--       (HTTP-200-within-30-days check deferred to runtime cron)
--   G4: coverage_type ∈ {full_ride, tuition_only, stipend, partial}
--   G5: award_amount_text non-empty OR estimated_total_value_usd > 0
--   G6: target_degree_level array non-empty
--   G7: host_country non-null
--   G8: deadline freshness (future, rolling, or reopens_annually within 12mo)
--   G9: verification_status ∈ {verified, auto_high_confidence}
--       AND last_verified_at within 90 days
--   G10: lifecycle_status = 'active'
--   G11: data_source NOT IN ('manus_ai_2026_05_03', 'manus_ai_*') — Manus deprecated

-- Helper: regex pattern for known aggregator domains (mirrors scrape-source guard)
DO $$ DECLARE _ TEXT; BEGIN _ := '(opportunitiesforyouth|opportunitiestracker|scholars4dev|opportunitiesforafricans|opportunitydesk|scholarshippanda|iefa|mladiinfo|profellow|fastweb|scholarshipportal|scholarshipsads|opportunitiescorner|afterschoolafrica|topuniversities|studyportals|iie\.org)\.'; END $$;

WITH gate_eval AS (
  SELECT
    scholarship_id,
    CASE
      WHEN scholarship_name IS NULL
        OR length(scholarship_name) < 10
        OR scholarship_name ILIKE '%untitled%'
        OR scholarship_name ~ '^\s*$'
        THEN 'G1: scholarship_name junk or missing'

      WHEN provider_name IS NULL OR provider_name = ''
        THEN 'G2: provider_name missing'

      WHEN COALESCE(canonical_official_url, official_url) IS NULL
        THEN 'G3a: official_url missing'
      WHEN COALESCE(canonical_official_url, official_url) ~* '(opportunitiesforyouth|opportunitiestracker|scholars4dev|opportunitiesforafricans|opportunitydesk|scholarshippanda|iefa|mladiinfo|profellow|fastweb|scholarshipportal|scholarshipsads|opportunitiescorner|afterschoolafrica|topuniversities|studyportals|iie\.org)\.'
        THEN 'G3b: official_url is aggregator domain'
      WHEN url_consecutive_fails > 0
        THEN 'G3c: url_consecutive_fails > 0'

      WHEN coverage_type IS NULL
        OR coverage_type NOT IN ('full_ride', 'tuition_only', 'stipend', 'partial')
        THEN 'G4: coverage_type missing or invalid'

      WHEN COALESCE(award_amount_text, '') = ''
        AND COALESCE(estimated_total_value_usd, 0) <= 0
        THEN 'G5: no funding info (amount text + USD both empty)'

      WHEN target_degree_level IS NULL OR array_length(target_degree_level, 1) IS NULL
        THEN 'G6: target_degree_level empty'

      WHEN host_country IS NULL OR host_country = ''
        THEN 'G7: host_country missing'

      WHEN application_deadline IS NULL
        AND COALESCE(deadline_type, '') != 'rolling'
        AND NOT (lifecycle_status = 'reopens_annually' AND next_open_at IS NOT NULL AND next_open_at <= now() + INTERVAL '12 months')
        THEN 'G8a: no deadline / no rolling / no upcoming reopen'
      WHEN application_deadline IS NOT NULL
        AND application_deadline < CURRENT_DATE
        AND COALESCE(deadline_type, '') != 'rolling'
        AND NOT (lifecycle_status = 'reopens_annually' AND next_open_at IS NOT NULL AND next_open_at <= now() + INTERVAL '12 months')
        THEN 'G8b: deadline expired, not rolling, no reopen'

      WHEN verification_status IS NULL
        OR verification_status NOT IN ('verified', 'auto_high_confidence')
        THEN 'G9a: verification_status not verified'
      WHEN last_verified_at IS NULL OR last_verified_at < now() - INTERVAL '90 days'
        THEN 'G9b: last_verified_at stale (>90d)'

      WHEN COALESCE(lifecycle_status, 'active') != 'active'
        THEN 'G10: lifecycle_status not active'

      WHEN data_source ILIKE 'manus_%'
        THEN 'G11: data_source is Manus dump (excluded per F10)'

      ELSE NULL  -- passes all gates
    END AS fail_reason
  FROM public.scholarships
)
UPDATE public.scholarships s
SET is_published = (g.fail_reason IS NULL),
    gate_fail_reason = g.fail_reason,
    last_gate_checked_at = now(),
    updated_at = now()
FROM gate_eval g
WHERE s.scholarship_id = g.scholarship_id;

-- Sanity log
DO $$
DECLARE
  v_published INT;
  v_unpublished INT;
  v_no_reason INT;
BEGIN
  SELECT COUNT(*) INTO v_published FROM public.scholarships WHERE is_published = true;
  SELECT COUNT(*) INTO v_unpublished FROM public.scholarships WHERE is_published = false;
  SELECT COUNT(*) INTO v_no_reason FROM public.scholarships WHERE is_published = false AND gate_fail_reason IS NULL;

  RAISE NOTICE 'Publish gate backfill: % published, % unpublished. % unpublished rows have NULL gate_fail_reason (should be 0).',
    v_published, v_unpublished, v_no_reason;

  IF v_no_reason > 0 THEN
    RAISE WARNING 'Some unpublished rows have NULL gate_fail_reason — gate logic gap.';
  END IF;

  IF v_published < 30 THEN
    RAISE WARNING 'Published count is below 30 (%) — catalog will feel thin. Consider relaxing G9b staleness or running discover-from-hub-backfill first.', v_published;
  END IF;
END $$;
