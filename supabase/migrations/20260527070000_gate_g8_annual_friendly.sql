-- Catalog ops 2026-05-27: loosen G8a + G8b so annual-cycle scholarships
-- don't drop out of the catalog between cycles.
--
-- Background. Pearson + 86 other annual programs were getting gated
-- on G8a because `application_deadline IS NULL` AND `deadline_type != 'rolling'`.
-- These are real, in-cycle scholarships that just don't have a current
-- open date posted on their site (typical for annual programs between
-- November of year N's deadline and the year N+1 announcement). The
-- canonical extractor + URL health checker both confirm the row is
-- valid; only the absence of a forward deadline triggered the cut.
--
-- Same story for G8b (past deadline): an annual program whose 2025-11-07
-- deadline has passed but whose 2026 cycle hasn't been announced yet is
-- still a real listing the catalog should carry. Reverse the cut for
-- annual programs.
--
-- Discover-side caveat: rows with deadline=NULL render "No deadline
-- posted" in the sheet. That's intentional graceful degrade; users
-- still see the program + apply URL. A follow-up UI pass can replace
-- with "Annual cycle — next deadline TBA" once the canonical extractor
-- starts pulling cycle metadata.

CREATE OR REPLACE FUNCTION public.evaluate_publish_gate_for(p_scholarship_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_fail_reason TEXT;
  v_row RECORD;
BEGIN
  SELECT * INTO v_row FROM public.scholarships WHERE scholarship_id = p_scholarship_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Sticky admin decisions: if an admin set the rejection reason
  -- (prefixed audience_/admin_), the machine gate eval does NOT
  -- overwrite it — regardless of whether the machine gates pass
  -- or fail. Admin cuts are deliberate human judgment that the
  -- catalog should respect even when data quality changes.
  IF v_row.gate_fail_reason IS NOT NULL
     AND v_row.gate_fail_reason ~ '^(audience_|admin_)' THEN
    UPDATE public.scholarships
    SET last_gate_checked_at = now()
    WHERE scholarship_id = p_scholarship_id;
    RETURN;
  END IF;

  v_fail_reason :=
    CASE
      WHEN v_row.scholarship_name IS NULL OR length(v_row.scholarship_name) < 10 OR v_row.scholarship_name ILIKE '%untitled%' THEN 'G1'
      WHEN v_row.provider_name IS NULL OR v_row.provider_name = '' THEN 'G2'
      WHEN COALESCE(v_row.canonical_official_url, v_row.official_url) IS NULL THEN 'G3a'
      WHEN public.is_aggregator_url(COALESCE(v_row.canonical_official_url, v_row.official_url)) THEN 'G3b'
      WHEN v_row.url_consecutive_fails > 0 THEN 'G3c'
      WHEN v_row.coverage_type NOT IN ('full_ride','tuition_only','stipend','partial') OR v_row.coverage_type IS NULL THEN 'G4'
      WHEN COALESCE(v_row.award_amount_text,'') = '' AND COALESCE(v_row.estimated_total_value_usd,0) <= 0 THEN 'G5'
      WHEN v_row.target_degree_level IS NULL OR array_length(v_row.target_degree_level,1) IS NULL THEN 'G6'
      WHEN v_row.host_country IS NULL OR v_row.host_country = '' THEN 'G7'
      -- 2026-05-27: G8a + G8b now also pass for annual programs.
      -- An annual scholarship between cycles has no forward deadline
      -- yet but is still a real listing.
      WHEN v_row.application_deadline IS NULL
           AND COALESCE(v_row.deadline_type,'') NOT IN ('rolling','annual') THEN 'G8a'
      WHEN v_row.application_deadline IS NOT NULL
           AND v_row.application_deadline < CURRENT_DATE
           AND COALESCE(v_row.deadline_type,'') NOT IN ('rolling','annual') THEN 'G8b'
      WHEN v_row.verification_status NOT IN ('verified','auto_high_confidence') OR v_row.verification_status IS NULL THEN 'G9a'
      WHEN v_row.last_verified_at IS NULL OR v_row.last_verified_at < now() - INTERVAL '90 days' THEN 'G9b'
      WHEN COALESCE(v_row.lifecycle_status,'active') != 'active' THEN 'G10'
      WHEN v_row.data_source ILIKE 'manus_%' THEN 'G11'
      ELSE NULL
    END;

  UPDATE public.scholarships
  SET is_published = (v_fail_reason IS NULL),
      gate_fail_reason = v_fail_reason,
      last_gate_checked_at = now()
  WHERE scholarship_id = p_scholarship_id;
END;
$$;

COMMENT ON FUNCTION public.evaluate_publish_gate_for(UUID) IS
  'Runs G1-G11 publish gate logic on a single scholarship row. Called by '
  'verify-scholarship after each successful re-verification so is_published '
  'tracks the row''s current state. Preserves admin-set "audience_*" / '
  '"admin_*" rejection reasons even when machine gates would otherwise pass. '
  '2026-05-27: G8a + G8b accept annual programs without a forward deadline.';

-- Backfill: re-run the gate on every row currently failing G8a/G8b so
-- the ~88 annual rows surface immediately instead of waiting for the
-- verify-scholarship cron to touch each one.
DO $$
DECLARE
  v_id UUID;
  v_count INT := 0;
BEGIN
  FOR v_id IN
    SELECT scholarship_id FROM public.scholarships
    WHERE gate_fail_reason IN ('G8a','G8b')
      AND deadline_type IN ('annual','rolling')
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Re-evaluated % G8-blocked annual rows', v_count;
END $$;
