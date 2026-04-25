-- Fix search_path on all new functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.claim_founding_member_slot() SET search_path = public;
ALTER FUNCTION public.has_active_subscription(UUID) SET search_path = public;

-- Replace permissive service-role policies with split per-action policies
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "Service role inserts subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role updates subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role deletes subscriptions" ON public.subscriptions
  FOR DELETE USING (auth.role() = 'service_role');
CREATE POLICY "Service role selects subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role updates founding counter" ON public.founding_member_counter;
CREATE POLICY "Service role updates founding counter" ON public.founding_member_counter
  FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');