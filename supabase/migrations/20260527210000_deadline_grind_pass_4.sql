-- Pass 4 (2026-05-27 late afternoon).
-- Two more "stored deadline is past cycle's decision date, not the
-- application close date" silent failures caught:
--
--   Deep Springs College — stored 2027-04-01.
--   Real: 1 April 2026 was the DECISION date for the class arriving July
--   2026 (per https://www.deepsprings.edu/apply/). Application first round
--   was 2 November 2025. Next class (arriving July 2027) opens "early fall
--   2026," exact date not yet posted. Stored 2027-04-01 was the LLM
--   conflating "final decision sent" with "application deadline" — same
--   class of bug as the HYI notification-date misread.
--
--   Eugene McDermott Scholars (UT Dallas) — stored 2027-05-01.
--   Real: 20 Feb 2026 was the DECISION date for 2026 entry (per provost
--   page). Application would have closed ~Nov-Dec 2025. 2027-05-01 is
--   neither an open nor a close; it's a leftover from misextraction.
--
-- Both rows: replace stored with the pattern-based forward date (next
-- Nov), set canonical to the last-known close, mark is_deadline_inferred
-- so the UI shows "Typically November" instead of confidently-wrong dates.
-- Applied via MCP apply_migration; this file is in-tree for git traceability.

INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  ('2f1700e8-dfd1-48bf-92c1-558d33f525fd'::uuid, '2027-04-01'::date, '2027-04-01'::date, '2025-11-02'::date,
   'https://www.deepsprings.edu/apply/',
   'mismatch', 0.85, 'samuel-manual-2026-05-27-p4',
   'Deep Springs: stored 2027-04-01 was the past cycle DECISION date (final decisions 1 Apr 2026 for class arriving July 2026). Real first-round app deadline was 2 Nov 2025. Next class (arriving July 2027) opens early fall 2026.'),

  ('dfff5fd8-cac0-4940-880a-117eb320a254'::uuid, '2027-05-01'::date, '2027-05-01'::date, NULL,
   'https://provost.utdallas.edu/mcdermott-programs/eugene-mcdermott-scholars/',
   'mismatch', 0.80, 'samuel-manual-2026-05-27-p4',
   'McDermott Scholars: stored 2027-05-01 is well past decision date (decisions 20 Feb 2026 for 2026 entry). 2027-entry app deadline would be ~Nov-Dec 2026, not May 2027. Mark inferred.');

UPDATE public.scholarships
SET application_deadline   = '2026-11-02'::date,
    canonical_deadline_iso = '2025-11-02'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = true
WHERE scholarship_id = '2f1700e8-dfd1-48bf-92c1-558d33f525fd'::uuid;

UPDATE public.scholarships
SET application_deadline   = '2026-11-01'::date,
    canonical_deadline_iso = '2025-11-01'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = true
WHERE scholarship_id = 'dfff5fd8-cac0-4940-880a-117eb320a254'::uuid;

DO $$
DECLARE v_id UUID;
BEGIN
  FOR v_id IN VALUES
    ('2f1700e8-dfd1-48bf-92c1-558d33f525fd'::uuid),
    ('dfff5fd8-cac0-4940-880a-117eb320a254'::uuid)
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
  END LOOP;
END $$;
