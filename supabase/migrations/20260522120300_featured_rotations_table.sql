-- Discover v1 — Phase A.4
-- featured_rotations: admin-curated editorial picks for the "mechta mode" hero slot
-- when the user has no profile (anonymous or sparse-profile state per spec F4).
--
-- Each row is one weekly slot. Admin picks 5 scholarship_ids per week. The
-- frontend deterministically rotates one per session (hash-of-session_id %
-- 5) so a single user doesn't see a different hero on every page refresh.
--
-- Per spec F4 hero behavior matrix:
--   profile_quality ∈ {sparse, empty} → editorial rotation (this table)
--   profile_quality ∈ {rich, partial} → personalized hero from match-scholarships

CREATE TABLE IF NOT EXISTS public.featured_rotations (
  rotation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The week this rotation covers (ISO week start, Monday 00:00 UTC).
  week_start_date DATE NOT NULL,

  -- The scholarship featured in this slot.
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,

  -- Position within the 5-slot weekly set (0-4). Lets the frontend
  -- deterministically pick by hash(session_id) % 5.
  slot_index SMALLINT NOT NULL CHECK (slot_index BETWEEN 0 AND 4),

  -- Optional editorial overrides — admin can tune copy per slot.
  override_headline TEXT,
  override_subhead TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One scholarship can only fill one slot per week; one slot per week is one row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_featured_rotations_week_slot_unique
  ON public.featured_rotations (week_start_date, slot_index);

CREATE INDEX IF NOT EXISTS idx_featured_rotations_week
  ON public.featured_rotations (week_start_date DESC);

ALTER TABLE public.featured_rotations ENABLE ROW LEVEL SECURITY;

-- Public read so anonymous users can see the hero slot.
CREATE POLICY "Public read featured_rotations"
  ON public.featured_rotations FOR SELECT
  USING (true);

CREATE POLICY "Admins manage featured_rotations"
  ON public.featured_rotations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.featured_rotations IS
  'Admin-curated weekly hero rotation for anonymous / sparse-profile users. 5 slots per week, deterministic per-session selection on the frontend. Per Discover v1 plan F4 — 2026-05-22.';
