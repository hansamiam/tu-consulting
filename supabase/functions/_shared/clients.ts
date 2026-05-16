/**
 * Supabase client factories for edge functions.
 *
 * Replaces the ~56 inline `createClient(Deno.env.get(...)!, ...)` blocks
 * scattered across functions, and centralises the rotation-resilient
 * key selection (see dispatchClient.ts for the full rationale).
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Service-role client — full DB access, bypasses RLS.
 *
 * Prefers the modern `SB_SECRET_KEY` (sb_secret_*) over the legacy
 * `SUPABASE_SERVICE_ROLE_KEY` JWT. If `SB_SECRET_KEY` is unset it falls
 * back to the exact key the function used before — so this is a
 * no-regression swap that additionally survives a project's
 * "disable legacy JWT" setting.
 */
export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("createServiceClient: SUPABASE_URL or service-role key missing from env");
  }
  return createClient(url, key);
}

/**
 * Anon-key client scoped to the caller's JWT — use for resolving the
 * signed-in user via `.auth.getUser()` and for RLS-bound reads of the
 * user's own rows. Pass the request's raw `Authorization` header.
 */
export function createUserClient(authHeader: string): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) {
    throw new Error("createUserClient: SUPABASE_URL or SUPABASE_ANON_KEY missing from env");
  }
  return createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
}
