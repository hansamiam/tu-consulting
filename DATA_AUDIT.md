# Scholarship Data Audit

**Last updated:** 2026-04-30
**Scope:** All 42 scholarships across migrations `20260426183806_*` and `20260427120000_add_scholarships_batch2.sql`.

## TL;DR

The scholarship database was generated in two large LLM batches. Every row in batch 1 carries `last_verified_date = '2026-04-26'` and every row in batch 2 carries `'2026-04-27'` — a strong signal that no entry was independently fact-checked against the official source before publication. Treat all factual fields (deadlines, GPAs, fees, stipends, age limits, eligibility) as **unverified by default** until they appear in this audit log.

## Methodology

For each scholarship listed below, we fetch the official URL stored in `official_url` and compare verifiable, factual fields against what the DB has. We only correct a field when the official source explicitly states a different value. Where the official site is silent on a field, we flag the DB value as "unverifiable" rather than assume it is wrong.

Verified corrections are shipped as one SQL migration per batch (`supabase/migrations/2026MMDDhhmmss_data_corrections_batchN.sql`). Each migration also bumps the row's `last_verified_date` so the UI's "may be stale" badge reflects real verification dates.

## Batch 1 corrections — 2026-04-30

Two scholarships hand-verified, two corrections shipped in `20260430120000_data_corrections_batch1.sql`.

### ✓ Rhodes Scholarships — `award_amount_text` updated
- **Was:** `Full Oxford tuition + ~GBP 18,000 living stipend`
- **Now:** `Full Oxford tuition + £20,400/year stipend (£1,700/month) + travel + visa + health surcharge + settling allowance`
- **Why:** 2025-26 stipend is £20,400 — the previous figure was both stale (~13% low) and missing the explicit travel / visa / health-surcharge / settling-allowance benefits that the official page lists.
- **Source:** [rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship](https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/)

### ✓ Eiffel Excellence Scholarship — `age_limit` corrected
- **Was:** `Under 29 (Masters); under 33 (PhD)`
- **Now:** `Under 29 (Masters); under 35 (PhD)`
- **Why:** The DB had the PhD ceiling wrong by two years. Campus France's official page states 29 / 35.
- **Source:** [campusfrance.org/en/eiffel-scholarship-program-of-excellence](https://www.campusfrance.org/en/eiffel-scholarship-program-of-excellence)
- **Notes from the source page (no DB change required):**
  - 2026 application window: opens Oct 1 2025, closes **January 8, 2026**.
  - Only French institutions can submit applications — students cannot apply directly. The DB already captures this in `application_platform` and `effort_reason`.

## Confirmed (no DB change required)

These rows match official sources well enough to leave alone for now:

- **Erasmus Mundus Joint Masters** — DB says "Apply directly to specific consortia (Dec-Feb deadlines)"; official EU page says "submit your application between October and January for courses starting the following academic year." Close enough, varies by consortium.
- **Schwarzman Scholars** — DB describes a Master's at Tsinghua, "Highly Selective"; official page confirms Master of Global Affairs at Tsinghua, ~150-200 scholars/year.
- **Gates Cambridge Scholarship** — DB describes Cambridge full funding for international applicants; official site confirms this. Specific stipend / fee figures not surfaced on the homepage so left untouched.
- **Knight-Hennessy Scholars** — `citizenship_requirements: 'Open to all nationalities'` is correct (this is what the official site says); the previous UI rendered it as a "Citizenship: Open to all nationalities" *restriction* row which has since been fixed via the `isInclusive()` UI helper in `Discover.tsx`.

## Unverified

The remaining 38 rows in the DB **have not yet been hand-checked**. Several fields are particularly likely to drift or be stale:

- **`application_deadline`** — almost every program shifts its deadline year-over-year.
- **`min_gpa` / `min_ielts` / `min_toefl` / `min_sat`** — many were inferred from "typical" thresholds, not the official requirement.
- **`application_fee_text`** — fees update in single-digit dollar increments most years.
- **`partner_universities`** lists for consortium scholarships — partner sets shift between cohorts.
- **`eligible_countries`** for country-specific schemes (Chevening, OSI, Erasmus Mundus partner-country quotas) — these *do* change.

## Suggested next batches

Priority for batch 2 (high value, well-documented official sources):

1. **Chevening** — verify required work-experience hours (DB: 2,800 hrs / ~2 years) and post-study return obligation duration.
2. **Fulbright Foreign Student** — verify the dual-citizen exclusion and J-1 home-residency rule.
3. **MEXT (both rows)** — verify the embassy-vs-university recommendation routes and exact stipend amounts (¥143,000 and ¥147,000 are common quoted figures).
4. **Mastercard Foundation Scholars** — verify the Africa-only constraint and 70/30 fee/cost-of-living split.
5. **Vanier CGS** — verify the 3-year, $50,000/year structure and PhD-only restriction.

Each batch should ship as its own migration (not a big-bang rewrite).

## Tooling notes

- WebFetch against several official URLs failed or timed out during the batch-1 sweep (Knight-Hennessy admit page, Chevening eligibility page, Schwarzman key-dates, Fulbright eligibility, Stipendium Hungaricum). Some pages 404 because the structure has changed; others rate-limited. Future batches should retry with alternative URLs or accept manual verification.
- The UI already exposes a "Report inaccuracy" mailto link on every scholarship's DetailSheet footer. As students start using the product, that channel becomes the cheapest source of corrections.
