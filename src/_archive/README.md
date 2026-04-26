# Archive

Code preserved during the **Ship-Ready Cut** (2026-04-26).

Nothing in here is imported anywhere. Tree-shaken from production bundle.
Restore by moving files back to `src/...` and re-wiring routes/imports.

## What's here

- **discover-v1/** — original universal university database (filters, world map, heatmaps, profile gate, etc.). Replaced by lean Scholarship Finder.
- **prep-v1/** — 18 prep sub-pages (Tutor, Mock Exam, XP Store, Leaderboard, etc.) hidden behind "Coming Soon" until polished.
- **academy-v1/** — content library components when Academy was a paywalled product. Now a launch landing page.
- **consulting-v1/** — multi-hour packages requiring 1:1 time (Standard, Premium). Kept only Starter + Strategy + free 20-min.
- **membership-v1/** — Pro tier code, earned-trial flywheel components. Now single Founding tier only.

## Restoration order if reviving

1. Read the page/component back into `src/`
2. Re-add the route in `src/App.tsx` if a page
3. Re-add nav/sidebar entry
4. Verify imports still resolve (some shared components may have been edited)
