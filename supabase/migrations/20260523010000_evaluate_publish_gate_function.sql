-- Silent failure #4 found 2026-05-23: is_published defaults to false, and
-- nothing periodically re-runs the G1-G11 publish gate. Rows could become
-- verified + active over time, but is_published only got stamped when
-- somebody manually executed the gate backfill migration. So:
--
--   1. scrape-source inserts new row with is_published=false (column default)
--   2. verify-cron eventually re-verifies, promotes to verification_status='verified'
--   3. My 2026-05-23 fix promotes lifecycle to 'active'
--   4. Row now passes every gate... but is_published stays false forever
--      because nothing re-runs the gate eval.
--
-- This function fixes that. Runs the G1-G11 gate logic on ONE scholarship
-- row, updating is_published + gate_fail_reason + last_gate_checked_at.
-- verify-scholarship calls it after each successful re-verify so the
-- publish flag tracks reality.
--
-- Uses public.is_aggregator_url() so the aggregator list stays in sync
-- with migration 20260523000000_expand_is_aggregator_url_domains.sql.
-- This is the only place the gate logic lives outside the original
-- backfill migration, so future gate changes update this function
-- (and the gate-recheck cron, when it exists).

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
  -- An admin can clear the cut by manually nulling gate_fail_reason
  -- and re-running this function. Pre-fix the preservation only
  -- triggered when machine gates passed, so a URL 404 on an
  -- admin-cut row would overwrite "audience_narrow_*" with "G3c"
  -- and lose the admin decision.
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
      WHEN v_row.application_deadline IS NULL AND COALESCE(v_row.deadline_type,'') != 'rolling' THEN 'G8a'
      WHEN v_row.application_deadline IS NOT NULL AND v_row.application_deadline < CURRENT_DATE AND COALESCE(v_row.deadline_type,'') != 'rolling' THEN 'G8b'
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
  '"admin_*" rejection reasons even when machine gates would otherwise pass.';
