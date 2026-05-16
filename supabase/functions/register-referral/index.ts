// register-referral
//
// Called from AuthCallback after a new user signs up via a magic link
// that came from a ?ref=CODE URL. Validates the code, creates the
// referrals row, increments the referrer's total_uses counter.
//
// Idempotent: if the referee already has a referral row, no-op.
//
// Body: { code: string }

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "POST only" });

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Authorization required" });
  const userClient = createUserClient(authHeader);
  const { data: u } = await userClient.auth.getUser();
  const refereeId = u.user?.id;
  if (!refereeId) return json(401, { error: "Unauthenticated" });

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const rawCode = (body.code ?? "").trim().toUpperCase();
  if (rawCode.length !== 6 || !/^[A-Z2-9]+$/.test(rawCode)) {
    return json(400, { error: "Invalid code format" });
  }

  const admin = createServiceClient();

  // Look up the code → referrer
  const { data: codeRow } = await admin
    .from("referral_codes")
    .select("code, user_id")
    .eq("code", rawCode)
    .maybeSingle<{ code: string; user_id: string }>();
  if (!codeRow) return json(404, { error: "Code not found" });

  // Self-referral guard
  if (codeRow.user_id === refereeId) {
    return json(400, { error: "Can't refer yourself" });
  }

  // Idempotency: existing referral for this referee?
  const { data: existing } = await admin
    .from("referrals")
    .select("referral_id, code")
    .eq("referee_user_id", refereeId)
    .maybeSingle();
  if (existing) {
    return json(200, { ok: true, status: "already_referred", code: existing.code });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent")?.slice(0, 400) ?? null;

  const { error: insErr } = await admin.from("referrals").insert({
    code: codeRow.code,
    referrer_user_id: codeRow.user_id,
    referee_user_id: refereeId,
    redeem_ip: ip,
    redeem_user_agent: ua,
  });
  if (insErr) return json(500, { error: insErr.message });

  // Bump the referrer's denormalised counter
  await admin.rpc("increment_referral_total_uses", { p_code: codeRow.code }).then(() => {}).catch(async () => {
    // RPC didn't exist? Fall back to a direct update via SELECT current then write.
    const { data: c } = await admin.from("referral_codes").select("total_uses").eq("code", codeRow.code).maybeSingle();
    await admin.from("referral_codes").update({ total_uses: (c?.total_uses ?? 0) + 1 }).eq("code", codeRow.code);
  });

  return json(200, { ok: true, status: "registered", code: codeRow.code });
});
