-- Grant 'admin' role to the operator allowlist by email.
--
-- Two layers gate write access to scholarships:
--   1. Frontend `ADMIN_EMAILS` in src/lib/adminMode.ts (lights up the UI)
--   2. DB role in public.user_roles, checked by RLS via has_role()
--
-- This migration backfills layer 2 for everyone on layer 1, so any
-- admin who's already signed up gets write access immediately.
-- If a listed user hasn't signed up yet, the lookup returns no rows
-- and the INSERT becomes a no-op for them — they'll be picked up
-- when this migration is re-run after signup, OR by a one-line
-- manual INSERT, whichever's easier at the time.
--
-- Idempotent: ON CONFLICT swallows re-runs.

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN (
  'samuel.shn.han@gmail.com',
  'nurzada.abdivalieva@gmail.com',
  'alima140105@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
