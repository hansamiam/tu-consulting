# Resume notes — eligibility + deadlines work pinned 2026-05-27

Beta v1 ships with the eligibility + deadline work that's already in main.
This file lists what's done and what was deliberately pinned for later.

## What's live as of 2026-05-27 evening

### Deadlines (PR #173 merged)
- `is_deadline_inferred` flag on `scholarships` — true when `application_deadline` was forward-rolled from a past `canonical_deadline_iso`.
- Card pin: time-until format (`12mo`, `8mo`) — no "Typically May 2027" language.
- Detail right-pullup: `TBD (typically May)` — month only, no year.
- Promote-trigger `trg_promote_canonical_deadline` rewritten to (a) supersede inferred rows when a future authoritative canonical date arrives (clears the flag), and (b) roll forward stale canonical dates for newly-discovered annual programs. New canonical-extract output flows through automatically.

### Eligibility (PR #176 merged + PR #178 pending review)
- Matcher recognizes the full inclusive vocab (`any`, `worldwide`, `open to international`, etc) — not just literal "all countries".
- `not_eligible` rows sort to bottom (not hidden) — supports "browsing for a friend/student".
- Red "not open to your nationality" ribbon on card + full banner in detail panel — **gated on `audit_status='verified'`** so we don't false-warn on unreliable data.
- Schema columns: `eligibility_verified_at`, `eligibility_audit_status` (`unverified`/`verified`/`suspicious`/`broken`), `eligibility_audit_notes`.
- View `public.suspicious_eligibility_rows` flags 5 known-bad data shapes.
- Catalog: **89 of 98 published rows verified** (was 0).
- The 16 LLM-default `["India","Pakistan"]` hallucinations cleaned (NULLed + flagged broken). Finland Government Scholarships unpublished (program literally doesn't exist).

## Pinned for future — picked up in order of priority

### 1. Country-list expansions for the 5 still-unverified published rows
| scholarship_id | name | what's needed |
|---|---|---|
| `f0a4858a-a445-432a-af6c-406abb724ac3` | Islamic Dev Bank Merit | All 57 IsDB member states (currently 12) |
| `3844b7d2-f8b3-44eb-aca7-5e57acc5e109` | Stipendium Hungaricum | Full 100+ partner countries (currently 6 CIS only) |
| `34b8b4b8-0a61-48a7-8245-e44d79be4a74` | Swedish Institute SISGP | Full 34-country list (currently 7) |
| `84a95009-6cde-415a-ac72-3badb1092629` | Humboldt Intl Climate Protection | Fetch eligibility PDF from humboldt-foundation.de |
| `97cf8d74-cdb2-40d2-a893-27fcf7536ba3` | UNFCCC Fellowship 2026 | Enumerate SIDS + LDC countries |

For each: `UPDATE scholarships SET eligible_countries=ARRAY[...]::text[], eligibility_audit_status='verified', eligibility_verified_at=now() WHERE scholarship_id='...';`

### 2. Audit cron + admin surface
Edge function `audit-eligibility-cron` that:
- Reads from `public.suspicious_eligibility_rows`
- Picks N rows/day (e.g. 5) and dispatches each to a web-research mini-agent
- Updates `eligibility_audit_status` based on the result
- Logs to a new `eligibility_audit_log` table (one row per check)

Admin surface at `/admin/eligibility`:
- Table view of `suspicious_eligibility_rows`
- One-click "re-extract" button per row → fires the cron's per-row path
- Edit field for manual `eligible_countries` override + verified-by-human flag

### 3. Re-extract the 159 broken/NULLed rows
These are mostly unpublished (got nuked when LLM-default detection ran). They have NULL eligibility now. To get them back into the catalog:
- Trigger `verify-scholarship` with a stricter prompt that refuses to default to `["India","Pakistan"]`
- Block re-publish unless `audit_status` graduates from `broken` to `verified` OR `unverified`

### 4. Tighten the canonical-extract prompt
`supabase/functions/canonical-extract/index.ts` produces `canonical_eligible_countries` (separate field from `eligible_countries` proper). The LLM-default hallucination originated in `verify-scholarship`'s extraction. Audit that prompt and add an explicit "if you can't extract a country list, return null — NEVER default to ['India','Pakistan']".

### 5. Deadline audits — only 4 rows inferred so far
`SELECT * FROM scholarships WHERE is_deadline_inferred AND is_published` — keep this list small as new annual rows get discovered. The trigger rolls forward automatically, but the canonical_deadline_iso could itself be wrong (Rhodes June 30 was an opening date, not a deadline). Sweep monthly.

### 6. UI polish (low priority)
- The destructive ribbon on the card is unstyled in dark mode — verify it reads correctly.
- Consider a "Show ineligible too" / "Hide ineligible" toggle in the filter panel, since the existing `filters.onlyEligible` is technically there but isn't surfaced as a clearly-labeled control.

## What's NOT pinned — explicitly killed or punted
- Per-card sticky-note notepad on Saved view (killed in PR #173).
- Hard-filter ineligible by default (reverted in PR #178 after product decision).
- Per-profile deep-dive (already deferred pre-session per existing memory).

## Files / commits touched this session
- `supabase/migrations/20260527075000_infer_annual_deadlines.sql` (PR #171 — pre-session)
- `supabase/migrations/20260527180000_inferred_deadline_supersede_on_authoritative.sql` (PR #173)
- `supabase/migrations/20260527200000_eligibility_data_quality.sql` (PR #178 pending)
- `src/pages/Discover.tsx` — matcher fix, audit_status field, warning ribbon
- `src/pages/DiscoverApp.tsx` — same matcher fix for /discover/app route
- `src/components/discover/ExpandedScholarshipDialog.tsx` — detail-panel banner

## Verification one-liners
```sql
-- Catalog health
SELECT eligibility_audit_status, COUNT(*) FROM scholarships WHERE is_published GROUP BY 1;

-- Today's deadline state
SELECT scholarship_name, application_deadline, canonical_deadline_iso, is_deadline_inferred FROM scholarships WHERE is_deadline_inferred AND is_published;

-- Suspicious queue
SELECT scholarship_name, flags FROM public.suspicious_eligibility_rows WHERE is_published;
```
