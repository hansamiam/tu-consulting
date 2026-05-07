/**
 * Postgres-backed per-minute rate limiter.
 *
 * Calls the SECURITY DEFINER RPC `check_and_increment_rate_limit(key, max)`
 * which atomically increments a per-minute counter and returns whether the
 * request is under the cap. No external dep (no Upstash / Redis).
 *
 * Why this exists: anyone can hit /functions/v1/match-scholarships from the
 * browser with the anon key. Without a limit, a single attacker could drain
 * our OpenAI budget overnight. This puts a hard ceiling on per-IP and
 * per-user request rate.
 *
 * Usage in an edge function:
 *   const allowed = await checkRateLimit(supa, { key: `match:${ip}`, perMinute: 10 });
 *   if (!allowed) return json(429, { error: "Rate limit exceeded" });
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitOpts {
  /** Bucket key — typically "<endpoint>:<ip>" or "<endpoint>:user:<uid>". */
  key: string;
  /** Max requests per minute against this key. */
  perMinute: number;
}

/**
 * Returns true if request is within the limit (and counts it).
 * Returns false if over the limit. Returns true on RPC failure
 * (fail-open) to avoid taking the whole API down on a DB hiccup.
 */
export async function checkRateLimit(
  supa: SupabaseClient,
  opts: RateLimitOpts
): Promise<boolean> {
  const { data, error } = await supa.rpc("check_and_increment_rate_limit", {
    p_key: opts.key,
    p_max_per_minute: opts.perMinute,
  });
  if (error) {
    console.error("[rate-limit] RPC failed, allowing request:", error.message);
    return true; // fail-open
  }
  return data === true;
}

/** Extract a best-guess client IP from the request headers.
 *
 *  Header preference order is intentional: cf-connecting-ip is set by
 *  Cloudflare from the actual TCP connection and cannot be spoofed by
 *  the caller; x-real-ip is typically set by a single trusted proxy
 *  hop. x-forwarded-for is checked LAST because the first entry is
 *  client-supplied — an attacker hitting the edge function URL directly
 *  can prepend any IP they want and rotate to evade per-IP rate limits.
 *  (The previous "xf first" order leaked the rate-limit ceiling on
 *  AI-spend endpoints under exactly that scenario.) */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "unknown";
}
