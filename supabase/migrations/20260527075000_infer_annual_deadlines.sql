-- Annual programs whose previous cycle has already closed are still
-- relevant — they reopen next year. Pre-this-migration, those rows
-- rendered "No deadline posted" / "Reopens annually" in Discover with
-- no specific month signal, which Sam called out as too vague.
--
-- Fix: bump the application_deadline forward to the NEXT future
-- occurrence of its historical month-day, derived from canonical_deadline_iso
-- (preferred) or the existing past application_deadline. Mark the row
-- with is_deadline_inferred=true so the UI can format it as
-- "Typically [Month YYYY]" instead of treating it like an authoritative
-- date.
--
-- Conservative scope: only annual programs (deadline_type = 'annual').
-- Rolling deadlines stay NULL by design. Fixed-cycle programs that
-- need a forward date but don't have one stay gated (G8a/b for 'fixed')
-- because we can't responsibly invent a date there.

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS is_deadline_inferred boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.scholarships.is_deadline_inferred IS
  '2026-05-27: True when application_deadline was derived from a past '
  'cycle (canonical_deadline_iso) rather than authoritatively pulled '
  'from the provider site. UI surfaces as "Typically [Month YYYY]" so '
  'users know to verify before applying.';

-- Backfill: for annual rows with a past or missing application_deadline,
-- compute the next future cycle from canonical_deadline_iso (preferred)
-- or the existing past application_deadline. Add years until the date
-- is in the future.
WITH inferred AS (
  SELECT
    scholarship_id,
    CASE
      WHEN canonical_deadline_iso IS NOT NULL
        THEN canonical_deadline_iso + (
          ((EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM canonical_deadline_iso)::int)
           + CASE WHEN (canonical_deadline_iso + ((EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM canonical_deadline_iso)::int) * INTERVAL '1 year'))::date >= CURRENT_DATE THEN 0 ELSE 1 END
          ) * INTERVAL '1 year'
        )::date
      WHEN application_deadline IS NOT NULL
        THEN application_deadline + (
          ((EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM application_deadline)::int)
           + CASE WHEN (application_deadline + ((EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM application_deadline)::int) * INTERVAL '1 year'))::date >= CURRENT_DATE THEN 0 ELSE 1 END
          ) * INTERVAL '1 year'
        )::date
      ELSE NULL
    END AS inferred_date
  FROM public.scholarships
  WHERE deadline_type = 'annual'
    AND (application_deadline IS NULL OR application_deadline < CURRENT_DATE)
)
UPDATE public.scholarships s
SET application_deadline = i.inferred_date,
    is_deadline_inferred = true
FROM inferred i
WHERE s.scholarship_id = i.scholarship_id
  AND i.inferred_date IS NOT NULL;

-- Re-evaluate the gate on every annual row so the new application_deadline
-- (no longer NULL or past) flows through is_published correctly. The
-- previous gate-loosening migration already accepted annual+NULL via
-- G8a; this just keeps the data clean.
DO $$
DECLARE
  v_id UUID;
  v_count INT := 0;
BEGIN
  FOR v_id IN
    SELECT scholarship_id FROM public.scholarships
    WHERE deadline_type = 'annual'
      AND (gate_fail_reason IS NULL OR gate_fail_reason ~ '^G8')
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Re-evaluated % annual rows after deadline inference', v_count;
END $$;
