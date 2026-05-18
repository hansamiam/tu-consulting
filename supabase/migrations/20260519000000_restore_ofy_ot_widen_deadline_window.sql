-- 2026-05-19: User direction: "basically everything in the scholarships
-- tag section of opportunitiesforyouth.org and opportunitytracker.ug
-- that deadline hasn't passed should be there".
--
-- Two changes:
--   1. Reactivate 10 OFY/OT rows that were killed during the prior
--      institution-affiliation audit but have legit future deadlines.
--      Keep killed: Ferguson duplicate (7b506e89), University of Florence
--      PhD (chatgpt utm hallucination), Finland Government 2027-02-15
--      (sourced from 2023 OFY article).
--   2. Widen the visible deadline window from "next 6 months" to "any
--      open deadline" (no upper bound). With the LLM auto-roll-forward
--      function disabled (migration 20260518170000) and stale-vintage
--      sources killed, far-future deadlines are now trustworthy when
--      they exist. The 6-month cap was a defensive measure against
--      hallucinated 2027 deadlines — no longer needed.

UPDATE scholarships SET lifecycle_status='active', updated_at=now()
WHERE scholarship_id IN (
  'b01540b8-ff7a-43bf-9a6d-7f96229ed11c', -- Asia Journalism Fellowship (NUS)
  '2f6302de-b6b4-4b20-a302-db55812f769e', -- UJohannesburg Post-Doctoral
  'd7520952-47c0-4756-a74e-641b9c99ad6c', -- Regent Global-Pankaj Award
  '2bb42854-c185-401d-9640-160acd391644', -- Simmons Distinguished Scholar
  '67bcd4ad-6681-4462-902c-27c86a4ba9ef', -- Bonn Climate Camp Bridge
  'abe91336-aef7-401f-ba77-c1b538e5c64f', -- TRAJECTS Masters (DAAD)
  '6204843b-eb88-4a2a-a902-de1a06b4c475', -- Rotary Water/Sanitation
  '648a5078-d43a-4a05-bc42-7da85fe60e47', -- Univ Siena International
  'f795f474-d0af-4f81-a819-4e408bd2b15a', -- German Bundestag IPS 2027
  '1130dbdc-1f50-4491-b828-e7f571dbe19c'  -- Shaun Johnson Memorial
);
