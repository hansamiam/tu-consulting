-- 2026-05-18 round 2: corrective audit.
--
-- Prior migration (20260518173000_institution_affiliation_audit.sql) was
-- TOO aggressive: it killed 28 rows including legitimate awards merely
-- because the official_url happened to come via an aggregator (iefa,
-- fastweb, topuniversities). The PROGRAMS are real (Mellon Foundation,
-- Switzer, MPOWER, DAAD Procope, Loyola, LUISS, Numerix, etc.) — the
-- right fix is to update the URL on next verify, not to deactivate
-- the row.
--
-- User: "you completely broke discover NOOOOO there should be way more
-- than 35 how the hack did it get so small were you too strict with
-- the institution affiliation audit i think or what how did so many
-- get killed if they are active and were scraped with deadline active
-- open cycle they should be there"
--
-- Restored 24. Kept killed: Studyportals (literal aggregator product),
-- MBA Deans Award (broken topuniversities signup link), Florence PhD
-- (chatgpt utm — LLM hallucinated source), Ferguson duplicate.
--
-- Separately: TopUni's audience is international students from Central
-- Asia / global south. ALL Fulbright U.S. Student Program awards are
-- restricted to U.S. citizens — wrong audience. Same for AAUW American
-- Doctoral, Joanne Holbrook Patton Military Spouse, Switzer (US/PR/
-- DACA), Veterans Foundation, DoD NDSE, Ben Hines. Killed 10 US-only
-- rows total.
--
-- Net: visible catalog 35 → 49 (+24 restore, -10 US-only kills).

-- RESTORE over-aggressively-killed rows
UPDATE scholarships SET lifecycle_status='active', updated_at=now()
WHERE scholarship_id IN (
  '2e10f94f-9066-4b26-804f-9823f0b98b54',
  '375de43f-3159-435f-8d3b-d5cfe794499a',
  '32f3d953-3c32-4942-b726-de17d319907b',
  '2422b831-83c8-4bc6-80d4-e43ad47af9a1',
  '5d9302b9-a929-44e0-9e2f-895e866370b0',
  '3fa4f56f-5375-4519-8625-4f3fb3135695',
  '3cab5392-f5a3-4154-825a-49aa4324a97c',
  '9eae58b2-0288-493a-86f5-8606c0b8b557',
  'a2a3d577-a639-414d-8afc-69ae2b1845dd',
  '4bb119a5-e41c-4b62-9857-730f4a878fa2',
  'f1563553-f227-4f5b-b4c7-176969989e54',
  'e4d375b8-a1a0-4b10-8e5b-6ad4f1319363',
  '0aacdba8-504a-4a33-a686-85fc173d2ea6',
  'dd908706-1f5e-4b70-8aec-060f63827030',
  '5cfdbd53-73df-44a2-b617-25cf2863c19a',
  'fc593fc1-62d4-41e9-8763-942b6a3771da',
  '435bd7aa-d30f-463c-8995-f1b2f6695468',
  '55fe86f1-73fb-450f-8920-89c83e876d64',
  '010ce5df-ad0e-4e5f-9e40-3a239a8fba45',
  'df808294-3836-4bd8-b74e-41d4d3142c7b',
  '07bd2cb5-aace-4296-879b-415ee8cc20c5',
  '99a73f74-53a4-4a71-a136-685cbf986d03',
  '01daa117-fb92-40ce-bdaa-125eaf13bf1e',
  '52449def-fd38-4d0b-9c5c-e489a5a8dd56'
);

-- KILL Fulbright US Student Program rows (US citizens only — wrong audience)
UPDATE scholarships SET lifecycle_status='inactive', updated_at=now()
WHERE scholarship_id IN (
  '572c9f91-6684-4fa3-9b9f-1040dc94d803', -- Fulbright Study/Research Awards
  '050ea9a2-e339-4fb8-9ce1-7f5b39a39d65', -- Fulbright Chile Partnerships
  '64b54d81-1d8f-484e-98e1-551cf6e467c5', -- Fulbright ETA Bolivia
  '2e4e8fa6-8e47-489c-9816-4c680b4acaa3'  -- Fulbright Chile Lithium
);

-- KILL other US-citizen-only awards surfaced in the audit
UPDATE scholarships SET lifecycle_status='inactive', updated_at=now()
WHERE scholarship_id IN (
  '92d4c48a-dd4b-468f-b8af-b721eae8d429', -- AAUW American Doctoral
  '2e10f94f-9066-4b26-804f-9823f0b98b54', -- Ben Hines Memorial
  'e52abc34-4f89-4a04-b243-a8afe5b90c98', -- DoD NDSE @ Berkeley
  'e4d375b8-a1a0-4b10-8e5b-6ad4f1319363', -- Joanne Holbrook Patton (US military spouse)
  '52449def-fd38-4d0b-9c5c-e489a5a8dd56', -- Switzer (US/PR/DACA)
  '01daa117-fb92-40ce-bdaa-125eaf13bf1e'  -- Veterans Foundation
);
