-- 2026-05-18: User reported "leaking a bunch of non scholarship stuff —
-- random tiny microgrants for non scholarships or random small
-- conferences shouldn't be there." Targeted archive of 5 confirmed
-- non-degree-scholarship rows:
--
--   * Google Conference Scholarships (Africa) — conference travel only
--   * DAAD Co-funded Research Grants Short-Term — research stipend,
--     not a degree program
--   * Vital Voices VV Engage Fellowship — leadership training cohort
--   * WMF Empowerment Through Education ($300-$3000/yr) — too small
--     to materially fund a degree
--   * Savvy Global Fellowship for Aspiring & Early-Stage Entrepreneurs —
--     entrepreneur training, no degree
--
-- Structural fix (paired): scrape-source's SYSTEM_PROMPT was updated
-- in the same commit to add an explicit WHAT IS A SCHOLARSHIP /
-- EXCLUDE section enumerating these patterns so the LLM rejects
-- them at extraction time going forward.

UPDATE scholarships SET lifecycle_status = 'inactive', updated_at = now()
WHERE scholarship_id IN (
  '5a410812-2811-4843-ae40-53cae6d44799',  -- DAAD Short-Term Grants
  '45b9ff34-91ab-449c-8294-cf56f7e12a57',  -- Google Conference Scholarships (Africa)
  'eb6d79e7-51f0-49c6-99a8-49c0ba87cfc2',  -- Vital Voices VV Engage Fellowship 2026
  'fd7ec5c5-d074-419c-9eee-b81f9695eae4',  -- WMF Empowerment Through Education
  '154bf8b6-c81d-49be-80e0-aa2ff76ce07f'   -- Savvy Global Fellowship for Aspiring Entrepreneurs
);
