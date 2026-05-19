-- 2026-05-18: Archive 12 ultra-thin / single-faculty / stale-year visible
-- rows per user direction: "ones that aren't currently relevant unless
-- they are super famous ones that for sure are annual and have a
-- predictable deadline and cycle we should get rid of them for now".
-- All targeted rows have NULL application_deadline AND a name pattern
-- that fails the "would a student recognize this as a flagship?" gate
-- (generic single-word names, 2020-vintage year-stamped rows, hyper-
-- niche single-PhD-position openings).
--
-- Set lifecycle_status='inactive' rather than DELETE so:
--   1. The rows vanish from Discover (active-only filter).
--   2. scrape-source can reactivate them automatically (see the
--      reactivatePayload path) when a future crawl returns a concrete
--      deadline + high confidence.
--   3. Evidence trail / canonical_audit preserved.

UPDATE scholarships
SET lifecycle_status = 'inactive',
    updated_at = now()
WHERE scholarship_id = ANY(ARRAY[
  '558555cc-79ec-47e0-9cd8-eb384cb20732'::uuid,  -- Academic Scholarship (Inha Tashkent)
  'b54896a6-4217-4524-8b60-100b67989697'::uuid,  -- Aryabhata Science Scholarship (UCD)
  '77287b05-0490-4221-a3e4-83ea10727f5f'::uuid,  -- Bilateral Exchange of Academics (DAAD)
  'ec945542-bfd4-4170-83ae-d5c0df239a22'::uuid,  -- Emerging Voices Journalism Fellowship
  '342a5b13-59a1-4396-80ec-1608997c1072'::uuid,  -- ETH4D Mentorship Programme
  '8f24b5d8-85e5-4cc7-8239-a9d82e1a7f12'::uuid,  -- Government Grant (Uzbekistan)
  '4cf34535-8ae8-4f5e-9b5c-92e0f83004a2'::uuid,  -- India Scholars (SWE)
  '7e576f35-7951-473c-aa77-af90bde01848'::uuid,  -- International Student Scholarships (UCD)
  'c4233ad4-5dc3-4f48-904d-d732c5b5fa32'::uuid,  -- PhD Scholarship in Archaeo-geochemistry
  '523ad9e2-da96-41fc-8b10-d77999ac9f40'::uuid,  -- Scholarly Communications Lab 2020/2021
  'ccc426d4-09d9-4ede-ad9a-dbcc582a5848'::uuid,  -- UCD Global Excellence Scholarship
  'a45319eb-69ef-4633-b969-5769643f796d'::uuid   -- UCD School of Earth Sciences
]);
