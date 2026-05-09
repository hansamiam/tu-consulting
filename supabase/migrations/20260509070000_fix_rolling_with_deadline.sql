-- =============================================================================
-- Aggressive deadline_type cleanup — rolling + concrete deadline = annual
-- =============================================================================
-- The 20260507160000 backfill was conservative — only flipped rows
-- whose name matched ~30 famous program slugs. That left thousands of
-- legitimate annual rows still tagged 'rolling' because the LLM
-- over-defaulted to "rolling" when a calendar date wasn't obvious.
--
-- A simpler signal we trust: a row tagged deadline_type='rolling' AND
-- with a concrete application_deadline date is internally
-- contradictory. "Rolling" means no fixed deadline. If we have a date
-- on file, the program clearly has cycles → flip to 'annual'.
--
-- Same logic for 'unknown' deadline_type with a date.
--
-- This runs once at apply time. Also refreshes lifecycle_status for
-- the affected rows so closing-soon / closed-recent flips become
-- visible immediately rather than waiting for the nightly refresh
-- cron at 03:00 UTC.
--
-- Going forward, scrape-source already defaults to "annual" in its
-- SYSTEM_PROMPT (round-2 fix on 2026-05-07) so new rows shouldn't
-- regress. verify-scholarship-cron progressively re-touches existing
-- 'rolling' rows; over a week or two the catalog should converge.
-- =============================================================================

-- Audit counts BEFORE the flip — surfaced in push output via RAISE NOTICE.
DO $$
DECLARE
  v_total int;
  v_rolling_with_date int;
  v_unknown_with_date int;
  v_truly_rolling int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  SELECT count(*) INTO v_rolling_with_date
    FROM public.scholarships
    WHERE deadline_type = 'rolling' AND application_deadline IS NOT NULL;
  SELECT count(*) INTO v_unknown_with_date
    FROM public.scholarships
    WHERE (deadline_type = 'unknown' OR deadline_type IS NULL) AND application_deadline IS NOT NULL;
  SELECT count(*) INTO v_truly_rolling
    FROM public.scholarships
    WHERE deadline_type = 'rolling' AND application_deadline IS NULL;

  RAISE NOTICE '[deadline_audit] total=%, rolling_with_date=%, unknown_with_date=%, truly_rolling_no_date=%',
    v_total, v_rolling_with_date, v_unknown_with_date, v_truly_rolling;
END $$;

-- The actual flip: rolling/unknown WITH a date → annual.
UPDATE public.scholarships
SET deadline_type = 'annual'
WHERE deadline_type IN ('rolling', 'unknown')
  AND application_deadline IS NOT NULL;

-- Lifecycle refresh for the affected rows so closing-soon / closed-recent
-- visibility flips immediately.
UPDATE public.scholarships
SET lifecycle_status = public.scholarship_lifecycle(application_deadline, deadline_type)
WHERE deadline_type = 'annual'
  AND lifecycle_status IS DISTINCT FROM public.scholarship_lifecycle(application_deadline, deadline_type);

-- Audit AFTER the flip.
DO $$
DECLARE
  v_rolling int; v_annual int; v_other int;
BEGIN
  SELECT count(*) INTO v_rolling FROM public.scholarships WHERE deadline_type = 'rolling';
  SELECT count(*) INTO v_annual  FROM public.scholarships WHERE deadline_type = 'annual';
  SELECT count(*) INTO v_other   FROM public.scholarships WHERE deadline_type NOT IN ('rolling', 'annual') OR deadline_type IS NULL;

  RAISE NOTICE '[deadline_audit] AFTER: rolling=%, annual=%, other_or_null=%', v_rolling, v_annual, v_other;
END $$;
