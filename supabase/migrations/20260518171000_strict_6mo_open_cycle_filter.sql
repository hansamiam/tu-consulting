-- 2026-05-18 final: User direction "only ones that have recently been
-- posted and have been scraped and have actual relevant upcoming
-- cycle that has been opened entries should be there. None of this
-- oh I'm just gonna forward it 1 year and assume haha April 2027
-- deadline".
--
-- Tighten the visible-catalog filter to ONLY rows with a concrete
-- future deadline within the next 6 months. NULL deadlines /
-- far-future deadlines / "annual reopens" without a published next-
-- cycle date are killed. The Discover frontend fetch will enforce
-- the same window so post-cleanup re-scrapes that ingest a thin
-- "annual" row can't pollute the surface.
--
-- 106 rows archived (169 → 63 visible). 62 of 63 remaining have an
-- open deadline within the window. The 1 row without is intentionally
-- left active (deadline_type='reopens_annually' flagship in a
-- pre-cycle quiet state — verify-cron will pick up its real date).

UPDATE scholarships SET lifecycle_status = 'inactive', updated_at = now()
WHERE lifecycle_status IN ('active','reopens_annually')
  AND (
    application_deadline IS NULL OR
    application_deadline > now() + interval '6 months'
  );
