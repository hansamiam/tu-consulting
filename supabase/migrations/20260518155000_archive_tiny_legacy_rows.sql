-- 2026-05-18: cleanup 11 below-$3K legacy rows.
--   * 9 archive: tiny US-domestic essay contests / memorial scholarships
--     that predated the server-side $3K min-value gate.
--   * 3 fixes (Commonwealth Master's, alt Master's, PhD): their
--     estimated_total_value_usd had been mis-extracted as the £1452-£1781
--     MONTHLY stipend ($1844.04), not the multi-year total — fall-out
--     from a thin source page. Setting to NULL so canonical-extract
--     re-populates from the institution's own page on its next pass.

-- Archive set
UPDATE scholarships SET lifecycle_status = 'inactive', updated_at = now()
WHERE estimated_total_value_usd > 0
  AND estimated_total_value_usd < 3000
  AND lifecycle_status IN ('active','reopens_annually')
  AND scholarship_name NOT ILIKE '%commonwealth%';

-- Commonwealth total-value fix
UPDATE scholarships
SET estimated_total_value_usd = NULL, updated_at = now()
WHERE scholarship_name ILIKE '%commonwealth%scholarship%'
  AND estimated_total_value_usd = 1844.04;
