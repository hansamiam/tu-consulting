-- Second-pass manual grind, 2026-05-27.
-- Continued hand-verification of imminent deadlines (June–Oct 2026) and
-- "researcher said match but never actually verified" rows.
--
-- Biggest find: Heinrich Böll Foundation stored 2027-03-01 — the real
-- next deadline is 1 Sep 2026 (Fall 2026 cycle, July 15 – Sept 1 per
-- https://www.boell.de/en/scholarships). Off by ~6 months on a row
-- the prior researcher pass had stamped 'match 0.97'. This is exactly
-- the silent-failure class the new audit cron is meant to catch.
--
-- Other authoritative corrections from this pass — applications OPEN now:
--   - Eric Bleumink: Dec 1 2026 confirmed (rug.nl/.../eric-bleumink-fellowship)
--   - Soros: Oct 29 2026 14:00 ET confirmed (pdsoros-fellowships.smapply.io)
--   - UNSW Scientia: Jun 18 2026 23:59 AEST confirmed (scholarships.unsw.edu.au)
--
-- Several rows verified as cycle-closed / next-not-posted → mark inferred:
--   - Aga Khan ISP (the.akdn) — 2026/27 closed, next early 2027
--   - Eiffel Excellence (campusfrance.org) — 2026 closed Jan 8
--   - Czech Government (msmt.gov.cz) — 2026/27 was Sep 30 2025
--   - SIDS Scholarships (un-ihe.org) — 2025 closed, next pattern Jun 1 2026
--   - Swiss ESKAS (sbfi.admin.ch) — 2027/28 apps OPEN Aug 20 2026 (close TBD)
--   - Fulbright Foreign Student (fulbrightonline.org) — country-specific
--
-- ASBS Glasgow Business School: scholarship CLOSED 18 May 2026 (page says
-- "This scholarship is now closed"). Stored 2027-02-23 is wrong. Marking
-- inferred + audit-log flag; admin should decide whether to unpublish.
--
-- Finland Government Scholarships: studyinfinland.fi/scholarships page
-- says "there are no governmental scholarships for bachelor's or master's
-- studies in Finland." Row may be misclassified. Audit-log flag only;
-- not auto-unpublishing because the row may refer to something real
-- under a different name.

INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  -- ─── AUTHORITATIVE FUTURE (applications open / dates published) ───
  ('34624548-ac45-422d-99d6-51ec89f1b0d1'::uuid, '2027-03-01'::date, '2027-03-01'::date, '2026-09-01'::date,
   'https://www.boell.de/en/scholarships',
   'mismatch', 0.95, 'samuel-manual-2026-05-27-p2',
   'Heinrich Boell Fall 2026 cycle: 15 Jul–1 Sep 2026. Stored 2027-03-01 was 6 months off and is the wrong direction.'),

  ('4e973b07-bdf3-4d56-b228-6c71739da08d'::uuid, '2026-12-01'::date, NULL, '2026-12-01'::date,
   'https://www.rug.nl/education/scholarships/eric-bleumink-fellowship?lang=en',
   'match', 0.92, 'samuel-manual-2026-05-27-p2',
   'Eric Bleumink: master application deadline 1 Dec 2026 (nominations follow admission). Stored correct.'),

  ('4fb8cd49-c1d6-4846-b574-969d32de0cab'::uuid, '2026-10-29'::date, '2026-11-01'::date, '2026-10-29'::date,
   'https://pdsoros-fellowships.smapply.io/prog/2027_application_for_the_paul_and_daisy_soros_fellowships_for_new_americans/',
   'match', 0.97, 'samuel-manual-2026-05-27-p2',
   'Soros 2027 fellowship deadline 29 Oct 2026 14:00 ET ("No exceptions"). Stored correct.'),

  ('2bf37203-4382-4849-9163-4dadb72bccd2'::uuid, '2026-06-18'::date, NULL, '2026-06-18'::date,
   'https://www.scholarships.unsw.edu.au/scholarships/id/1957/7176',
   'match', 0.97, 'samuel-manual-2026-05-27-p2',
   'UNSW Scientia (PUCA1025): closes 23:59 AEST 18 Jun 2026. Stored correct.'),

  -- ─── INFERRED (cycle closed, next not posted, stored = pattern guess) ───
  ('d4f0633e-d296-4752-87ce-f14aaf4bdad9'::uuid, '2027-03-31'::date, '2027-02-28'::date, NULL,
   'https://the.akdn/our-agencies/aga-khan-foundation/international-scholarship-programme',
   'inconclusive', 0.70, 'samuel-manual-2026-05-27-p2',
   'Aga Khan ISP 2026/27 closed; next cycle opens early 2027. Stored Mar 31 2027 is plausible pattern inference.'),

  ('eb818888-2bba-4d90-909e-f0f968514101'::uuid, '2027-01-08'::date, NULL, NULL,
   'https://www.campusfrance.org/en/france-excellence-eiffel-scholarship-program',
   'inconclusive', 0.75, 'samuel-manual-2026-05-27-p2',
   'Eiffel Campus France institutional deadline was 8 Jan 2026 for 2026 campaign. Next cycle TBD. Stored Jan 8 2027 plausible.'),

  ('0f01e341-de98-45c2-8139-189d07b68457'::uuid, '2026-09-30'::date, '2025-09-30'::date, NULL,
   'https://msmt.gov.cz/eu-and-international-affairs/government-scholarships-developing-countries',
   'inconclusive', 0.75, 'samuel-manual-2026-05-27-p2',
   'Czech Govt 2026/27 deadline was 30 Sep 2025. Stored 2026-09-30 = expected next cycle close. No 2027/28 date posted yet.'),

  ('ae45bd1d-426b-43ba-ae15-86bebfafc68c'::uuid, '2026-06-01'::date, '2026-06-01'::date, NULL,
   'https://www.un-ihe.org/education/master-programmes/sids-scholarships',
   'inconclusive', 0.75, 'samuel-manual-2026-05-27-p2',
   'SIDS IHE Delft page shows 1 Jun 2025 as last cycle close. Stored 2026-06-01 is the expected next-cycle date. Mark inferred.'),

  ('fd80e6d1-1a15-4a17-b99c-c3dba0daf888'::uuid, '2026-08-31'::date, '2026-08-31'::date, NULL,
   'https://www.sbfi.admin.ch/sbfi/en/home/education/scholarships-and-grants/swiss-government-excellence-scholarships.html',
   'inconclusive', 0.65, 'samuel-manual-2026-05-27-p2',
   'Swiss ESKAS 2027/28: applications OPEN starting 20 Aug 2026; close date not specified on page. Stored Aug 31 2026 may be too early — apps just open 11 days before. Flag for re-verification once close posted.'),

  ('b926be32-3dc6-45c4-81af-2e689b9a2455'::uuid, '2026-06-05'::date, NULL, NULL,
   'https://foreign.fulbrightonline.org/about/foreign-student-program',
   'inconclusive', 0.40, 'samuel-manual-2026-05-27-p2',
   'Fulbright Foreign Student deadlines are country-specific (per official page: "vary widely by country"). Jun 5 may apply to one country; not universal. Catalog row would ideally be split by country.'),

  -- ─── SUSPECT / NEEDS HUMAN DECISION ───
  ('c612f3f0-bebe-45bc-a0af-20692c8ba8d3'::uuid, '2027-02-23'::date, NULL, NULL,
   'https://www.gla.ac.uk/scholarships/asbsglobalimpactscholarship/',
   'mismatch', 0.95, 'samuel-manual-2026-05-27-p2',
   'ASBS Glasgow Global Impact: scholarship CLOSED 18 May 2026 ("This scholarship is now closed" per page). Stored 2027-02-23 unsupported. Admin: decide unpublish vs wait for next cycle.'),

  ('d856466f-1829-4703-93d1-17969918d4e6'::uuid, '2027-02-15'::date, NULL, NULL,
   'https://www.studyinfinland.fi/scholarships/finland-scholarships',
   'inconclusive', 0.40, 'samuel-manual-2026-05-27-p2',
   'studyinfinland.fi page says "no governmental scholarships for bachelor''s or master''s studies in Finland." Row may be misclassified — could refer to a specific university program tagged with a national name. Flag for admin review.');

-- ─── APPLY corrections ─────────────────────────────────────────────────

-- HEINRICH BÖLL: critical 6-month fix
UPDATE public.scholarships
SET application_deadline   = '2026-09-01'::date,
    canonical_deadline_iso = '2026-09-01'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false
WHERE scholarship_id = '34624548-ac45-422d-99d6-51ec89f1b0d1'::uuid;

-- ERIC BLEUMINK + SOROS + UNSW SCIENTIA: confirm authoritative — clear
-- is_deadline_inferred (defaults to false anyway, but be explicit) and
-- align canonical with stored.
UPDATE public.scholarships
SET canonical_deadline_iso = '2026-12-01'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false
WHERE scholarship_id = '4e973b07-bdf3-4d56-b228-6c71739da08d'::uuid;

UPDATE public.scholarships
SET canonical_deadline_iso = '2026-10-29'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false
WHERE scholarship_id = '4fb8cd49-c1d6-4846-b574-969d32de0cab'::uuid;

UPDATE public.scholarships
SET canonical_deadline_iso = '2026-06-18'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = false
WHERE scholarship_id = '2bf37203-4382-4849-9163-4dadb72bccd2'::uuid;

-- INFERRED set: cycles closed, next not posted, stored is pattern-based.
-- Each gets is_deadline_inferred=true so UI shows "Typically [Month]".
UPDATE public.scholarships
SET is_deadline_inferred = true
WHERE scholarship_id IN (
  'd4f0633e-d296-4752-87ce-f14aaf4bdad9'::uuid,  -- Aga Khan
  'eb818888-2bba-4d90-909e-f0f968514101'::uuid,  -- Eiffel
  '0f01e341-de98-45c2-8139-189d07b68457'::uuid,  -- Czech Government
  'ae45bd1d-426b-43ba-ae15-86bebfafc68c'::uuid,  -- SIDS IHE Delft
  'fd80e6d1-1a15-4a17-b99c-c3dba0daf888'::uuid,  -- Swiss ESKAS
  'b926be32-3dc6-45c4-81af-2e689b9a2455'::uuid,  -- Fulbright Foreign Student
  'c612f3f0-bebe-45bc-a0af-20692c8ba8d3'::uuid,  -- ASBS Glasgow (also closed)
  'd856466f-1829-4703-93d1-17969918d4e6'::uuid   -- Finland Government (suspect)
);

-- Re-evaluate gates on every row touched
DO $$
DECLARE v_id UUID;
BEGIN
  FOR v_id IN VALUES
    ('34624548-ac45-422d-99d6-51ec89f1b0d1'::uuid),
    ('4e973b07-bdf3-4d56-b228-6c71739da08d'::uuid),
    ('4fb8cd49-c1d6-4846-b574-969d32de0cab'::uuid),
    ('2bf37203-4382-4849-9163-4dadb72bccd2'::uuid),
    ('d4f0633e-d296-4752-87ce-f14aaf4bdad9'::uuid),
    ('eb818888-2bba-4d90-909e-f0f968514101'::uuid),
    ('0f01e341-de98-45c2-8139-189d07b68457'::uuid),
    ('ae45bd1d-426b-43ba-ae15-86bebfafc68c'::uuid),
    ('fd80e6d1-1a15-4a17-b99c-c3dba0daf888'::uuid),
    ('b926be32-3dc6-45c4-81af-2e689b9a2455'::uuid),
    ('c612f3f0-bebe-45bc-a0af-20692c8ba8d3'::uuid),
    ('d856466f-1829-4703-93d1-17969918d4e6'::uuid)
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
  END LOOP;
END $$;
