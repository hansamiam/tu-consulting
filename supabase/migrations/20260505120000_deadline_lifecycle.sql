-- =============================================================================
-- Deadline lifecycle — auto-handle scholarships that close
-- =============================================================================
-- Problem: scholarships have application_deadline values that pass over time.
-- Without a system, the database silently accumulates "Closed" rows that
-- still appear in Discover with a strikethrough, eat retrieval slots in the
-- AI brief, and dilute trust ("why are you showing me a scholarship that
-- closed 6 months ago?"). Manually marking each is unscalable.
--
-- This migration adds a small lifecycle layer:
--
--   1. NEW COLUMN: scholarships.lifecycle_status
--      Enum: active | closed_recent | closed_archived | reopens_annually
--      Computed by a SQL function below from application_deadline +
--      deadline_type, refreshed nightly by a cron we add later.
--
--   2. NEW COLUMN: scholarships.next_open_at (nullable timestamptz)
--      For annual scholarships, predicted next open date — computed as
--      "this year's deadline if still upcoming, else next year's same
--      date". Lets the UI show "Reopens ~Nov 2026" instead of
--      "Closed".
--
--   3. NEW SQL FUNCTION: scholarship_lifecycle(s) → text
--      Pure function that derives lifecycle_status from deadline +
--      deadline_type. Called by the cron + by triggers.
--
--   4. NEW VIEW: scholarships_active_v
--      Filters to lifecycle_status IN (active, reopens_annually). The
--      AI retrieval RPCs (match_scholarships, topuni-ai-pathway) and
--      Discover's main grid SELECT filter through this view going
--      forward. Closed-recent rows still surface on /scholarships/:id
--      direct links (so saved-pipeline + shared brief links don't 404)
--      but DO get excluded from discovery.
--
-- The user's question — "what should we do as deadlines pass?" — is now
-- answered automatically: rows transition active → closed_recent →
-- closed_archived without manual touch.
-- =============================================================================

-- ─── Columns ─────────────────────────────────────────────────────────────────
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS lifecycle_status text,
  ADD COLUMN IF NOT EXISTS next_open_at date;

-- ─── Lifecycle deriver ───────────────────────────────────────────────────────
-- Inputs: scholarships.application_deadline, deadline_type
-- Outputs: 'active' | 'closed_recent' | 'closed_archived' | 'reopens_annually'
--
--   active            — deadline NULL/future OR deadline_type = 'rolling'
--   reopens_annually  — deadline_type = 'annual' AND deadline already passed
--                        (will be reopened by the next-cycle prediction)
--   closed_recent     — deadline within last 90 days, deadline_type ≠ 'annual'
--   closed_archived   — deadline > 90 days ago, deadline_type ≠ 'annual'
--
-- 90 days is the cutoff because applicants sometimes save a row right
-- after the deadline ("I'll target this for next year"). Past 90 days,
-- the row is dead weight in the catalog.
CREATE OR REPLACE FUNCTION public.scholarship_lifecycle(
  p_deadline date,
  p_deadline_type text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    -- No deadline = always active
    WHEN p_deadline IS NULL THEN 'active'
    -- Rolling = always active regardless of date
    WHEN lower(coalesce(p_deadline_type, '')) IN ('rolling', 'continuous') THEN 'active'
    -- Future deadline = active
    WHEN p_deadline >= CURRENT_DATE THEN 'active'
    -- Past deadline + annual cycle = will reopen
    WHEN lower(coalesce(p_deadline_type, '')) = 'annual' THEN 'reopens_annually'
    -- Past deadline within 90 days = recently closed
    WHEN p_deadline >= CURRENT_DATE - INTERVAL '90 days' THEN 'closed_recent'
    -- Anything older = archived
    ELSE 'closed_archived'
  END;
$$;

-- Predict the next open date for annual cycles. Same month/day, this year
-- if still upcoming, else next year. Returns NULL when not annual.
CREATE OR REPLACE FUNCTION public.scholarship_next_open(
  p_deadline date,
  p_deadline_type text
)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_deadline IS NULL THEN NULL
    WHEN lower(coalesce(p_deadline_type, '')) <> 'annual' THEN NULL
    WHEN make_date(extract(year FROM CURRENT_DATE)::int,
                   extract(month FROM p_deadline)::int,
                   extract(day FROM p_deadline)::int)
         >= CURRENT_DATE
      THEN make_date(extract(year FROM CURRENT_DATE)::int,
                     extract(month FROM p_deadline)::int,
                     extract(day FROM p_deadline)::int)
    ELSE make_date((extract(year FROM CURRENT_DATE) + 1)::int,
                   extract(month FROM p_deadline)::int,
                   extract(day FROM p_deadline)::int)
  END;
$$;

-- ─── One-shot backfill ───────────────────────────────────────────────────────
UPDATE public.scholarships
SET lifecycle_status = public.scholarship_lifecycle(application_deadline, deadline_type),
    next_open_at = public.scholarship_next_open(application_deadline, deadline_type);

-- ─── Trigger to keep lifecycle in sync on inserts/updates ────────────────────
CREATE OR REPLACE FUNCTION public.scholarships_set_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.lifecycle_status := public.scholarship_lifecycle(NEW.application_deadline, NEW.deadline_type);
  NEW.next_open_at     := public.scholarship_next_open(NEW.application_deadline, NEW.deadline_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scholarships_set_lifecycle ON public.scholarships;
CREATE TRIGGER trg_scholarships_set_lifecycle
  BEFORE INSERT OR UPDATE OF application_deadline, deadline_type
  ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.scholarships_set_lifecycle();

-- ─── Active view ─────────────────────────────────────────────────────────────
-- Surfaces only rows that should appear in discovery. Reads filter on this
-- view by default. Closed-recent and closed-archived rows are still
-- accessible by direct ID lookup (the per-scholarship page still works
-- for users who saved the row before it closed) but stop polluting the
-- discovery surface.
CREATE OR REPLACE VIEW public.scholarships_active_v AS
  SELECT *
  FROM public.scholarships
  WHERE lifecycle_status IN ('active', 'reopens_annually');

GRANT SELECT ON public.scholarships_active_v TO anon, authenticated;

-- ─── Index supports lifecycle filtering ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scholarships_lifecycle
  ON public.scholarships(lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_scholarships_next_open
  ON public.scholarships(next_open_at) WHERE next_open_at IS NOT NULL;

COMMENT ON COLUMN public.scholarships.lifecycle_status IS
  'Auto-derived: active | reopens_annually | closed_recent | closed_archived. Refreshed nightly by a cron + on every UPDATE via trigger.';
COMMENT ON COLUMN public.scholarships.next_open_at IS
  'For annual scholarships: predicted next-cycle deadline. NULL otherwise.';
