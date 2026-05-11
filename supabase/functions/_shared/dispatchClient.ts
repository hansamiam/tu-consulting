/**
 * dispatchClient — shared helper for cron edge functions that fan out
 * to other edge functions internally.
 *
 * Background: after a Supabase project key rotation, the env-injected
 * SUPABASE_SERVICE_ROLE_KEY may still be the legacy JWT while the
 * project's API gateway has been switched to reject legacy JWTs
 * ("Disable legacy JWT" toggle). Calls from one edge function to
 * another travel through the gateway and fail with
 * UNAUTHORIZED_INVALID_JWT_FORMAT or UNAUTHORIZED_LEGACY_JWT in that
 * configuration.
 *
 * pg_cron's HTTP triggers avoid this by reading the current dispatch
 * token from private.app_secrets (rotated by a single UPDATE). This
 * helper pulls the same value so internal fan-out fetches use the
 * SAME token pg_cron uses — gateway-rotation-resilient.
 *
 * Usage:
 *
 *   import { getDispatchClient } from "../_shared/dispatchClient.ts";
 *   const { supa, dispatchToken } = await getDispatchClient();
 *   // use supa for DB queries; dispatchToken for fan-out fetches:
 *   await fetch(`${supa['url']}/functions/v1/foo`, {
 *     method: "POST",
 *     headers: { apikey: dispatchToken, "Content-Type": "application/json" },
 *     body: JSON.stringify({...}),
 *   });
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DispatchHandle {
  supa: SupabaseClient;
  /** Use as `apikey` header on internal /functions/v1/<name> fetches. */
  dispatchToken: string;
  supabaseUrl: string;
}

export async function getDispatchClient(): Promise<DispatchHandle> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // Prefer the sb_secret_* short-form key for the bootstrap apikey
  // since that's the gateway-recognised modern shape; fall back to
  // the legacy JWT env name for older projects.
  const bootstrapKey = Deno.env.get("SB_SECRET_KEY")
                   ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !bootstrapKey) {
    throw new Error("dispatchClient: SUPABASE_URL or service-role key missing from env");
  }

  // Bootstrap client — its only job is to call the SECURITY DEFINER
  // function public.app_cron_token() so we can read the rotation-
  // resilient token from private.app_secrets.
  const bootstrap = createClient(supabaseUrl, bootstrapKey);
  let dispatchToken = bootstrapKey;
  try {
    const { data: tokenRpc } = await bootstrap.rpc("app_cron_token");
    if (typeof tokenRpc === "string" && tokenRpc.length > 10) {
      dispatchToken = tokenRpc;
    }
  } catch {
    /* No app_cron_token function deployed (or RPC blocked) — fall
       back to the env-derived bootstrap key. Worse case the inner
       fetches fail the same way they did before this helper; no
       regression. */
  }

  // Real client used by the caller for all DB work + supa.functions.invoke
  // calls. Reusing the dispatchToken keeps the gateway from rejecting
  // any of supa-js's internal HTTP traffic for the rest of this run.
  const supa = createClient(supabaseUrl, dispatchToken);

  return { supa, dispatchToken, supabaseUrl };
}
