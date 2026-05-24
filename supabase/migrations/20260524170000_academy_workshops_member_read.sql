-- =============================================================================
-- Academy workshops — member-readable SELECT policy
-- =============================================================================
-- The original 20260505000000_academy_workshops.sql migration only granted
-- `is_topuni_founder()` access via a single FOR ALL policy. That made the
-- admin UI usable but left members locked out of their own recordings even
-- after rows were marked is_published = true.
--
-- This migration adds a permissive SELECT policy for any authenticated user,
-- gated on is_published = true. Postgres OR-combines policies for the same
-- role, so the founder FOR ALL policy from the prior migration continues to
-- cover INSERT/UPDATE/DELETE (and SELECT on unpublished drafts) untouched.
-- =============================================================================

DROP POLICY IF EXISTS "members_read_published_workshops" ON public.academy_workshops;
CREATE POLICY "members_read_published_workshops"
  ON public.academy_workshops FOR SELECT
  TO authenticated
  USING (is_published = true);
