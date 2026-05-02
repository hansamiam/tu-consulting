-- =============================================================================
-- Featured scholarships + user-submitted scholarship queue
-- =============================================================================
-- Two related additions for the next product surface:
--
--   1. is_featured on public.scholarships — the editorial / promotional flag.
--      Featured rows surface to the top of every listing (Discover,
--      ScholarshipsByFilter, AIMatch results) and render with a gold
--      border + FEATURED badge. Used to spotlight high-value programs
--      (Rhodes, Schwarzman) and paid placements down the line.
--
--   2. scholarship_submissions — anonymous-or-authed submission queue
--      for the new /submit page. Anyone can submit a scholarship URL
--      they think we should add. Lands as 'pending_review'; admin
--      promotes to public.scholarships from /admin/queue (or auto via
--      a future review job).
-- =============================================================================

-- ─── Featured flag ────────────────────────────────────────────────────────
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Partial index — featured rows are << total, so a partial keeps it tiny
-- and the ORDER BY is_featured DESC pattern hits it instantly.
CREATE INDEX IF NOT EXISTS idx_scholarships_featured
  ON public.scholarships (is_featured)
  WHERE is_featured = true;

-- Bootstrap: feature the four canonical flagships if present, so the
-- design lands with real featured rows on day one.
UPDATE public.scholarships
   SET is_featured = true
 WHERE scholarship_name ILIKE ANY (ARRAY[
   '%Chevening%',
   '%Rhodes%',
   '%Schwarzman%',
   '%Gates Cambridge%',
   '%Knight-Hennessy%',
   '%Fulbright%'
 ]);

-- ─── User-submitted scholarship queue ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scholarship_submissions (
  submission_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Optional submitter (logged in users get attribution; anon allowed)
  submitted_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_email   text,
  submitter_name    text,
  -- The submission payload itself
  scholarship_name  text NOT NULL,
  provider_name     text,
  host_country      text,
  official_url      text NOT NULL,
  coverage_type     text CHECK (coverage_type IS NULL OR coverage_type IN ('full_ride','partial','tuition_only','stipend','other')),
  award_amount_text text,
  application_deadline date,
  target_degree_level text[],
  target_fields     text[],
  notes             text,
  -- Workflow
  status            text NOT NULL DEFAULT 'pending_review'
                      CHECK (status IN ('pending_review','approved','rejected','duplicate')),
  rejection_reason  text,
  reviewed_by       uuid REFERENCES auth.users(id),
  reviewed_at       timestamptz,
  -- If approved, link to the resulting scholarship row
  promoted_to       uuid REFERENCES public.scholarships(scholarship_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_status_created
  ON public.scholarship_submissions(status, created_at DESC);

-- Cap per-IP / per-user submissions so the form can't be drained.
-- Enforce 5 per email per day at the application layer; the DB-level
-- partial index here guards against exact dup URLs (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uq_submissions_active_url
  ON public.scholarship_submissions ((lower(official_url)))
  WHERE status IN ('pending_review','approved');

-- ─── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.scholarship_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authed) can INSERT a submission. They CANNOT read others.
DROP POLICY IF EXISTS "anyone_can_submit" ON public.scholarship_submissions;
CREATE POLICY "anyone_can_submit"
  ON public.scholarship_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Submitters can read their own submissions (so the success screen can
-- display "you submitted X — we'll review it").
DROP POLICY IF EXISTS "submitter_reads_own" ON public.scholarship_submissions;
CREATE POLICY "submitter_reads_own"
  ON public.scholarship_submissions FOR SELECT TO authenticated
  USING (submitted_by = auth.uid());

-- Admins can do anything.
DROP POLICY IF EXISTS "admin_all_submissions" ON public.scholarship_submissions;
CREATE POLICY "admin_all_submissions"
  ON public.scholarship_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT ON public.scholarship_submissions TO anon, authenticated;
GRANT ALL    ON public.scholarship_submissions TO service_role;
