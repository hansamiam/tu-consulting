-- 2026-05-18: Institution-affiliation audit pass.
-- User direction: "audit non-institution-affiliated rows... kill Food Corps
-- and similar non-institutional fellowships... should still be mostly
-- scholarships and fellowship only [if] institution affiliated like for
-- master's or PhD doctoral type fellowship".
--
-- Criteria for KILL:
--   1. Aggregator-sourced official_url (fastweb / iefa / topuniversities /
--      educations.com / mastersportal / scholars4dev) — not the program's
--      canonical institutional page.
--   2. Corporate vendor promos (MPOWER Financing lender scholarships,
--      Numerix fintech vendor, Western Union foundation) — these are
--      marketing devices, not academic programs.
--   3. Shortened / hallucinated source URLs (lnkd.in, chatgpt utm_source,
--      random WordPress blog subdomains).
--   4. Staff/leadership fellowships (ACU Expert Group is for university
--      staff, not students; Atlantic Dialogues is a leadership program,
--      not a degree scholarship).
--   5. Duplicate rows (Ferguson appears twice — keep the institution-
--      provider variant).
--
-- 28 rows deactivated. Visible catalog 63 → ~35.

UPDATE scholarships SET lifecycle_status='inactive', updated_at=now()
WHERE scholarship_id IN (
  'd39fba23-6cf0-4f1c-a5f3-8c280482c0e8', -- Studyportals Scholarship
  'f335ef38-8b9d-4b18-a91a-4e68f2ea86ac', -- MBA Deans Award (topuniversities signup link)
  '022af61d-6f4a-4999-9df2-86ccaae50950', -- Florence PhD (chatgpt utm_source)
  '2e10f94f-9066-4b26-804f-9823f0b98b54', -- Ben Hines Memorial (fastweb)
  '375de43f-3159-435f-8d3b-d5cfe794499a', -- Western Union Global Fellowship (watson.is)
  '32f3d953-3c32-4942-b726-de17d319907b', -- MPOWER Chasing Dreams (iefa)
  '2422b831-83c8-4bc6-80d4-e43ad47af9a1', -- MPOWER MBA (iefa)
  '5d9302b9-a929-44e0-9e2f-895e866370b0', -- MPOWER Women in STEM (iefa)
  '3fa4f56f-5375-4519-8625-4f3fb3135695', -- Paul D. Coverdell Fellowship (iefa)
  '3cab5392-f5a3-4154-825a-49aa4324a97c', -- Rule of Law (iefa)
  '9eae58b2-0288-493a-86f5-8606c0b8b557', -- Andrew W. Mellon Turning the Tide (iefa)
  'a2a3d577-a639-414d-8afc-69ae2b1845dd', -- UMSU Global (topuniversities aggregator)
  '4bb119a5-e41c-4b62-9857-730f4a878fa2', -- UWE Bristol (topuniversities aggregator)
  'f1563553-f227-4f5b-b4c7-176969989e54', -- Sheffield MBA Scheme (topuniversities aggregator)
  'e4d375b8-a1a0-4b10-8e5b-6ad4f1319363', -- Joanne Holbrook Patton Military Spouse (fastweb)
  '0aacdba8-504a-4a33-a686-85fc173d2ea6', -- Bachelor's USA Scholarship (educations.com aggregator)
  'dd908706-1f5e-4b70-8aec-060f63827030', -- Western Caspian University (iefa)
  '5cfdbd53-73df-44a2-b617-25cf2863c19a', -- LUISS Fashion Food (iefa + wrong host_country)
  'fc593fc1-62d4-41e9-8763-942b6a3771da', -- Master Cooperation Development (lnkd.in)
  '435bd7aa-d30f-463c-8995-f1b2f6695468', -- Port Harcourt TAGDev (UNHCR Rwanda wp-content)
  '55fe86f1-73fb-450f-8920-89c83e876d64', -- DAAD-Procope (blogs.uni-bielefeld blog post)
  '010ce5df-ad0e-4e5f-9e40-3a239a8fba45', -- Numerix Women in Finance (corporate vendor)
  'df808294-3836-4bd8-b74e-41d4d3142c7b', -- ACU Expert Group Fellowships (for university staff, not students)
  '07bd2cb5-aace-4296-879b-415ee8cc20c5', -- Audi Environmental Foundation (corporate philanthropy)
  '99a73f74-53a4-4a71-a136-685cbf986d03', -- Atlantic Dialogues Emerging Leaders (leadership program, not degree scholarship)
  '01daa117-fb92-40ce-bdaa-125eaf13bf1e', -- Veterans and Family Scholarship (fastweb)
  '7b506e89-42f1-4977-96fb-39a0295a5203', -- Ferguson duplicate (kept Aston University variant)
  '52449def-fd38-4d0b-9c5c-e489a5a8dd56'  -- Switzer Fellowship (US env foundation, not institution-tied)
);
