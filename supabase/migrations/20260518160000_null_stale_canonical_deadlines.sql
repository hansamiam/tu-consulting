-- 2026-05-18 HOTFIX: User reported "a billion entries with deadlines way
-- past 12 months ago" on Discover. Root cause: canonical-extract had
-- captured prior-cycle deadlines (2024-10-31, 2025-11-07, 2026-01-08)
-- months ago and never refreshed them. The frontend was blindly
-- promoting `canonical_deadline_iso ?? application_deadline` which
-- surfaced these stale dates as the visible deadline even though
-- scrape-source had since refreshed the live application_deadline to
-- a 2027 cycle.
--
-- 15 visible rows were affected. NULL out canonical_deadline_iso on
-- any row where it's either:
--   (a) already in the past, OR
--   (b) older than the live application_deadline.
-- canonical-extract-cron (6h cadence) will repopulate from the source
-- page on its next pass.
--
-- Companion frontend fix in src/pages/Discover.tsx hardens the
-- canonical-promotion logic so even a future stale value can't
-- override a fresher application_deadline.

UPDATE scholarships
SET canonical_deadline_iso = NULL,
    canonical_deadline_at = NULL,
    updated_at = now()
WHERE canonical_deadline_iso IS NOT NULL
  AND (
    canonical_deadline_iso::date < CURRENT_DATE
    OR (application_deadline IS NOT NULL AND canonical_deadline_iso < application_deadline)
  );
