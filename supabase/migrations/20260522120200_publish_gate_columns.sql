-- Discover v1 — Phase A.3
-- Publish gate columns on scholarships. Adds:
--   is_published        — single source of truth for "user sees this row"
--   gate_fail_reason    — populated when a row fails G1–G11 so admin knows WHY
--   last_gate_checked_at — when the recheck cron last evaluated this row
--
-- The gate logic (G1–G11) is enforced in the application layer:
--   - scrape-source/index.ts when a row is upserted
--   - discover-publish-gate-recheck (new cron) daily 04:00 UTC
--   - admin manual "re-run gate" action from /admin/publish-gate
--
-- This migration only adds the storage. The is_published backfill from current
-- catalog state ships in 20260522120700 (a non-destructive backfill against the
-- existing rows — explicit, audited, separate from the schema add).

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS gate_fail_reason TEXT;

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS last_gate_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scholarships_is_published
  ON public.scholarships (is_published)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_scholarships_gate_fail_reason
  ON public.scholarships (gate_fail_reason)
  WHERE is_published = false AND gate_fail_reason IS NOT NULL;

COMMENT ON COLUMN public.scholarships.is_published IS
  'TRUE iff the row passes the Tight publish gate G1–G11. The Discover UI MUST filter on this column for every user-visible query. Discover v1 plan 2026-05-22.';
COMMENT ON COLUMN public.scholarships.gate_fail_reason IS
  'Free-text reason this row failed the publish gate, e.g. "G3: official_url HTTP 404 last 30d". Set by scrape-source and the gate-recheck cron. NULL when is_published=true.';
COMMENT ON COLUMN public.scholarships.last_gate_checked_at IS
  'Timestamp when the recheck cron last evaluated this row against G1–G11. Used to spot stale rows the cron hasn''t seen.';
