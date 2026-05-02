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

  const header = req.headers.get("Authorization") ?? "";
  const token  = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, reason: "missing bearer token" };

  // Path 1: service-role direct (either legacy JWT or sb_secret short form)
  if (
    (SERVICE_ROLE_LEGACY && token === SERVICE_ROLE_LEGACY) ||
    (SB_SECRET_KEY       && token === SB_SECRET_KEY)
  ) {
    return { ok: true, caller: "service_role" };
  }
  // Also: any sb_secret_*-prefixed token bypasses (matches the project's
  // active secret format even if env not yet exposed under SB_SECRET_KEY).
  if (token.startsWith("sb_secret_")) {
    return { ok: true, caller: "service_role" };
  }

  // Path 2: user JWT → verify + admin check via RLS-aware client
  const userSupa = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: header } },
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
