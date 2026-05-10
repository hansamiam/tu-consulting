-- Drop founding-member cap from 100 → 50 for the early-access cohort.
--
-- Rationale: 50 gives ~6-8 weeks of organic signup runway at this stage
-- of the business. By week 3 scarcity reads as "almost full", which is
-- when the urgency lever actually works. 100 dilutes — by founder #100
-- the cohort feels neither exclusive nor early-access.
--
-- The follow-on tier (planned) is a "launch discount" cohort at 50% off
-- year one for the next 200-500 members. Two scarcity ladders, each
-- with a name customers can grasp in one breath.
--
-- Idempotent: only updates if the row exists and the cap is still the
-- old default (100). Manual cap edits won't be clobbered.
update public.founding_member_counter
set cap = 50
where id = 1
  and cap = 100;
