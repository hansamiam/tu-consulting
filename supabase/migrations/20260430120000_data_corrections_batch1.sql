-- Data corrections — batch 1 (manual fact-check against official sources, 2026-04-30)
-- See DATA_AUDIT.md at repo root for full methodology and findings.
--
-- Each UPDATE below carries:
--   • the field(s) corrected
--   • what the DB previously said (in this comment)
--   • the source URL we verified against
--
-- All entries also have last_verified_date bumped to today so the UI's
-- "Verified X · may be stale" badge reflects real, hand-checked dates.

-- ─── Rhodes Scholarships ─────────────────────────────────────────────
-- WAS: 'Full Oxford tuition + ~GBP 18,000 living stipend'
-- The 2025-26 stipend is £20,400/year (£1,700/month) and the official
-- award explicitly includes travel, visa fees, health surcharge, and a
-- settling allowance.
-- Source: https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/
UPDATE public.scholarships
SET
  award_amount_text  = 'Full Oxford tuition + £20,400/year stipend (£1,700/month) + travel + visa + health surcharge + settling allowance',
  last_verified_date = '2026-04-30'
WHERE scholarship_name = 'Rhodes Scholarships';

-- ─── Eiffel Excellence Scholarship ───────────────────────────────────
-- WAS: 'Under 29 (Masters); under 33 (PhD)'
-- The official Campus France page lists age limits of 29 (Master's) and
-- 35 (PhD). Our PhD ceiling was wrong by two years and would have caused
-- some 33-35 year-old PhD applicants to assume they were ineligible.
-- Source: https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence
UPDATE public.scholarships
SET
  age_limit          = 'Under 29 (Masters); under 35 (PhD)',
  last_verified_date = '2026-04-30'
WHERE scholarship_name = 'Eiffel Excellence Scholarship';
