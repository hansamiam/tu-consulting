-- =============================================================================
-- GRANT permissions on session-added tables
-- =============================================================================
-- The two new tables created in this session (scholarship_deep_dives,
-- scholarship_checklists) had RLS policies attached but no explicit
-- table-level GRANTs. In this project's setup, default schema privileges
-- did not auto-grant to anon/authenticated/service_role, so edge function
-- upserts silently failed before RLS even checked.
--
-- Fix: explicit GRANT for service_role (which the edge functions use) and
-- SELECT for anon/authenticated where the RLS policy permits public reads.
-- =============================================================================

-- scholarship_checklists: public read (per existing policy), service write
GRANT SELECT ON public.scholarship_checklists TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_checklists TO service_role;

-- scholarship_deep_dives: service-role only (table is opaque to public)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_deep_dives TO service_role;

-- Defensive: also clean the test row that was inserted during diagnosis.
DELETE FROM public.scholarship_checklists
WHERE scholarship_id = '76716427-6cb2-4f51-a18b-86223374099e'::uuid
  AND items::text LIKE '%"test"%';
