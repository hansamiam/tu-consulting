-- =============================================================================
-- Scholarship verification status — first-class per-row metadata
-- =============================================================================
-- Today the only verification signals on a scholarship row are:
--   · `verified` boolean (yes/no, no semantics about staleness)
--   · `last_verified_date` (date — loses time-of-day)
--   · `official_url` (the "apply here" link, not necessarily the page we
--     extracted from)
--   · `data_source` (provenance: hand_curated / manus_ai_2026_05_03 / scraped)
--
-- This migration adds three first-class fields the rest of the pipeline can
-- gate on:
--
--   · source_url           — the authoritative page we extracted from. Often
--                            equal to official_url, but sometimes different
--                            (e.g. a hub page listing multiple awards).
--   · last_verified_at     — timestamptz so a 24-hour cron has minute
--                            precision. Existing date column stays for
--                            display compatibility.
--   · verification_status  — verified | stale | broken | pending
--                            Read-only LLMs filter to verified+stale.
--                            User-facing surfaces show a freshness badge
--                            sourced from last_verified_at + this status.
--
-- See docs/DATA_PIPELINE_AUDIT.md for the full data-flow audit driving this.
-- =============================================================================

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS source_url          text,
  ADD COLUMN IF NOT EXISTS last_verified_at    timestamptz,
  ADD COLUMN IF NOT EXISTS verification_status text;

-- Enum-like CHECK constraint (cheaper to evolve than a real ENUM).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.scholarships'::regclass
      AND conname  = 'scholarships_verification_status_check'
  ) THEN
    ALTER TABLE public.scholarships
      ADD CONSTRAINT scholarships_verification_status_check
      CHECK (verification_status IS NULL OR verification_status IN
        ('verified', 'stale', 'broken', 'pending'));
  END IF;
END
$$;

-- ─── Backfill ─────────────────────────────────────────────────────────
-- 1. source_url ← official_url where present. We don't have a stronger
--    signal for existing rows; for newly-scraped rows scrape-source will
--    set source_url to the actual fetch URL (which may differ).
UPDATE public.scholarships
SET source_url = official_url
WHERE source_url IS NULL AND official_url IS NOT NULL AND official_url <> '';

-- 2. last_verified_at ← last_verified_date promoted to a timestamp at
--    UTC midnight. Date precision is lost; that's fine — going forward
--    every write stamps last_verified_at directly.
UPDATE public.scholarships
SET last_verified_at = (last_verified_date::timestamp AT TIME ZONE 'UTC')
WHERE last_verified_at IS NULL AND last_verified_date IS NOT NULL;

-- 3. verification_status — derive from existing signals:
--    · url_consecutive_fails >= 3                          → 'broken'
--    · verified=true AND verified within last 60 days       → 'verified'
--    · verified=true AND verified > 60 days ago / unknown   → 'stale'
--    · everything else (including verified=false)           → 'pending'
UPDATE public.scholarships
SET verification_status = CASE
  WHEN COALESCE(url_consecutive_fails, 0) >= 3 THEN 'broken'
  WHEN verified = true AND last_verified_at IS NOT NULL
       AND last_verified_at > now() - interval '60 days' THEN 'verified'
  WHEN verified = true                                   THEN 'stale'
  ELSE 'pending'
END
WHERE verification_status IS NULL;

-- Index for the read-side filter (LLMs query "where status in ('verified','stale')")
CREATE INDEX IF NOT EXISTS idx_scholarships_verification_status
  ON public.scholarships(verification_status);

-- Coverage view for /admin
CREATE OR REPLACE VIEW public.scholarship_verification_coverage_v AS
SELECT
  count(*)                                                      AS total_scholarships,
  count(*) FILTER (WHERE verification_status = 'verified')      AS verified_count,
  count(*) FILTER (WHERE verification_status = 'stale')         AS stale_count,
  count(*) FILTER (WHERE verification_status = 'broken')        AS broken_count,
  count(*) FILTER (WHERE verification_status = 'pending')       AS pending_count,
  count(*) FILTER (WHERE source_url IS NOT NULL)                AS have_source_url,
  count(*) FILTER (WHERE last_verified_at > now() - interval '30 days') AS verified_in_last_30d
FROM public.scholarships;

GRANT SELECT ON public.scholarship_verification_coverage_v TO authenticated;
