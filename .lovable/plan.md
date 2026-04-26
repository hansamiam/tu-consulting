# Ship-Ready Cut Plan

The product has 5 startups inside it. We're going to make it one. This plan **archives** code rather than deleting it (so nothing is lost) and reframes the value prop around a single Founding Member offer + Academy waitlist.

---

## The new positioning (one sentence)

> "TopUni — the AI-powered scholarship discovery platform and admissions academy. Get founding access for $9/mo, locked forever."

Everything below serves that sentence.

---

## 1. Discover → Scholarships-only pivot

**Today:** Universal university database with filters, watchlist, compare drawer, world map, tuition heatmap, field analytics, program finder, can-I-get-in dialog, smart recs, deadline tracker, cost calculator, profile gate. ~22 components.

**New:** A focused **"Scholarship Finder"** — only universities with scholarships for international students, surfaced by country / field / deadline / coverage type.

### Changes
- Rename route: `/discover` stays for SEO; page heading becomes "Scholarship Finder".
- Archive current Discover components into `src/_archive/discover-v1/` (move, don't delete — preserves work).
- New `Discover.tsx` rebuilt around the existing `scholarships` table (already in DB) joined to `universities`.
- Keep only these UI pieces: filters (country, field, deadline, coverage), results list, scholarship detail dialog, save-to-watchlist, deadline tracker.
- Cut: world map, heatmap, program finder, can-I-get-in, smart recs, field analytics, profile gate, compare drawer.
- Russian version `/discover/ru` mirrors the same.
- **Membership tie-in:** Free users see top 10 scholarships per filter. Founding members see all + export + email alerts.

---

## 2. Prep → "Focus 4, hide the rest"

**Today:** 22 sub-pages, most shallow.

### Keep & polish (the "Focus 4")
1. **Diagnostic** — high-signal hook, drives email capture
2. **Practice (adaptive quiz)** — already wired to milestone tracking
3. **Essay Grader** — your most defensible AI demo, real value
4. **Study Plan** — output of the diagnostic, gives a reason to come back

### Hide behind "Coming Soon"
The other 18 (Tutor, Mock Exam, Achievements, Spaced Review, Skill Radar, IELTS Flashcards, Writing Templates, SAT Words, Formula Sheet, XP Store, Daily Challenges, Leaderboard, Focus Timer, Mistake Journal, Progress Report, Reading Analyzer, Analytics).

### How
- Each page replaced with a single `ComingSoonCard` component: title, 1-line value prop, "Notify me when ready" email capture (writes to `waitlist_emails` with a `feature` tag).
- Sidebar items for these get a small "Soon" badge + lock icon, but stay visible (signals momentum).
- Original page code moved to `src/_archive/prep-v1/` — easy to restore one at a time as we polish them.
- PrepLayout sidebar reorganized: "Available Now" section (the 4) on top, "Coming Soon" section below.

---

## 3. Consulting → Strip to self-serve only

**Today:** Multiple packages, some requiring heavy 1:1 time (Standard, packages with hours included).

**New:** Two SKUs only:
1. **Free 20-min discovery call** (lead magnet → Calendly)
2. **Strategy Session — $X one-off** (single paid call, no ongoing commitment)

### Changes
- `src/pages/Offerings.tsx` + `OfferingsRu.tsx`: hide all multi-hour packages and recurring-time packages. Keep them in code commented/archived.
- Update `PackageDetailDialog`, `PaymentDialog`, intake flow to reflect just the two options.
- Homepage CTAs: primary = "Join Founding Membership", secondary = "Book free 20-min call".

---

## 4. Academy → "Coming Soon" hero, Founding-only waitlist

**Today:** Empty content library wrapped in a $29 paywall.

**New:** Academy page becomes a **launch landing page**, not a product.
- Hero: "TopUni Academy — launching with founding members."
- Below: 6-tile preview of what's coming (Application Vault, Scholarship Bootcamp, Essay Workshops, Country Guides, Office Hours, AMA Library) — each with "In production" badge.
- Single CTA: "Founding members get full access at launch — claim your spot ($9/mo locked forever)."
- Email capture for non-founders: "I want to know when Academy opens."
- Archive `ContentCard`, `ContentFilters`, `ContentPreviewDialog`, `LearningPaths`, `academyContent.ts` data — leave the components, just don't render them.

---

## 5. Membership → ONE tier: Founding $9/mo

**Today:** Free / Pro $29/$290 / Founding $19/$190 (capped 100). Earned trial. Pro paywall everywhere.

**New:** Free / **Founding $9/mo or $90/yr** (capped 100). That's it.

### What Founding unlocks
- Full Scholarship Finder (vs. top 10 for free)
- Academy access at launch (currently: waitlist priority + monthly progress emails)
- All Prep "Coming Soon" tools as they ship — for free, forever
- Monthly 60-min group office hours (Zoom, Nurzada or Samuel)
- Lifetime price lock at $9/mo even after public launch raises to $29
- Founding-member badge in account + on community channels

### Changes
- `Pricing.tsx`: rebuilt as **one card**, not three. Big "X of 100 spots left" counter. Annual toggle ($90 = save 17%). Comparison row vs. "Future Public Price $29/mo".
- Stripe: deactivate the Pro prices in our config (keep them in Stripe dashboard). Create new Founding $9/$90 prices and update `create-subscription-checkout`.
- Remove the "Pro" tier from `subscription_tier` enum usage in code (DB enum can stay; we just stop writing 'pro').
- **Kill the earned-trial flywheel for now.** It's complexity we can't justify — there's only one tier and it's already cheap. Archive `EarnedTrialBanner`, `useTrackMilestone` hook stays (might use for upsell prompts later), `track-milestone` edge function stays but no longer activates trials. Remove banner from `App.tsx`.
- `PaywallGate` simplified: just shows "Founding Membership $9/mo" CTA, no Pro/Founding split.
- Account page: simpler — show membership status, billing portal button, founding-member number badge.

---

## 6. Navigation cleanup

`src/components/Navigation.tsx`:
- Primary nav: **Home / Scholarships / Academy / Prep / Pricing / Book a call**
- Remove: Discover Pro badge, Pro/Founding split badges (just "Founding Member" if active)
- "Founding 100" countdown chip in nav when spots remain (drives urgency on every page)

---

## 7. What we're NOT touching

- Email infrastructure (it's solid, leave it)
- Auth + profiles + Google sign-in (working)
- Calendly integration + booking flow (working)
- TopUni AI chat / pathway tool (working, on-brand demo)
- Admin dashboards
- Legal pages, blog, country guides, FAQ, team, why-tu

---

## 8. Archive structure (so nothing is lost)

```text
src/_archive/
  discover-v1/        ← all current discover components + Discover.tsx
  prep-v1/            ← the 18 prep pages we're hiding
  academy-v1/         ← academy components + content data
  consulting-v1/      ← removed packages + related dialogs
  membership-v1/      ← Pro tier code, earned-trial system
README.md             ← explains what's archived and why
```

Nothing in `_archive/` is imported anywhere. Tree-shaken out of the bundle. Easy to restore.

---

## Technical execution order

1. Create `_archive/` structure + README
2. Membership simplification: new Stripe prices + Pricing page + checkout function
3. Discover pivot: archive old, build Scholarship Finder on existing `scholarships` table
4. Prep cleanup: build `ComingSoonCard`, swap 18 pages, reorganize sidebar
5. Academy: rebuild as launch landing page
6. Consulting: hide multi-hour packages
7. Navigation: cleanup + Founding 100 chip
8. Remove EarnedTrialBanner from App.tsx, clean up unused PaywallGate variants
9. QA pass: every route loads, no orphan imports, Stripe sandbox checkout works for $9 Founding

---

## What "shippable" looks like after this

- **One** clear paid offer ($9 Founding, 100 spots) with a real deadline mechanic
- **One** working data product (Scholarship Finder) with free/paid split
- **One** lead-magnet AI demo (TopUni AI chat)
- **One** consulting CTA (free 20-min call)
- Everything else either polished-and-shipped (Focus 4 prep, Academy waitlist) or honestly "Coming Soon" with email capture

Estimated work: ~1 long session. Most of it is *deletion and reorganization*, not new building. That's what makes it fast.
