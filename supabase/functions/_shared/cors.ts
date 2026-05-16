/**
 * Shared CORS headers + OPTIONS preflight handling for edge functions.
 *
 * The codebase grew two header variants — keep both:
 *  - BASIC    — standard supabase-js request headers.
 *  - EXTENDED — additionally allows the `x-supabase-client-*` headers
 *               newer mobile/runtime-tagged supabase-js sends. Billing
 *               and subscription functions are hit by those clients and
 *               their browser preflight fails without EXTENDED.
 *
 * Usage:
 *   import { CORS_HEADERS_BASIC, handleCorsOptions } from "../_shared/cors.ts";
 *   const pre = handleCorsOptions(req);
 *   if (pre) return pre;
 */
export const CORS_HEADERS_BASIC: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const CORS_HEADERS_EXTENDED: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Returns a preflight Response when `req` is an OPTIONS request,
 * otherwise null. Mirrors the previous inline behaviour (empty body,
 * default status, CORS headers) so swapping it in is behaviour-neutral.
 */
export function handleCorsOptions(
  req: Request,
  headers: Record<string, string> = CORS_HEADERS_BASIC,
): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  return null;
}
