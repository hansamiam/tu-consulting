// /topuni-ai/r/:reportId reads its payload through this function.
//
// Auth rules:
//   - Owner (Authorization: Bearer <user_token>, matches strategy_reports_v2.user_id) → allowed.
//   - Anon (no auth header) → must supply ?t=<read_token> matching the row.
//   - Otherwise → 403.
//
// Replaces direct PostgREST reads from the client so the read_token
// check happens server-side (anon JWT bypassing RLS via service role).
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;
  if (req.method !== "POST") return respondError(405, "POST only", corsHeaders);

  try {
    const body = await req.json().catch(() => null) as null | {
      reportId?: string;
      token?: string;
    };
    if (!body?.reportId) return respondError(400, "missing reportId", corsHeaders);

    // Basic shape gate — reject obviously malformed input fast.
    if (typeof body.reportId !== "string" || body.reportId.length > 64) {
      return respondError(400, "invalid reportId", corsHeaders);
    }
    if (body.token && (typeof body.token !== "string" || body.token.length > 128)) {
      return respondError(400, "invalid token", corsHeaders);
    }

    const admin = createServiceClient();
    const authHeader = req.headers.get("authorization") || "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace(/^Bearer\s+/, "");
      // Anon publishable keys also start with "Bearer " — these aren't user tokens.
      // admin.auth.getUser() on an anon key returns no user, so we'll fall through to
      // the token-based check below.
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // deno-lint-ignore no-explicit-any
    const { data, error } = await (admin as any).from("strategy_reports_v2")
      .select("id, user_id, read_token, payload")
      .eq("id", body.reportId)
      .maybeSingle();

    if (error) {
      console.error("[get-strategy] read failed:", error.message);
      return respondError(500, "read failed", corsHeaders);
    }
    if (!data) return respondError(404, "not found", corsHeaders);

    const isOwner = !!userId && data.user_id === userId;
    const isTokenValid = !!body.token && data.read_token === body.token;
    if (!isOwner && !isTokenValid) {
      // Don't distinguish 403 vs 404 — leaks existence to attackers
      return respondError(404, "not found", corsHeaders);
    }

    return respondJson(200, { report: data.payload });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("[get-strategy] error:", msg);
    return respondError(500, msg, corsHeaders);
  }
});
