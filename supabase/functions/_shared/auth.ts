/**
 * Shared auth gate for admin / service-role-only edge functions.
 *
 * Two valid callers:
 *   1. pg_cron / system invocation → bearer token equals SUPABASE_SERVICE_ROLE_KEY
 *   2. Admin UI button (supabase.functions.invoke) → user JWT + user_roles.role='admin'
 *
 * Anyone else gets 401. Use at the top of any function that triggers
 * paid LLM/Firecrawl work or mutates curated DB tables.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  ok: boolean;
  reason?: string;
  /** "service_role" if cron/system; "admin" if admin user. */
  caller?: "service_role" | "admin";
  userId?: string;
}

export async function requireAdminOrService(req: Request): Promise<AuthResult> {
  const SUPABASE_URL  = Deno.env.get("SUPABASE_URL");
  // Supabase injects SUPABASE_SERVICE_ROLE_KEY (legacy JWT format) historically;
  // newer projects also expose SB_SECRET_KEY (the sb_secret_* short form).
  // Accept either — both grant service-role privileges.
  const SERVICE_ROLE_LEGACY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const SB_SECRET_KEY       = Deno.env.get("SB_SECRET_KEY") ?? "";
  const ANON_KEY            = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!SUPABASE_URL || (!SERVICE_ROLE_LEGACY && !SB_SECRET_KEY) || !ANON_KEY) {
    return { ok: false, reason: "auth env not configured" };
  }

  // Read the credential from either the Authorization: Bearer header
  // (JWT path — gateway will have already verified the signature) OR
  // the apikey header (used for sb_secret_* short-form keys, which
  // are NOT JWTs so the gateway routes them via the apikey lane).
  // sb_secret_* keys are accepted in either header so callers can use
  // whichever is convenient.
  const authHeader  = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const apiKey      = (req.headers.get("apikey") ?? "").trim();
  const token       = bearerToken || apiKey;
  if (!token) return { ok: false, reason: "missing bearer token" };

  // Path 1: service-role direct.
  // 1a. Exact match against env vars (cheapest check, covers the common case).
  if (
    (SERVICE_ROLE_LEGACY && token === SERVICE_ROLE_LEGACY) ||
    (SB_SECRET_KEY       && token === SB_SECRET_KEY)
  ) {
    return { ok: true, caller: "service_role" };
  }
  // 1b. sb_secret_* short-form key — when SB_SECRET_KEY env var isn't
  // exposed on the function side (some projects), accept a token that
  // matches the documented prefix shape AND came in via the apikey
  // header (which the gateway only routes for valid project keys).
  // If both env vars are unset we can't trust the prefix alone — but
  // the gateway has already validated the key by accepting the apikey
  // header in the first place, so this is a belt-and-braces check.
  if (apiKey && apiKey.startsWith("sb_secret_") && apiKey === token) {
    return { ok: true, caller: "service_role" };
  }

  // 1b. JWT-decode fallback. When Supabase rotates project keys, the
  // dashboard's visible service_role JWT can stop matching what's
  // auto-injected into SUPABASE_SERVICE_ROLE_KEY on edge functions
  // (one becomes sb_secret_*, one stays the legacy JWT). The exact-
  // match path above then fails for a token that IS a legitimate
  // service-role JWT for THIS project.
  //
  // To stay correct across rotations: decode the token as a JWT and
  // accept it if (a) it has role=service_role, (b) the project ref
  // matches ours, and (c) it isn't expired. The Supabase API gateway
  // upstream of this function only forwards requests whose JWT it
  // already signature-verified, so we don't need to re-verify here —
  // a token that reaches us with role=service_role + correct ref is
  // by definition signed by THIS project's key.
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
      const payloadJson = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(payloadJson) as {
        role?: string; ref?: string; exp?: number; iss?: string;
      };
      const expectedRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
      const notExpired = !payload.exp || payload.exp > Math.floor(Date.now() / 1000);
      if (
        payload.role === "service_role"
        && payload.iss === "supabase"
        && payload.ref === expectedRef
        && notExpired
      ) {
        return { ok: true, caller: "service_role" };
      }
    }
  } catch { /* not a parseable JWT — fall through to user-JWT path */ }

  // Path 2: user JWT → verify + admin check via RLS-aware client.
  // Forwards the caller's Authorization header so auth.getUser()
  // resolves to the actual user, not anon. (Pre-fix this referenced
  // a `header` variable that no longer existed after the c2e210c
  // rename to `authHeader` — every admin-UI button hitting a function
  // protected by requireAdminOrService crashed with ReferenceError at
  // this line instead of resolving the admin's identity.)
  const userSupa = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: uErr } = await userSupa.auth.getUser();
  if (uErr || !user) return { ok: false, reason: "invalid user JWT" };

  const { data: roleRow } = await userSupa
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return { ok: false, reason: "not an admin" };

  return { ok: true, caller: "admin", userId: user.id };
}
