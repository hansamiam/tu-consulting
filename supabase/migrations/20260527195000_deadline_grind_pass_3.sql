-- Third-pass manual grind, 2026-05-27.
-- Populates deadlines_detail (new column from prior migration) and fixes
-- the rows where the headline application_deadline was wrong.
--
-- Big finds this pass:
--   - Cornelius Vanderbilt Scholarship: stored 2027-01-01, real scholarship
--     deadline is 1 Dec 2026 (one month earlier; separate from college
--     admissions ED I Nov 1 / RD Jan 1). Multi-deadline program — populate
--     deadlines_detail with all four.
--   - Morehead-Cain: stored 2027-01-15, real scholarship deadline is
--     1 Oct 2026 (3.5 months earlier). Page also confirms FACE Feb 26-Mar 2
--     2027 + recipient notifications Mar 5 2027.
--   - Fulbright Swedish Scholar: 9 Jan 2026 deadline closed; 2027/28 cycle
--     dates not posted. Mark inferred.
--   - Pearson Toronto: school nom Oct 10 / admission Oct 17 / scholarship
--     Nov 7 — all 2025 (cycle closed). Already marked inferred in catalog.
--     Add deadlines_detail with the 3-stage process for next cycle (~Oct/Nov 2026).
--
-- Inferred (cycles closed, next not posted):
--   Chalmers IPOET, Science@Leuven, Italian MAECI, USC Trustee (no inline date)
-- Already-inferred (no change needed): Pearson, Rhodes, Adelaide, Harvard-Yenching
-- Bot-blocked / deep-page rows deferred to audit-deadlines cron + Sam's
-- parallel Deep Research run: MasterCard UP, Chevening, Jefferson, Robertson,
-- Knight-Hennessy, Italian MAECI, SINGA, GKS, Turkiye, Nazarbayev, UNFCCC,
-- ACU Expert Group, U Florence, U Calgary, Tuition-Waiver Copenhagen.

INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  -- ─── AUTHORITATIVE — corrected scholarship-specific deadlines ───
  ('6aa90316-a872-42ff-b3ce-db9f13807b83'::uuid, '2027-01-01'::date, '2027-01-01'::date, '2026-12-01'::date,
   'https://www.vanderbilt.edu/scholarships/signature/',
   'mismatch', 0.95, 'samuel-manual-2026-05-27-p3',
   'Cornelius Vanderbilt scholarship-specific deadline 1 Dec 2026 (separate from college ED Nov 1 / RD Jan 1). Multi-deadline program; full set in deadlines_detail.'),

  ('ec5143ef-02f9-4eb9-be0d-34846b0da223'::uuid, '2027-01-15'::date, '2027-01-15'::date, '2026-10-01'::date,
   'https://www.moreheadcain.org/application-eligibility/deadlines/',
   'mismatch', 0.97, 'samuel-manual-2026-05-27-p3',
   'Morehead-Cain Class of 2031: all application materials due 1 Oct 2026. Portal opens 15 Aug 2026. Finalist FACE 26 Feb-2 Mar 2027.'),

  -- ─── Confirmed past-cycle close, inferred future ───
  ('280b7e0f-3a1d-41f8-a5ec-e729b3dea267'::uuid, '2027-01-09'::date, NULL, NULL,
   'https://www.fulbright.se/scholar-program/',
   'inconclusive', 0.78, 'samuel-manual-2026-05-27-p3',
   'Fulbright Swedish Scholar 2026-2027 deadline was 9 Jan 2026 (past). 2027/28 cycle dates not posted. Stored Jan 9 2027 is plausible next-cycle pattern.'),

  ('b47b58db-1684-42c7-918d-d86e5134bb47'::uuid, '2027-01-15'::date, NULL, NULL,
   'https://www.chalmers.se/en/education/application-and-admission/scholarships-for-fee-paying-students/',
   'inconclusive', 0.70, 'samuel-manual-2026-05-27-p3',
   'Chalmers IPOET Fall 2026 closed. Next cycle TBD. Stored Jan 15 2027 plausible Swedish pattern.'),

  ('e64fd0c9-0c72-46ad-8b6c-a7c84111db3d'::uuid, '2027-02-15'::date, NULL, NULL,
   'http://wet.kuleuven.be/english/scienceatleuvenscholarship',
   'inconclusive', 0.70, 'samuel-manual-2026-05-27-p3',
   'Science@Leuven 2026-2027 closed. Next 2027-2028 cycle dates not posted. Stored Feb 15 2027 plausible pattern.'),

  ('1de63bca-7479-4a1f-bf26-2e2e4d925b4c'::uuid, '2027-03-26'::date, NULL, NULL,
   'https://studyinitaly.esteri.it/ListaBandi',
   'inconclusive', 0.70, 'samuel-manual-2026-05-27-p3',
   'Italian MAECI 2025-2026 closed. 2027/28 call not posted. Stored Mar 26 2027 is plausible historic-pattern guess.'),

  ('4c474617-8a2a-4186-90e8-7284e5f11f93'::uuid, '2027-01-10'::date, '2027-01-10'::date, NULL,
   'https://admission.usc.edu/cost-and-financial-aid/scholarships/',
   'inconclusive', 0.70, 'samuel-manual-2026-05-27-p3',
   'USC Trustee linked from this page; specific date on /prospective-students/how-to-apply/first-year-students/#chapter=dates-and-deadlines. Stored Jan 10 2027 plausible.'),

  ('353d4b83-bdbb-4a5b-80fe-badef67bf6bd'::uuid, '2026-11-07'::date, '2025-11-07'::date, NULL,
   'https://future.utoronto.ca/pearson-scholarships',
   'inconclusive', 0.85, 'samuel-manual-2026-05-27-p3',
   'Pearson Toronto Class of 2026: school nom 10 Oct 2025, U of T admission 17 Oct 2025, scholarship 7 Nov 2025 (all past). Next class (2027) expected Oct-Nov 2026, exact dates not yet posted.');

-- ─── Apply scholarship-deadline corrections ─────────────────────────────

UPDATE public.scholarships
SET application_deadline   = '2026-12-01'::date,
    canonical_deadline_iso = '2026-12-01'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false,
    deadlines_detail = jsonb_build_array(
      jsonb_build_object('label', 'Early Decision I',     'date', '2026-11-01', 'type', 'ED_I'),
      jsonb_build_object('label', 'Scholarship deadline', 'date', '2026-12-01', 'type', 'SCHOLARSHIP'),
      jsonb_build_object('label', 'Early Decision II',    'date', '2027-01-01', 'type', 'ED_II'),
      jsonb_build_object('label', 'Regular Decision',     'date', '2027-01-01', 'type', 'RD')
    )
WHERE scholarship_id = '6aa90316-a872-42ff-b3ce-db9f13807b83'::uuid;

UPDATE public.scholarships
SET application_deadline   = '2026-10-01'::date,
    canonical_deadline_iso = '2026-10-01'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false,
    deadlines_detail = jsonb_build_array(
      jsonb_build_object('label', 'Application materials due',   'date', '2026-10-01', 'type', 'SCHOLARSHIP'),
      jsonb_build_object('label', 'Final Selection Experience',  'date', '2027-02-26', 'type', 'INTERVIEW'),
      jsonb_build_object('label', 'Recipient notifications',     'date', '2027-03-05', 'type', 'DECISION')
    )
WHERE scholarship_id = 'ec5143ef-02f9-4eb9-be0d-34846b0da223'::uuid;

-- ─── Mark inferred ─────────────────────────────────────────────────────
UPDATE public.scholarships
SET is_deadline_inferred = true
WHERE scholarship_id IN (
  '280b7e0f-3a1d-41f8-a5ec-e729b3dea267'::uuid,  -- Fulbright Swedish Scholar
  'b47b58db-1684-42c7-918d-d86e5134bb47'::uuid,  -- Chalmers IPOET
  'e64fd0c9-0c72-46ad-8b6c-a7c84111db3d'::uuid,  -- Science@Leuven
  '1de63bca-7479-4a1f-bf26-2e2e4d925b4c'::uuid,  -- Italian MAECI
  '4c474617-8a2a-4186-90e8-7284e5f11f93'::uuid   -- USC Trustee (TBD details)
);

-- ─── Backfill deadlines_detail for US college rows with ED + RD ─────────
-- We have both application_deadline (RD) and early_deadline + early_decision_type
-- populated for ~31 US college rows. Synthesize deadlines_detail from those
-- existing columns so the new field is immediately useful without a separate
-- per-row INSERT for each. Only fills rows where deadlines_detail is empty.
UPDATE public.scholarships
SET deadlines_detail = jsonb_build_array(
  jsonb_build_object(
    'label', CASE early_decision_type
               WHEN 'ED_I'   THEN 'Early Decision I'
               WHEN 'ED_II'  THEN 'Early Decision II'
               WHEN 'EA'     THEN 'Early Action'
               WHEN 'REA'    THEN 'Restrictive Early Action'
               WHEN 'SCEA'   THEN 'Single Choice Early Action'
               ELSE 'Early ' || early_decision_type
             END,
    'date', early_deadline::text,
    'type', early_decision_type
  ),
  jsonb_build_object(
    'label', 'Regular Decision',
    'date',  application_deadline::text,
    'type',  'RD'
  )
)
WHERE is_published = true
  AND early_deadline IS NOT NULL
  AND early_decision_type IS NOT NULL
  AND application_deadline IS NOT NULL
  AND (deadlines_detail IS NULL OR deadlines_detail = '[]'::jsonb)
  -- Skip rows we hand-populated above
  AND scholarship_id NOT IN (
    '6aa90316-a872-42ff-b3ce-db9f13807b83'::uuid,
    'ec5143ef-02f9-4eb9-be0d-34846b0da223'::uuid
  );

-- Re-evaluate gates on touched rows
DO $$
DECLARE v_id UUID;
BEGIN
  FOR v_id IN VALUES
    ('6aa90316-a872-42ff-b3ce-db9f13807b83'::uuid),
    ('ec5143ef-02f9-4eb9-be0d-34846b0da223'::uuid),
    ('280b7e0f-3a1d-41f8-a5ec-e729b3dea267'::uuid),
    ('b47b58db-1684-42c7-918d-d86e5134bb47'::uuid),
    ('e64fd0c9-0c72-46ad-8b6c-a7c84111db3d'::uuid),
    ('1de63bca-7479-4a1f-bf26-2e2e4d925b4c'::uuid),
    ('4c474617-8a2a-4186-90e8-7284e5f11f93'::uuid)
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
  END LOOP;
END $$;
