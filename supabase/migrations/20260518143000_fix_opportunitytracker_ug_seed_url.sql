-- 2026-05-18: Fix the opportunitytracker.ug hub seed URL.
--
-- The original seed used `opportunitiestracker.ug` (with "ies"), which
-- doesn't have working DNS. The actual user-flagged must-include hub
-- is `opportunitytracker.ug` (no "ies"), and its scholarship category
-- lives at /single-category-2/scholarships/ (verified via direct
-- WebFetch — returned 6 fresh posts including Ferguson, Mastercard,
-- and DAAD-TRAJECTS).
--
-- Result post-fix: a single discover-from-hub run against this hub
-- inserted 12 new scholarship URLs into scholarship_sources, all
-- 2026/27 cycle entries — which is exactly the "recently posted
-- scholarships are missing" gap the user flagged earlier today.
--
-- Reset last_crawled_at + last_success_at to NULL so the next hubs-cron
-- tick picks it up with priority.

UPDATE scholarship_sources
SET url = 'https://opportunitytracker.ug/single-category-2/scholarships/',
    last_crawled_at = NULL,
    last_success_at = NULL,
    consecutive_failures = 0,
    updated_at = now()
WHERE source_id = '5e90e2d0-4946-4d8c-807d-002bc0de17c5'
  AND name = 'Opportunities Tracker — Scholarships';

-- The Fellowships variant likely uses /single-category-2/fellowship/
-- (singular, per the menu copy). Left in place for now — user can
-- confirm by editing or letting the next discovery cycle attempt it.
