-- One-shot data repair based on self-verified WebFetch + curl pass
-- against the 2026-05-27 published catalog.
--
-- Earlier researcher pass returned hallucinated dates (MasterCard UP was
-- stamped 'match 0.90' when the URL actually showed June 5 for the
-- Makerere partner — and the UP page is bot-blocked so we never got a
-- real read). We do NOT seed the audit-log with the researcher's claims.
-- Only confirmations done by hand below are seeded; everything else gets
-- picked up by the audit-deadlines cron over the coming days.
--
-- Repair principle (from feedback_typically_month_no_year.md and
-- feedback_topuni_deadline_priority.md):
--   1. If an OFFICIAL page shows an authoritative FUTURE deadline →
--      set application_deadline + canonical_deadline_iso to that date,
--      is_deadline_inferred=false (the UI will render the real date).
--   2. If only a PAST cycle is visible (no next-cycle dates announced) →
--      keep a reasonable forward inference as application_deadline,
--      record the past-cycle date in canonical_deadline_iso,
--      is_deadline_inferred=true (the UI will render "Typically [Month]"
--      — no year, because pinning a year defeats the word "typically").
--   3. For rows we COULDN'T verify here (bot-blocked, no fetcher access),
--      do nothing in this migration. The audit-deadlines cron will sweep
--      them nightly and surface mismatches via /admin/deadline-audit.

-- ─── Seed audit-log with rows confirmed via WebFetch / curl by hand ────
INSERT INTO public.deadline_audit_log
  (scholarship_id, stored_at_audit, canonical_at_audit, observed_deadline,
   observed_source, status, confidence, verifier, notes)
VALUES
  -- AUTHORITATIVE FUTURE — page shows the next cycle's exact deadline
  ('4a66983e-6aae-439b-966a-4501abecbf8b'::uuid, '2026-09-09'::date, NULL, '2026-09-09'::date,
   'https://www.schwarzmanscholars.org/admissions/',
   'match', 0.97, 'samuel-manual-2026-05-27',
   'Schwarzman: applications OPEN — US + Global Class of 2027-28 deadline 9 Sep 2026 15:00 EDT.'),

  ('b84942b4-aaf0-4245-95a1-300f5a6afaa8'::uuid, '2026-08-28'::date, NULL, '2026-08-28'::date,
   'https://www.jsps.go.jp/english/e-inv/application/index.html',
   'match', 0.95, 'samuel-manual-2026-05-27',
   'JSPS Invitational FY2027 1st recruitment deadline 28 Aug 2026 17:00 JST (per official page).'),

  ('c148df1f-74b2-4245-811a-85f4740d9bd8'::uuid, '2026-05-31'::date, NULL, '2026-05-31'::date,
   'https://bolashak.gov.kz/en/scholarship-program',
   'match', 0.97, 'samuel-manual-2026-05-27',
   'Bolashak 2026 cycle: applications 30 Mar–31 May 2026, deadline 23:59 Astana. Stored correct.'),

  -- HUMBOLDT — researcher said rolling; ACTUALLY 3 fixed calls/yr
  ('8fcad3e2-ea59-4db3-b093-eb324d1b266b'::uuid, '2026-11-30'::date, '2026-07-15'::date, '2026-07-15'::date,
   'https://www.humboldt-foundation.de/en/apply/sponsorship-programmes/humboldt-research-fellowship',
   'mismatch', 0.95, 'samuel-manual-2026-05-27',
   'NOT rolling. Three fixed calls/year (Mar 15, Jul 15, Nov 15). Next call 15 Jul 2026, selection Mar 2027, fellowship start May 2027. Stored 2026-11-30 misleading; correct next-call date 2026-07-15.'),

  -- INFERRED — past cycle visible, next cycle not yet posted
  ('3def6181-6a3f-4e4b-a664-5938d7d5676b'::uuid, '2026-10-14'::date, '2025-12-31'::date, NULL,
   'https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/',
   'inconclusive', 0.80, 'samuel-manual-2026-05-27',
   'Commonwealth Master''s 2026/27 closed; 2027/28 dates not posted. Stored Oct 14 2026 is reasonable pattern inference.'),

  ('725cbefa-5783-4957-8ae7-d6976b1e7d47'::uuid, '2026-10-14'::date, NULL, NULL,
   'https://cscuk.fcdo.gov.uk/scholarships/commonwealth-phd-scholarships-for-least-developed-countries-and-vulnerable-states/',
   'inconclusive', 0.80, 'samuel-manual-2026-05-27',
   'Commonwealth PhD 2026/27 closed; 2027/28 dates not posted. Stored Oct 14 2026 plausible.'),

  ('9b65f2c9-94b1-4871-9213-57351b7989dc'::uuid, '2026-12-09'::date, '2026-03-31'::date, NULL,
   'https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships-applications/',
   'inconclusive', 0.80, 'samuel-manual-2026-05-27',
   'Commonwealth Shared 2026/27 closed; 2027/28 dates not posted. Stored Dec 9 2026 plausible pattern.'),

  ('65bb647a-ead9-48a6-b820-568702f6f9d0'::uuid, '2027-03-31'::date, '2026-06-30'::date, NULL,
   'https://cscuk.fcdo.gov.uk/scholarships/commonwealth-distance-learning-scholarships-candidates/',
   'inconclusive', 0.80, 'samuel-manual-2026-05-27',
   'Commonwealth Distance Learning 2026/27 closed; 2027/28 dates not posted. Stored Mar 31 2027 plausible.'),

  ('262a3821-8dcf-4886-b16e-9d9eed11677b'::uuid, '2026-10-15'::date, '2026-09-30'::date, NULL,
   'https://www.gatescambridge.org/apply/timeline/',
   'inconclusive', 0.75, 'samuel-manual-2026-05-27',
   'Gates Cambridge: 2026/27 closed. Next opens Sep 2026 (US October round, Global December/January). Exact day not yet pinned.'),

  ('0311e4fb-adb8-45da-ac1d-926c6125473e'::uuid, '2026-10-31'::date, '2026-03-25'::date, NULL,
   'https://www.rotary-yoneyama.or.jp/english/news/detail_736.html',
   'inconclusive', 0.80, 'samuel-manual-2026-05-27',
   'Rotary Yoneyama 2026 cycle (Oct 1–31 2025) closed. 2027-cycle dates not yet posted.'),

  ('39562207-ca39-4294-9373-5ae96c66154a'::uuid, '2027-01-15'::date, '2026-02-16'::date, NULL,
   'https://www.lunduniversity.lu.se/admissions/bachelors-masters-studies/scholarships-awards/lund-university-global-scholarship',
   'mismatch', 0.85, 'samuel-manual-2026-05-27',
   'Lund Global 2026 closed 16 Feb 2026 (matches canonical). Stored Jan 15 is wrong month. Next 2027 cycle opens early Feb 2027, expected ~Feb 16.'),

  ('84a95009-6cde-415a-ac72-3badb1092629'::uuid, '2027-02-01'::date, '2026-02-10'::date, '2027-02-10'::date,
   'https://www.humboldt-foundation.de/en/apply/sponsorship-programmes/international-climate-protection-fellowship',
   'mismatch', 0.85, 'samuel-manual-2026-05-27',
   'Intl Climate Protection: 2026 closed 10 Feb 2026. Next round opens autumn 2026. Stored Feb 1 wrong date; expected close ~10 Feb 2027.'),

  ('a72fa28b-4d74-42aa-be21-a91817adb573'::uuid, '2027-02-02'::date, '2027-02-28'::date, NULL,
   'https://www.uu.se/en/study/masters-studies/scholarships/uppsala-university-scholarships',
   'inconclusive', 0.75, 'samuel-manual-2026-05-27',
   'Uppsala Global 2026 closed; next opens early 2027, exact day not announced. Stored Feb 2 2027 plausible pattern. Canonical Feb 28 unsupported by page.'),

  ('3844b7d2-f8b3-44eb-aca7-5e57acc5e109'::uuid, '2027-01-15'::date, '2026-12-31'::date, NULL,
   'https://stipendiumhungaricum.hu/apply/',
   'inconclusive', 0.78, 'samuel-manual-2026-05-27',
   'Stipendium Hungaricum 2026/27 closed Jan 15 2026 14:00 CET. Next cycle dates not posted yet. Stored Jan 15 2027 plausible pattern.'),

  ('d5d04dd9-4d71-44f7-a46f-ed8784862c19'::uuid, '2027-02-28'::date, '2026-09-30'::date, NULL,
   'https://www.vliruos.be/get-funded/calls/icp-connect-scholarships-2026-2027',
   'inconclusive', 0.75, 'samuel-manual-2026-05-27',
   'VLIR-UOS general call 2026-27 closed 28 Feb 2026. Programme-specific deadlines vary. Stored Feb 28 2027 plausible pattern.');

-- ─── Apply repairs ──────────────────────────────────────────────────────

-- HUMBOLDT: confirmed next-call date — set authoritative, not inferred
UPDATE public.scholarships
SET application_deadline    = '2026-07-15'::date,
    canonical_deadline_iso  = '2026-07-15'::date,
    canonical_deadline_at   = now(),
    is_deadline_inferred    = false,
    deadline_type           = 'annual'  -- correct: 3 fixed calls/year, NOT rolling
WHERE scholarship_id = '8fcad3e2-ea59-4db3-b093-eb324d1b266b'::uuid;

-- INTERNATIONAL CLIMATE PROTECTION: stored wrong date; replace with inferred pattern
UPDATE public.scholarships
SET application_deadline    = '2027-02-10'::date,
    canonical_deadline_iso  = '2026-02-10'::date,
    canonical_deadline_at   = now(),
    is_deadline_inferred    = true
WHERE scholarship_id = '84a95009-6cde-415a-ac72-3badb1092629'::uuid;

-- LUND: stored wrong month; replace with inferred pattern
UPDATE public.scholarships
SET application_deadline    = '2027-02-16'::date,
    canonical_deadline_iso  = '2026-02-16'::date,
    canonical_deadline_at   = now(),
    is_deadline_inferred    = true
WHERE scholarship_id = '39562207-ca39-4294-9373-5ae96c66154a'::uuid;

-- COMMONWEALTH cluster: cycles closed, next not posted → mark inferred
-- (date pattern is already reasonable, just hadn't been flagged)
UPDATE public.scholarships
SET canonical_deadline_iso = '2025-10-14'::date,
    canonical_deadline_at  = now(),
    is_deadline_inferred   = true
WHERE scholarship_id = '3def6181-6a3f-4e4b-a664-5938d7d5676b'::uuid;

UPDATE public.scholarships
SET is_deadline_inferred = true
WHERE scholarship_id IN (
  '725cbefa-5783-4957-8ae7-d6976b1e7d47'::uuid,  -- Commonwealth PhD
  '9b65f2c9-94b1-4871-9213-57351b7989dc'::uuid,  -- Commonwealth Shared
  '65bb647a-ead9-48a6-b820-568702f6f9d0'::uuid,  -- Commonwealth Distance Learning
  '262a3821-8dcf-4886-b16e-9d9eed11677b'::uuid,  -- Gates Cambridge
  '0311e4fb-adb8-45da-ac1d-926c6125473e'::uuid,  -- Rotary Yoneyama
  'a72fa28b-4d74-42aa-be21-a91817adb573'::uuid,  -- Uppsala
  '3844b7d2-f8b3-44eb-aca7-5e57acc5e109'::uuid,  -- Stipendium Hungaricum
  'd5d04dd9-4d71-44f7-a46f-ed8784862c19'::uuid   -- VLIR-UOS
);

-- Re-evaluate publish gate on every repaired row — changes to
-- application_deadline / is_deadline_inferred / deadline_type can affect
-- G8 (deadline freshness) and adjacent gates.
DO $$
DECLARE v_id UUID;
BEGIN
  FOR v_id IN VALUES
    ('8fcad3e2-ea59-4db3-b093-eb324d1b266b'::uuid),
    ('84a95009-6cde-415a-ac72-3badb1092629'::uuid),
    ('39562207-ca39-4294-9373-5ae96c66154a'::uuid),
    ('3def6181-6a3f-4e4b-a664-5938d7d5676b'::uuid),
    ('725cbefa-5783-4957-8ae7-d6976b1e7d47'::uuid),
    ('9b65f2c9-94b1-4871-9213-57351b7989dc'::uuid),
    ('65bb647a-ead9-48a6-b820-568702f6f9d0'::uuid),
    ('262a3821-8dcf-4886-b16e-9d9eed11677b'::uuid),
    ('0311e4fb-adb8-45da-ac1d-926c6125473e'::uuid),
    ('a72fa28b-4d74-42aa-be21-a91817adb573'::uuid),
    ('3844b7d2-f8b3-44eb-aca7-5e57acc5e109'::uuid),
    ('d5d04dd9-4d71-44f7-a46f-ed8784862c19'::uuid)
  LOOP
    PERFORM public.evaluate_publish_gate_for(v_id);
  END LOOP;
END $$;
