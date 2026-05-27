-- Pass 8 (2026-05-27 evening): triage of cron-flagged mismatches.
-- The audit cron raised several mismatches that on review fall into
-- three buckets:
--
--   FALSE POSITIVES (cron picked past-cycle dates from page):
--     Axel Adler, Cornell FA (Intl). Stored is the annual-pattern next
--     cycle; cron found last cycle's still-visible date. Mark inferred
--     so UI clearly shows "Typically [Month]" and the cron's stale-
--     flag rule will not re-fire for 60d.
--
--   PARTIAL — both dates legit, populate deadlines_detail:
--     Princeton: stored Jan 1 = admissions deadline (correct).
--     Cron found Feb 1 = FA-forms deadline. Both real. SCEA Nov 1 too.
--     Populated with SCEA / RD / FA-forms.
--
--   MULTI-INTAKE — both dates real intakes:
--     Adelaide: Sem 1 (Nov 30) AND Sem 2 (May 22). Stored = Sem 1 close
--     (next intake). Populated detail with both intakes.
--
-- Deferred for admin review (potential real signal, ambiguous):
--   Smith (cron found Jan 25 vs stored Jan 15)
--   Macalester (cron found Jan 22 vs stored Jan 15)
--   Both pages may have shifted RD or cron picked FA-supplement date.
--   Audit log entry left for admin to review on /admin/deadline-audit.
--
-- Applied via MCP apply_migration; this file is in-tree for git traceability.

UPDATE public.scholarships
SET deadlines_detail = jsonb_build_array(
  jsonb_build_object('label', 'Single Choice Early Action',  'date', '2026-11-01', 'type', 'SCEA'),
  jsonb_build_object('label', 'Regular Decision',            'date', '2027-01-01', 'type', 'RD'),
  jsonb_build_object('label', 'Financial Aid forms',         'date', '2027-02-01', 'type', 'NOMINATION')
)
WHERE scholarship_id = 'a98b52e3-ae9f-41c7-a3dc-9069e67f631b'::uuid;

UPDATE public.scholarships
SET deadlines_detail = jsonb_build_array(
  jsonb_build_object('label', 'Semester 1 2027 intake',   'date', '2026-11-30', 'type', 'ROUND_1'),
  jsonb_build_object('label', 'Semester 2 2027 intake',   'date', '2027-05-22', 'type', 'ROUND_2')
),
is_deadline_inferred = true
WHERE scholarship_id = '3debf5a5-ce68-46ca-b3cc-b9a0f85ae08b'::uuid;

UPDATE public.scholarships
SET is_deadline_inferred = true
WHERE scholarship_id IN (
  '92143b76-9a39-4936-ba9a-39f966629c2e'::uuid,  -- Axel Adler
  '93ab2728-18e0-4eea-94f4-0d32f7f5a050'::uuid   -- Cornell FA Intl
);

INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  ('a98b52e3-ae9f-41c7-a3dc-9069e67f631b'::uuid, '2027-01-01'::date, '2027-01-01'::date, '2027-01-01'::date,
   'https://admission.princeton.edu/cost-aid/financial-aid-and-application-deadlines',
   'match', 0.90, 'samuel-manual-2026-05-27-p8-review',
   'Princeton: stored Jan 1 is the admissions deadline (correct). Feb 1 = FA forms deadline. Both in deadlines_detail.'),

  ('3debf5a5-ce68-46ca-b3cc-b9a0f85ae08b'::uuid, '2026-11-30'::date, '2025-11-30'::date, '2026-11-30'::date,
   'https://adelaide.edu.au/study/scholarships/int/adelaide-academic-excellence-scholarship-50/',
   'match', 0.85, 'samuel-manual-2026-05-27-p8-review',
   'Adelaide: stored Nov 30 = Sem 1 2027 intake close (next future). Sem 2 close (May 22) is a separate intake. Both in deadlines_detail.'),

  ('92143b76-9a39-4936-ba9a-39f966629c2e'::uuid, '2027-01-15'::date, '2026-01-15'::date, NULL,
   'https://www.gu.se/en/study-in-gothenburg/apply/scholarships-for-fee-paying-students/axel-adler-scholarship',
   'inconclusive', 0.85, 'samuel-manual-2026-05-27-p8-review',
   'Axel Adler: Cron picked 2026-01-15 (past cycle); stored 2027-01-15 is annual pattern next cycle. Mark inferred.'),

  ('93ab2728-18e0-4eea-94f4-0d32f7f5a050'::uuid, '2027-01-02'::date, '2027-01-02'::date, NULL,
   'https://finaid.cornell.edu/first-year-and-transfer-students-international',
   'inconclusive', 0.85, 'samuel-manual-2026-05-27-p8-review',
   'Cornell: Cron picked 2026-01-02 (past cycle RD) from FA page. Stored 2027-01-02 is annual pattern next cycle.');

DO $$
DECLARE v_id UUID;
BEGIN
  FOR v_id IN VALUES
    ('a98b52e3-ae9f-41c7-a3dc-9069e67f631b'::uuid),
    ('3debf5a5-ce68-46ca-b3cc-b9a0f85ae08b'::uuid),
    ('92143b76-9a39-4936-ba9a-39f966629c2e'::uuid),
    ('93ab2728-18e0-4eea-94f4-0d32f7f5a050'::uuid)
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
  END LOOP;
END $$;
