-- 2026-05-29 — founding_paid_count()
--
-- The founding_member_counter row counts CHECKOUT INITIATIONS, not paid
-- subscribers. Abandoned Stripe checkouts permanently burn slots out of
-- the 50 cap. The Pricing.tsx scarcity counter was retired today
-- (founding-50 framing killed) but we still need a reliable
-- "how many paid founding members are there?" answer for admin
-- dashboards and any future scarcity reintroduction.
--
-- `subscriptions` has RLS that only admins / service-role can read.
-- This function bypasses RLS safely because it returns an aggregate
-- (no row leakage), runs as the function owner, and only counts rows
-- with paid statuses.
--
-- Safe to call from anon — no PII, no row leakage, just an integer.

CREATE OR REPLACE FUNCTION public.founding_paid_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::bigint
  FROM public.subscriptions
  WHERE tier = 'founding'
    AND status IN ('active', 'trialing');
$$;

REVOKE ALL ON FUNCTION public.founding_paid_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.founding_paid_count() TO anon, authenticated;

COMMENT ON FUNCTION public.founding_paid_count() IS
  'Returns count of currently-paid founding members (status active or trialing). Safe to call from anon — aggregate-only.';
