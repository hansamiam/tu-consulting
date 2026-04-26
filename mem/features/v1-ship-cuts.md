---
name: V1 ship cuts
description: Discover→Scholarships finder pivot, Academy→ComingSoon, consulting packages hidden, Founding 100 chip in nav. Old code in src/_archive.
type: feature
---
**V1 product surface (post-cut, Apr 2026)**

- `/discover` and `/discover/ru` now route to the new Scholarship Finder (`src/pages/Scholarships.tsx`). Old universal university DB lives in `src/_archive/discover-v1/`.
- `/scholarships` is the canonical URL — pulls from `public.scholarships` joined with `universities` (country, city, website). Filters: country, coverage_type, verified-only, free-text search.
- `/academy` is now a **Coming Soon landing** (`src/pages/Academy.tsx`) with waitlist email capture (table `waitlist_emails`) + Founding upsell. Old gated library archived to `src/_archive/Academy.tsx`. AcademyPrototype also archived.
- Consulting packages section (`#packages`) in both `Offerings.tsx` and `OfferingsRu.tsx` is wrapped in `{false && (...)}` — preserved but hidden. Consultations section is the primary CTA, anchor `#consultations`.
- `Navigation.tsx` primary nav: Home · TopUni AI · Scholarships · Prep · Academy · Consulting. Live "Founding · X/100 left" chip via `<FoundingSpotsChip />` reads `founding_member_counter` table; hidden once user is already founding tier.
- Single Founding tier ($9/mo, $90/yr, 100 spots cap) is the only paid offering. No more Pro vs Founding tiering.
- Prep "Focus 4" still: Diagnostic, Practice, Essay Grader, Study Plan. 17 archived to `_archive/prep-v1` behind `<ComingSoon />`.

**To restore later:** flip the `{false && ` wrappers in Offerings, restore Academy.tsx from archive, swap App.tsx Discover route back to `_archive/discover-v1/Discover.page.tsx`.
