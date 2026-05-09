-- =============================================================================
-- Chevening — apply verified 2027/28 deadline
-- =============================================================================
-- 20260509090000 set Chevening's application_deadline to 2026-11-05 as a
-- conservative "first Tuesday of November" guess. The verified date for
-- the 2027/28 cycle (per chevening.org/scholarships/application-timeline,
-- checked 2026-05-09) is 2026-10-07 — about a month earlier.
--
-- The earlier file's source has been updated to 2026-10-07 too, but
-- 090000 is already in the migration ledger so its body won't re-run.
-- This delta migration lands the corrected date in production.
-- =============================================================================

DO $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.scholarships
  SET application_deadline = '2026-10-07'::date,
      risk_note = 'Between cycles. The 2027/28 application window opens August 2026 and closes 7 October 2026 (verified at chevening.org).',
      last_verified_at = now()
  WHERE (scholarship_name ILIKE '%chevening%' OR provider_name ILIKE '%chevening%')
    AND verification_status IS DISTINCT FROM 'broken';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[chevening_deadline_correction] % row(s) updated to 2026-10-07', v_count;
END $$;
