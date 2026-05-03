# Scholarship Data Pipeline Audit

**Date:** 2026-05-03
**Scope:** Every code path that creates, modifies, or summarizes scholarship facts (deadline, funding, eligibility, country, name, URL).
**Goal:** Establish ground rules so LLMs only **summarize** verified DB fields and **never invent** them.

---

## 1. Current state — how data enters the database

### 1.1 Manual / hand-curated entry (80 rows · 36% of DB)

Hand-curated scholarship rows are created by SQL migrations. These rows are
audited by a human before they land. `data_source = 'hand_curated'`.

Files:
- `supabase/migrations/20260408063315_*.sql` — initial seed
- `supabase/migrations/20260426183806_*.sql` — flagship batch
- `supabase/migrations/20260427120000_add_scholarships_batch2.sql` — batch 2

Trust level: **HIGH**. These were hand-typed against an authoritative source.

### 1.2 Manus research import (145 rows · 64% of DB)

A one-shot research dataset, prepared offline (presumably with Manus AI),
ingested via `scholarships_research_intake` staging table and then
promoted to live with `last_verified_date = '2026-05-02'`.
`data_source = 'manus_ai_2026_05_03'`.

Files:
- `supabase/migrations/20260502021845_add_data_source_and_intake_table.sql`
- `supabase/migrations/20260502021900_load_manus_research_intake.sql`
- `supabase/migrations/20260502021910_promote_manus_research_to_live.sql`

Trust level: **MEDIUM**. The data is from a research pass with an external
LLM, then bulk-promoted. Not re-verified against source URLs after promotion.

### 1.3 Live web scrape via `scrape-source` edge function

Active pipeline — runs hourly via `scholarship-scrape-dispatcher` cron.
For each row in `scholarship_sources` (currently 50 sources), `scrape-source`:

1. Fetches the URL via Firecrawl
2. Extracts structured data via the AI gateway with a strict JSON schema
3. Validates: required fields present, confidence ∈ [0,1]
4. Clamps numerics into reasonable bounds (USD ≤ $5M, GPA ≤ scale, etc.)
5. Intra-run de-dups via canonical_key
6. **Auto-publishes** if confidence ≥ 0.85; otherwise sends to `scholarships_staging` for human review
7. Updates `last_verified_date` + `verified=false` (default) on auto-publish

`data_source` is set to `'scraped'` for these rows (when added by this
pipeline; the existing 80+145 rows predate this).

Trust level: **MEDIUM**. The LLM is constrained by the schema and the
confidence gate, but it's still extracting from semi-structured HTML and
can mis-assign fields.

Files:
- `supabase/functions/scrape-source/index.ts`
- `supabase/functions/scrape-cron-dispatcher/index.ts`
- `supabase/functions/_shared/firecrawl.ts`

### 1.4 Sources of truth

`scholarship_sources` table (50 active rows) holds the authoritative URLs:
DAAD, Chevening, Fulbright, Schwarzman, Rhodes, Gates Cambridge,
Knight-Hennessy, Erasmus Mundus, Australia Awards, MEXT, Korean
Government, Eiffel France, Vanier Canada, Commonwealth, etc. (Listed in
20260503000100_seed_scholarship_sources.sql + 20260503030000_seed_scholarship_sources_v2.sql.)

---

## 2. Where LLMs touch scholarship facts (and the rules)

### 2.1 Fact CREATION (highest risk)

Only one path. Must remain the only path.

**`supabase/functions/scrape-source/index.ts`** — LLM extracts from web pages.
- ✅ Strict JSON schema (every field typed)
- ✅ Confidence gate (≥ 0.85 to auto-publish)
- ✅ Numeric clamping
- ✅ Intra-run dedup
- ⚠️  After this commit: must also stamp `source_url` and
  `verification_status = 'pending'` on every newly-extracted row.

### 2.2 Fact SUMMARIZATION (read-only LLM access)

These LLMs read scholarships from the DB and TALK about them. They must
NEVER mention a scholarship name, deadline, funding amount, or eligibility
that wasn't in the context they were given.

**`supabase/functions/topuni-ai-pathway/index.ts`** — strategy brief.
- Builds RAG context: top-25 scholarships retrieved by pgvector match
- System prompt explicitly says: "Cite scholarship names verbatim from the
  lists below. Do not invent options not present in the data."
- Each premium-tier section's prompt repeats this constraint (see
  `_shared/brief-sections.ts`).
- ⚠️  GAP: no post-process verification that mentioned scholarship names
  exist in the retrieved set. After this commit: add it.

**`supabase/functions/topuni-chat/index.ts`** — AI counselor.
- Live-case context block includes the user's tracker entries with full
  scholarship metadata (name, host_country, coverage, deadline, status,
  notes, checklist progress).
- System prompt instructs the counselor to reference what's in front of it.
- ⚠️  GAP: counselor can ALSO be asked open-ended questions ("what
  scholarships exist for Belgium?"). It currently has no DB-query tool;
  it can only riff on what was passed in the live-case block. Risk: it
  might hallucinate names.

**`supabase/functions/scholarship-deep-dive/index.ts`** — per-scholarship
personalized analysis. Operates on a single, fully-populated DB row that
is ALREADY verified. Tells the LLM: "Use only the data provided about
this scholarship." Lower risk surface.

**`supabase/functions/generate-scholarship-checklist/index.ts`** —
generates application checklist for one scholarship. Same pattern as
deep-dive: single row in, structured items out. Low risk.

**`supabase/functions/extract-brief-data/index.ts`** — second-pass JSON
extraction over an already-generated brief. Doesn't invent new facts;
distills existing ones.

### 2.3 Fact VERIFICATION (cron-driven)

**`supabase/functions/scholarship-url-health-cron/index.ts`** — weekly
URL pings. Doesn't touch facts; updates `url_consecutive_fails`.
- ⚠️ GAP: no re-extraction of fields. A URL that returns 200 but has
  changed content (deadline rolled, funding changed) is still marked OK.

---

## 3. The gap this audit identifies

After today's session work, the system has:
- ✅ Confidence-gated extraction (scrape-source)
- ✅ URL-level health checks (url-health-cron)
- ✅ Anti-invention prompt language (brief + counselor)
- ✅ Inline scholarship cards backed by real DB rows (EnrichedMarkdown)
- ❌ **No first-class verification status per row**. `verified` is a
  boolean ("yes/no") with no semantics around staleness or breakage.
- ❌ **No source_url on every row**. `official_url` is the apply-here
  link; we don't separately track which authoritative page we extracted
  from. (Often the same URL but not always — e.g. when a scholarship is
  listed on a hub page that aggregates multiple awards.)
- ❌ **No timestamp** on verification — `last_verified_date` is a date,
  losing time-of-day. With a 24-hour cron we'd want minute precision.
- ❌ **No post-process check** that LLM-mentioned scholarship names exist
  in the retrieved DB context.

---

## 4. Proposed model (this commit + follow-ups)

### Schema changes (this commit)

```sql
-- Per-row verification metadata
ALTER TABLE public.scholarships
  ADD COLUMN source_url           text,
  ADD COLUMN last_verified_at     timestamptz,
  ADD COLUMN verification_status  text;

-- Enum-like CHECK constraint instead of a real enum (cheaper to evolve):
ALTER TABLE public.scholarships
  ADD CONSTRAINT scholarships_verification_status_check
  CHECK (verification_status IS NULL OR verification_status IN
    ('verified', 'stale', 'broken', 'pending'));
```

### Backfill rules

| Existing column / state | New column | Value |
|---|---|---|
| `official_url` populated | `source_url` | copy of `official_url` |
| `last_verified_date` populated | `last_verified_at` | `last_verified_date::timestamp at time zone 'UTC'` |
| `verified = true` AND `last_verified_date > 60 days ago` | `verification_status` | `'verified'` |
| `verified = true` AND `last_verified_date ≤ 60 days ago` (or null) | `verification_status` | `'stale'` |
| `url_consecutive_fails ≥ 3` | `verification_status` | `'broken'` |
| Otherwise | `verification_status` | `'pending'` |

### Code changes (follow-up commits)

1. **`scrape-source` writes the new fields**: source_url = the source row's URL;
   verification_status = 'pending' (admin or auto-verify cron promotes to 'verified').
2. **`scholarship-url-health-cron` flips status to 'broken'** on consecutive_fails ≥ 3.
3. **Brief + counselor prompts** add an explicit "only refer to scholarships
   marked verification_status='verified'" filter to the retrieved context.
4. **Post-process check in topuni-ai-pathway**: scan the generated markdown
   for `**bold names**` that don't match any retrieved row name; warn (or
   strip) if found.

---

## 5. The contract going forward

> **LLMs may summarize scholarship facts. They may never invent them.**

Operationally:
1. The only LLM that ever WRITES scholarship rows is `scrape-source`, and
   only with confidence ≥ 0.85 + valid schema + numeric clamping +
   `verification_status = 'pending'`.
2. Any LLM that READS scholarships only sees rows where
   `verification_status IN ('verified', 'stale')` — never `'broken'` or
   `'pending'`.
3. Any user-facing surface (brief, counselor, scholarship detail) that
   shows scholarship facts must show a "Verified" badge with the
   `last_verified_at` date — so the user knows whether the data is fresh.
4. Any LLM-generated markdown that mentions a scholarship name MUST
   reference one that exists in the retrieved context. Names that don't
   resolve get stripped or flagged before display.
