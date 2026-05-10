# Scholarship data corrections — 2026-05-09

Companion doc to migration `supabase/migrations/20260509090000_emergency_catalog_corrections.sql`.

Source of findings: `docs/scholarship_verification_2026-05.md`.

## What the migration does

Idempotent UPDATE-only migration. No INSERTs, no DELETEs. Bounded by `verification_status` checks so re-running is a no-op.

| Scholarship | New `verification_status` | Visible to public? | Why |
|---|---|---|---|
| Mastercard Foundation Scholars | `broken` | No | Sub-Saharan Africa only — Kazakh/Kyrgyz ineligible everywhere |
| Vanier CGS | `broken` | No | Discontinued after Fall 2024; replaced by CGRS-D |
| Chevening | `stale` | Yes (with new deadline) | Between cycles; deadline updated to 2026-10-07; flagged for re-verify |
| Fulbright FFSP | `stale` | Yes | NEEDS manual deadline per country (KG 2026-06-05 / KZ 2026-07-15) |
| MEXT Embassy-recommended | `stale` | Yes | Stipend discrepancy across sources; needs eyeball |

## What you still need to do manually

These are content decisions, not auto-applicable:

1. **Add CGRS-D as a replacement row for Vanier.** Verified data:
   - Provider: Tri-Agency (NSERC / SSHRC / CIHR), Government of Canada
   - Award: CAD $40,000/yr for up to 3 years (doctoral)
   - Eligibility: PhD students at Canadian institutions; nominated by university
   - URL: https://vanier.gc.ca/en/home-accueil.html (transitional landing)

2. **Disambiguate Fulbright rows by country.** Open `/admin/scholarships-verification`, filter by status=`stale`, find each Fulbright row, and:
   - If KG: set `application_deadline = 2026-06-05`, status=`verified`
   - If KZ: set `application_deadline = 2026-07-15`, status=`verified`
   - If row is generic / global: split into two rows (KG + KZ) or scope `host_country` and add a country-specific note.

3. **Eyeball MEXT undergrad stipend** — confirm against `kz.emb-japan.go.jp` and `kg.emb-japan.go.jp` then promote to `verified`.

4. **Re-verify Chevening in August 2026** when the 2027/28 cycle opens.

## How to apply

```bash
cd /Users/samuel/tu-consulting
supabase db push
```

The migration prints `RAISE NOTICE` lines showing how many rows each block affected. If a count is 0 for Mastercard or Vanier, the seeded data didn't include those rows under those names — check the Discover page directly.

## Marketing-time-sensitive

**Fulbright KG deadline is 5 June 2026 — 27 days from now.** Once the row is verified, this is your single best founding-cohort hook for Bishkek students. Surface prominently on the landing page or Telegram outreach.
