-- 2026-05-18: Round 2 of non-scholarship pollution sweep. After the
-- prompt update and the first archive batch, a hunt for "fellowship/
-- prize/youth programme/young leaders" patterns without degree-funding
-- signals found 6 more confirmed non-degree rows:
--
--   - Asia Journalism Fellowship 2026 — mid-career journalism cohort
--   - The Open Notebook Early-Career Fellowship — science journalism career
--   - GOAL's NextGen Youth Programme — €400 stipend youth programme
--   - ICMM Young Leaders Scholarships — One Young World Summit attendance
--   - Bonn Climate Camp Bridge Programme 2026 — short-stay climate camp
--   - 2026 Kofi Annan NextGen Democracy Prize — $10K prize + event attendance
--
-- Same EXCLUDE patterns now in the scrape-source SYSTEM_PROMPT will
-- prevent these from re-emerging on the next scrape pass.

UPDATE scholarships SET lifecycle_status = 'inactive', updated_at = now()
WHERE scholarship_id IN (
  'b01540b8-ff7a-43bf-9a6d-7f96229ed11c',  -- Asia Journalism Fellowship (AJF) 2026
  '6cdf23d7-416d-46e3-b8e6-f704bb8440ad',  -- The Open Notebook Early-Career Fellowship
  '3fa55249-0bd6-4fdd-8efc-4f713f5f3c09',  -- GOAL NextGen Youth Programme
  '456f4dd0-f174-4609-ac48-5431a0e11383',  -- ICMM Young Leaders Scholarships
  '67bcd4ad-6681-4462-902c-27c86a4ba9ef',  -- Bonn Climate Camp Bridge Programme 2026
  '84bf047c-ccdb-4c2f-8c19-129ef2bc0911'   -- 2026 Kofi Annan NextGen Democracy Prize
);
