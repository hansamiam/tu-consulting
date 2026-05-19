-- 2026-05-18: Stop the scholarshipsads.com listing-page pollution.
--
-- The scholarship_sources table had two listing-blog URLs categorised
-- as category='official' (not 'aggregator'):
--   - /blog/fully-funded-scholarships-for-afghanistan-students-march2026
--   - /blog/fully-funded-scholarships-for-kenyan-students-march2026
-- Both are listicle round-up articles that mention 15-20 different
-- scholarships in a single page. scrape-source's LLM extraction
-- happily extracted each mention as its own row with confidence=0.85
-- (clearing the auto-publish gate), producing 20 generic-content rows
-- in one tick:
--   * "Romania Government Scholarships" with award "Covers all
--     expenses for non-EU citizens"
--   * "Stanford University Scholarship" with no deadline
--   * etc.
--
-- These are exactly the thin garbage rows the user wants out of the
-- catalog. Fix:
--   1. Mark all 20 polluted rows lifecycle_status='inactive'
--      (handled by 20260518150500_archive_scholarshipsads_listing_pollution
--      via apply_migration earlier today).
--   2. Set is_active=false on the two listing-blog sources so the
--      dispatcher stops crawling them. Their individual-program
--      cousins (e.g. /korea-university-global-ku-scholarships-*,
--      /qatar-government-scholarships-*) stay active — those have
--      one program per page and produce decent rows.
--
-- Note: the deeper structural fix (have scrape-source's prompt reject
-- pages whose markdown describes "list of N scholarships" rather than
-- one program) is a future hardening task. For now this targeted
-- deactivation stops the bleeding.

UPDATE scholarship_sources
SET is_active = false,
    updated_at = now()
WHERE url IN (
  'https://www.scholarshipsads.com/blog/fully-funded-scholarships-for-afghanistan-students-march2026',
  'https://www.scholarshipsads.com/blog/fully-funded-scholarships-for-kenyan-students-march2026'
);

UPDATE scholarships
SET lifecycle_status = 'inactive',
    updated_at = now()
WHERE source_url IN (
  'https://www.scholarshipsads.com/blog/fully-funded-scholarships-for-afghanistan-students-march2026',
  'https://www.scholarshipsads.com/blog/fully-funded-scholarships-for-kenyan-students-march2026'
)
AND lifecycle_status IN ('active','reopens_annually');
