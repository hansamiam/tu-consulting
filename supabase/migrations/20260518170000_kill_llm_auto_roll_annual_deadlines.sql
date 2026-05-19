-- 2026-05-18: User direction — kill the "+1 year and assume" auto-roll
-- pattern. The old roll_forward_annual_deadlines() called
-- next_annual_occurrence() to silently add 12 months to expired annual
-- deadlines, producing fake "2027-02-15" rows like the Finland
-- Government Scholarship (sourced from a 2023 OFY article, no real
-- next-cycle deadline published). User: "I'M GONNA BE SO MAD IF I SEE
-- EVEN ONE MORE."
--
-- New behavior: NULL the deadline when it expires. verify-scholarship
-- cron repopulates from the official source page on its next pass — if
-- the program has announced a real next cycle, it lands. If not, the
-- row shows "annual cycle — check site" instead of a hallucinated date.
--
-- Companion cleanups (already applied via execute_sql):
--   - Killed Finland Government (2023 OFY source)
--   - Killed 5 rows whose source_url had 2018-2024 year markers
--   - Deactivated those source rows
--   - Killed 50 rows with deadline > 10 months out AND deadline_type='annual'
--     (the auto-roll-forward signature)

CREATE OR REPLACE FUNCTION public.roll_forward_annual_deadlines()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected integer;
BEGIN
  WITH cleared AS (
    UPDATE public.scholarships
    SET application_deadline = NULL,
        updated_at = now()
    WHERE deadline_type = 'annual'
      AND application_deadline IS NOT NULL
      AND application_deadline < CURRENT_DATE
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM cleared;
  RETURN affected;
END
$function$;
