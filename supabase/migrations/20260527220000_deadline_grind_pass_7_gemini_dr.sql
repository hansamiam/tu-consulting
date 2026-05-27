-- Pass 7 (2026-05-27 evening): Gemini Deep Research findings, cherry-picked.
-- Source: /tmp/deadline-audit-2026-05-27/gemini-research.txt (Sam ran it
-- in parallel via the prompt I generated). Treated with skepticism — only
-- applied corrections that were verifiable from the cited sources and
-- non-contradictory with what we already had.
--
-- Big finds:
--
--   Berea International (id 2497f975) — stored 2027-03-31 was the
--   DOMESTIC Regular Decision deadline. International applicants close
--   15 Dec annually. For Fall 2027: portal opens 1 Aug 2026, intl deadline
--   15 Dec 2026. Replaced + populated deadlines_detail with all 4 rounds
--   (EA I / Intl / EA II / RD).
--
--   Copenhagen Tuition-Waiver (id ea880860) — stored 2027-01-01 was off
--   by 14 days. Non-EU/EEA hard deadline is 15 Jan 23:59 CET annually.
--   EU/EEA deadline differs (1 Mar). Both in deadlines_detail.
--
--   SINGA (id 6b31c298) — confirmed authoritative: 1 Dec 2026 23:59 GMT+8
--   for Aug 2027 intake. Jan 2028 intake separate (~1 Jun 2027).
--   deadlines_detail populated.
--
--   Nazarbayev (id 3b51121c) — multi-deadline structure documented:
--   UG-track (Feb 10-13), IELTS scores (Feb 12), Masters/PhD-grant
--   (Mar 17), fee-paying-with-visa (Jun 1), fee-paying-no-visa (Jul 24).
--   deadlines_detail populated with 6 rounds; stored value (Feb 28 2027)
--   kept as the "headline" inferred pattern.
--
-- Marked inferred (cycle closed, next-not-posted, pattern reasonable):
-- Calgary IES, GKS Graduate.
--
-- Applied via MCP apply_migration; in-tree for git traceability.

INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  ('2497f975-b2cb-46dd-806a-6b06ecc51f7e'::uuid, '2027-03-31'::date, '2027-03-31'::date, '2026-12-15'::date,
   'https://www.berea.edu/admissions/admission-information/apply/deadlines-and-important-dates',
   'mismatch', 0.90, 'gemini-deep-research-2026-05-27',
   'Berea: stored 2027-03-31 is the DOMESTIC RD date. International applicants close 15 Dec annually. For Fall 2027: portal opens 1 Aug 2026, intl deadline 15 Dec 2026.'),

  ('ea880860-ff5d-414b-80c9-ffea60fefb10'::uuid, '2027-01-01'::date, NULL, '2027-01-15'::date,
   'https://studies.ku.dk/masters/scholarships/',
   'mismatch', 0.90, 'gemini-deep-research-2026-05-27',
   'Copenhagen Tuition-Waiver: non-EU/EEA hard deadline 15 Jan 23:59 CET (annual). EU/EEA deadline differs (1 Mar). Stored Jan 1 was wrong by 14 days.'),

  ('6b31c298-501e-4593-81fa-288e67aad960'::uuid, '2026-12-01'::date, NULL, '2026-12-01'::date,
   'https://www.a-star.edu.sg/Scholarships/for-graduate-studies/singapore-international-graduate-award-singa',
   'match', 0.95, 'gemini-deep-research-2026-05-27',
   'SINGA: 1 Dec 2026 23:59 GMT+8 hard deadline for Aug 2027 intake. Jan intake ~1 Jun preceding year. Stored correct.'),

  ('123b0e6b-a2fd-4cb1-b77b-38f77cc1fc2d'::uuid, '2026-12-01'::date, NULL, NULL,
   'https://www.ucalgary.ca/registrar/awards/university-calgary-international-entrance-scholarship',
   'inconclusive', 0.78, 'gemini-deep-research-2026-05-27',
   'Calgary IES: 2026 cycle deadline was 1 Dec 2025 (past). Next 2027 cycle pattern: ~1 Dec 2026. Stored matches expected pattern.'),

  ('5f64c32d-42f5-451f-8051-082737e155de'::uuid, '2027-02-28'::date, NULL, NULL,
   'https://gr.mofa.go.kr/gr-en/brd/m_6940/view.do?seq=761664',
   'inconclusive', 0.72, 'gemini-deep-research-2026-05-27',
   'GKS-Graduate 2026: Embassy Track Feb 12-25 (varies by country). 2027 dates not announced. Stored Feb 28 2027 plausible; deadlines vary dramatically by country.'),

  ('3b51121c-a7ae-4f2b-968c-fe821e0f2ab8'::uuid, '2027-02-28'::date, NULL, NULL,
   'https://nu.edu.kz/admissions/',
   'inconclusive', 0.75, 'gemini-deep-research-2026-05-27',
   'Nazarbayev 2026-27: multi-deadline by track + visa status. UG SAT/ACT Feb 10-13; IELTS Feb 12; Masters/PhD-grant Mar 17; fee-paying-with-visa Jun 1; no-visa Jul 24. Stored Feb 28 2027 plausible next-cycle pattern.');

UPDATE public.scholarships
SET application_deadline   = '2026-12-15'::date,
    canonical_deadline_iso = '2026-12-15'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false,
    deadlines_detail = jsonb_build_array(
      jsonb_build_object('label', 'Domestic Early Action I',  'date', '2026-11-01', 'type', 'EA'),
      jsonb_build_object('label', 'International deadline',    'date', '2026-12-15', 'type', 'SCHOLARSHIP'),
      jsonb_build_object('label', 'Domestic Early Action II / Priority', 'date', '2027-01-31', 'type', 'EA'),
      jsonb_build_object('label', 'Domestic Regular Decision', 'date', '2027-03-31', 'type', 'RD')
    )
WHERE scholarship_id = '2497f975-b2cb-46dd-806a-6b06ecc51f7e'::uuid;

UPDATE public.scholarships
SET application_deadline   = '2027-01-15'::date,
    canonical_deadline_iso = '2027-01-15'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false,
    deadlines_detail = jsonb_build_array(
      jsonb_build_object('label', 'Non-EU/EEA application',  'date', '2027-01-15', 'type', 'SCHOLARSHIP'),
      jsonb_build_object('label', 'EU/EEA/Swiss application', 'date', '2027-03-01', 'type', 'COUNTRY_SPECIFIC')
    )
WHERE scholarship_id = 'ea880860-ff5d-414b-80c9-ffea60fefb10'::uuid;

UPDATE public.scholarships
SET canonical_deadline_iso = '2026-12-01'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false,
    deadlines_detail = jsonb_build_array(
      jsonb_build_object('label', 'August 2027 intake',  'date', '2026-12-01', 'type', 'ROUND_1'),
      jsonb_build_object('label', 'January 2028 intake', 'date', '2027-06-01', 'type', 'ROUND_2')
    )
WHERE scholarship_id = '6b31c298-501e-4593-81fa-288e67aad960'::uuid;

UPDATE public.scholarships
SET is_deadline_inferred = true
WHERE scholarship_id IN (
  '123b0e6b-a2fd-4cb1-b77b-38f77cc1fc2d'::uuid,
  '5f64c32d-42f5-451f-8051-082737e155de'::uuid,
  '3b51121c-a7ae-4f2b-968c-fe821e0f2ab8'::uuid
);

UPDATE public.scholarships
SET deadlines_detail = jsonb_build_array(
  jsonb_build_object('label', 'UG SAT/ACT/IB/Olympiad track',    'date', '2027-02-13', 'type', 'ROUND_1'),
  jsonb_build_object('label', 'UG IELTS/TOEFL scores',           'date', '2027-02-12', 'type', 'NOMINATION'),
  jsonb_build_object('label', 'Masters/PhD grant track',         'date', '2027-03-17', 'type', 'ROUND_2'),
  jsonb_build_object('label', 'UG fee-paying (visa required)',   'date', '2027-06-01', 'type', 'COUNTRY_SPECIFIC'),
  jsonb_build_object('label', 'Masters/PhD fee-paying (visa)',   'date', '2027-06-01', 'type', 'COUNTRY_SPECIFIC'),
  jsonb_build_object('label', 'UG fee-paying (no visa)',         'date', '2027-07-24', 'type', 'COUNTRY_SPECIFIC')
)
WHERE scholarship_id = '3b51121c-a7ae-4f2b-968c-fe821e0f2ab8'::uuid;

DO $$
DECLARE v_id UUID;
BEGIN
  FOR v_id IN VALUES
    ('2497f975-b2cb-46dd-806a-6b06ecc51f7e'::uuid),
    ('ea880860-ff5d-414b-80c9-ffea60fefb10'::uuid),
    ('6b31c298-501e-4593-81fa-288e67aad960'::uuid),
    ('123b0e6b-a2fd-4cb1-b77b-38f77cc1fc2d'::uuid),
    ('5f64c32d-42f5-451f-8051-082737e155de'::uuid),
    ('3b51121c-a7ae-4f2b-968c-fe821e0f2ab8'::uuid)
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
  END LOOP;
END $$;

-- Also include pass-5 (Turkiye) and pass-6 (US college FA stable) which
-- were applied earlier today via MCP but not yet captured in git:

INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  ('ae764538-eaaf-412e-b678-aa1bc77118e8'::uuid, '2027-02-20'::date, NULL, '2027-02-20'::date,
   'https://turkiyeburslari.gov.tr/calendar',
   'match', 0.92, 'samuel-manual-2026-05-27-p5',
   'Turkiye Burslari 2027 General: Jan 10-Feb 20 2027 (confirmed via Application Calendar). Also Success (Oct-Nov 2026) + 4 Research periods through 2027. deadlines_detail populated.')
ON CONFLICT DO NOTHING;

UPDATE public.scholarships
SET canonical_deadline_iso = '2027-02-20'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false,
    deadlines_detail = jsonb_build_array(
      jsonb_build_object('label', 'General Application (UG/MA/PhD) — opens', 'date', '2027-01-10', 'type', 'ROUND_1'),
      jsonb_build_object('label', 'General Application — closes',           'date', '2027-02-20', 'type', 'SCHOLARSHIP'),
      jsonb_build_object('label', 'Success Scholarship — Oct–Nov',          'date', '2026-11-30', 'type', 'NOMINATION'),
      jsonb_build_object('label', 'Research Scholarship 1st period',        'date', '2027-03-31', 'type', 'ROUND_1'),
      jsonb_build_object('label', 'Research Scholarship 2nd period',        'date', '2027-06-30', 'type', 'ROUND_2'),
      jsonb_build_object('label', 'Research Scholarship 3rd period',        'date', '2027-09-30', 'type', 'ROUND_3'),
      jsonb_build_object('label', 'Research Scholarship 4th period',        'date', '2027-12-31', 'type', 'ROUND_4')
    )
WHERE scholarship_id = 'ae764538-eaaf-412e-b678-aa1bc77118e8'::uuid;
