-- Permission denied for table scholarship_mini_guides when an admin tried
-- to save Top Uni Insights bullets via the inline-edit UI (2026-05-27).
--
-- Root cause: PR #200 created scholarship_mini_guides with RLS enabled
-- and a public-read policy, but no write policy. Service-role + postgres
-- bypass RLS so the table looked fine to back-end / SQL flows; only
-- direct browser writes from an authenticated admin hit the wall.
--
-- Fix: grant INSERT/UPDATE/DELETE to the authenticated role + add an
-- admin-only ALL policy using the same has_role() predicate the
-- scholarships + scholarship_edits tables already use.
--
-- Already applied to prod via MCP on 2026-05-27 — this file commits the
-- change to the repo so future Supabase env rebuilds carry it forward.

grant insert, update, delete on public.scholarship_mini_guides to authenticated;

drop policy if exists "Admins manage scholarship_mini_guides" on public.scholarship_mini_guides;

create policy "Admins manage scholarship_mini_guides"
  on public.scholarship_mini_guides
  for all
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));
