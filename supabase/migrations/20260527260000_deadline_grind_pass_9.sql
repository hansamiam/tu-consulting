-- Pass 9 (2026-05-27 evening): cron round 7 (post-picker-widening) surfaced
-- 5 real mismatches in previously-invisible-to-cron rows.
--
-- CRITICAL: Joint Japan/World Bank Graduate Scholarship Program — stored
-- 2027-02-27 but real deadline is 2026-05-29 (TWO DAYS away). This row
-- was is_published=false but rendering on Discover via lifecycle_status
-- filter, so users could have applied to a closed cycle without warning.
-- The old picker missed it entirely; the new picker caught it.
--
-- Other fixes from this pass:
-- - Jeff Schell, Kurt Hansen, ICSP Oregon, ZUKOnnect: cron found
--   past-cycle dates on page; stored values are +12mo next-cycle pattern.
--   Marked is_deadline_inferred=true.
-- - Japan-IMF JISPA: multi-track program (PhD Jun 1, Macro/JJ Oct 20).
--   Stored Oct 20 is Macro track; populated deadlines_detail with both.
-- - LSTM Future Leaders: ambiguous; admin review flagged.
-- - Bolashak: cron false positive (picked doc-acceptance date). Stored
--   Sam-verified May 31 is correct; logged authoritative override.
--
-- Applied via MCP apply_migration; this file is in-tree for traceability.

UPDATE public.scholarships
SET application_deadline   = '2026-05-29'::date,
    canonical_deadline_iso = '2026-05-29'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false,
    deadlines_detail = jsonb_build_array(
      jsonb_build_object('label', 'Window 2 close', 'date', '2026-05-29', 'type', 'ROUND_2')
    )
WHERE scholarship_id = 'd337a989-adc3-49ad-bd19-72dbbb3fe8fb'::uuid;

UPDATE public.scholarships
SET is_deadline_inferred = true
WHERE scholarship_id IN (
  (SELECT scholarship_id FROM public.scholarships WHERE scholarship_name = 'Jeff Schell Fellowship in Agricultural Sciences' LIMIT 1),
  'da97fff9-0bbf-44f3-9d30-eb7e4b64c5d5'::uuid,
  '851e1a0d-03ef-4509-ab4c-d68f9a29d58c'::uuid,
  '295fb47e-6e3a-4b40-b9bd-e99795e1d751'::uuid,
  'c3b791df-2729-4e5f-9618-cdb3bf03cf65'::uuid
);

UPDATE public.scholarships
SET deadlines_detail = jsonb_build_array(
  jsonb_build_object('label', 'PhD Track',         'date', '2026-06-01', 'type', 'ROUND_1'),
  jsonb_build_object('label', 'Macro/JJ Track',    'date', '2026-10-20', 'type', 'ROUND_2')
)
WHERE scholarship_id = 'c986d2b7-b71a-442b-bb05-b0c515d49c2d'::uuid;

INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  ('d337a989-adc3-49ad-bd19-72dbbb3fe8fb'::uuid, '2027-02-27'::date, NULL, '2026-05-29'::date,
   'https://www.worldbank.org/en/programs/scholarships',
   'mismatch', 0.90, 'samuel-manual-2026-05-27-p9',
   'CRITICAL: stored 2027-02-27 was wrong; real deadline 2026-05-29 (2 days away) per cron + page.'),
  ('c986d2b7-b71a-442b-bb05-b0c515d49c2d'::uuid, '2026-10-20'::date, NULL, '2026-10-20'::date,
   'https://www.imf.org/external/np/ins/english/scholar.htm',
   'match', 0.88, 'samuel-manual-2026-05-27-p9',
   'JISPA multi-track: PhD 1 Jun 2026, Macro/JJ 20 Oct 2026.'),
  ('c148df1f-74b2-4245-811a-85f4740d9bd8'::uuid, '2026-05-31'::date, NULL, '2026-05-31'::date,
   'https://bolashak.gov.kz/en/scholarship-program',
   'match', 0.97, 'samuel-manual-2026-05-27-p9-override',
   'Cron false-positive (picked doc-acceptance date). Sam-verified May 31 2026 is the deadline.');

DO $$
DECLARE v_id UUID;
BEGIN
  FOR v_id IN VALUES
    ('d337a989-adc3-49ad-bd19-72dbbb3fe8fb'::uuid),
    ('c986d2b7-b71a-442b-bb05-b0c515d49c2d'::uuid)
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
  END LOOP;
END $$;
