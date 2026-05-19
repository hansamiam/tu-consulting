-- 2026-05-18 round 3: more pollution archived as the hub-discovery rush
-- pushed dozens of fresh URLs through the pipeline.
--
--   - Early Career Fellowship / "Trust"          → generic LLM hallucination
--   - New International Scholarship Opportunities → placeholder row, no degree
--   - The Admit PhD Prep Fellowship              → PhD-application prep program (not a degree fellowship)
--   - Canadian Journalism Scholarship            → $750 award, below catalog threshold
--
-- All four landed BEFORE the discover-from-hub URL filter (a separate
-- commit in this branch) extended its name-pattern guard. The newly
-- shipped scrape-source SYSTEM_PROMPT + discover-from-hub
-- isLikelyScholarshipUrl rejections should prevent the equivalent
-- patterns from re-emerging at the next scrape pass.

UPDATE scholarships SET lifecycle_status = 'inactive', updated_at = now()
WHERE scholarship_name IN (
  'Early Career Fellowship',
  'New International Scholarship Opportunities Monthly',
  'The Admit PhD Prep Fellowship',
  'Canadian Journalism Scholarship'
)
AND lifecycle_status IN ('active','reopens_annually');
