-- =============================================================================
-- scholarships.updated_at + auto-touch trigger
-- =============================================================================
-- Existing scholarship rows have created_at and last_verified_at, but neither
-- bumps on every meaningful field change:
--   · last_verified_at advances on the verify cron's confirmation pass —
--     not on enrich-scholarship-content soft-field fills, not on admin
--     edits.
--   · created_at obviously never moves after insert.
--
-- The scholarship_deep_dives cache (per-profile personalised analysis) needs
-- a single cursor it can compare its generated_at against to decide if the
-- underlying row drifted. Without it, a scholarship whose why_this_fits gets
-- enriched silently keeps showing stale per-user analysis forever.
--
-- Adds updated_at + a touch_updated_at trigger keyed to BEFORE UPDATE on the
-- scholarships table. Reuses the existing public.touch_updated_at() helper
-- defined in 20260502032504_user_state_tables.sql.
-- =============================================================================

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill: legacy rows get updated_at = created_at if available, else now().
UPDATE public.scholarships
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL OR updated_at = '1970-01-01'::timestamptz;

DROP TRIGGER IF EXISTS trg_scholarships_touch_updated_at ON public.scholarships;
CREATE TRIGGER trg_scholarships_touch_updated_at
  BEFORE UPDATE ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Index supports the deep-dive cache freshness check
-- (scholarship_id lookup → updated_at compare).
CREATE INDEX IF NOT EXISTS idx_scholarships_updated_at
  ON public.scholarships(updated_at);

COMMENT ON COLUMN public.scholarships.updated_at IS
  'Bumped on every UPDATE. Used by scholarship_deep_dives cache to detect underlying drift — cache hits require generated_at >= updated_at.';
