// academy-resource-url
//
// Mints a short-lived (5-min) Supabase Storage signed URL for an
// academy_resources row's file, gated by the caller's subscription.
//
// Request:
//   POST { resourceId: string }
//   Authorization: Bearer <user JWT>
//
// Gate logic (same gate as the AI brief premium tier):
//   1. Resource must be is_published=true.
//   2. If resource.access_tier='free' → any authed user may download.
//   3. If resource.access_tier='member' → caller's subscriptions row
//      must be is_active (active|trialing pro/founding, period not
//      expired) OR profiles.earned_trial_active.
//
// Why this lives behind an edge function (and not direct storage
// access with RLS on storage.objects):
//   · The subscription/trial logic spans two tables (subscriptions +
//     profiles.earned_trial_expires_at). Replicating that in a
//     storage.objects RLS policy would be fragile and double the
//     surface area to keep in sync.
//   · One audit point — the function logs every grant + denial.
//
// The function returns a signed URL the client can fetch directly; the
// file content is never proxied through the function (would burn
// bandwidth on bigger PDFs/videos).

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

const SIGNED_URL_TTL_SEC = 300; // 5 minutes — short enough that a
                                 // leaked URL expires quickly, long
                                 // enough for any reasonable click-
                                 // to-download window.

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") {
    return respondError(405, "POST only", corsHeaders);
  }

  // ─── Auth ────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return respondError(401, "Authorization header required", corsHeaders);
  }
  const userClient = createUserClient(authHeader);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return respondError(401, "Invalid session", corsHeaders);
  }

  // ─── Parse body ──────────────────────────────────────────────────
  let body: { resourceId?: string };
  try {
    body = await req.json();
  } catch {
    return respondError(400, "Body must be JSON { resourceId }", corsHeaders);
  }
  const resourceId = (body.resourceId ?? "").trim();
  if (!resourceId) {
    return respondError(400, "resourceId is required", corsHeaders);
  }

  const supabase = createServiceClient();

  // ─── Resource lookup ─────────────────────────────────────────────
  // Service role read — RLS would also work here (resource is_published=true
  // is visible to authed users) but using service role saves a JWT round-trip.
  const { data: resource, error: resourceErr } = await (supabase as unknown as { from: (t: string) => any })
    .from("academy_resources")
    .select("id, file_path, external_url, access_tier, is_published, title")
    .eq("id", resourceId)
    .maybeSingle();

  if (resourceErr) {
    console.error("[academy-resource-url] resource lookup failed", resourceErr);
    return respondError(500, "Lookup failed", corsHeaders);
  }
  if (!resource) {
    return respondError(404, "Resource not found", corsHeaders);
  }
  if (!resource.is_published) {
    // Treat unpublished as not-found for non-admin callers. Admins use
    // a different download path (signed URL from the admin page) so
    // they don't need this function.
    return respondError(404, "Resource not found", corsHeaders);
  }

  // ─── Access gate ─────────────────────────────────────────────────
  if (resource.access_tier === "member") {
    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("status, tier, current_period_end")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("earned_trial_expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const trialExp = profile?.earned_trial_expires_at
      ? new Date(profile.earned_trial_expires_at)
      : null;
    const trialActive = !!(trialExp && trialExp.getTime() > Date.now());

    const periodActive = sub?.current_period_end
      ? new Date(sub.current_period_end).getTime() > Date.now()
      : false;
    const paidActive =
      !!sub &&
      ["active", "trialing"].includes(String(sub.status)) &&
      ["pro", "founding"].includes(String(sub.tier)) &&
      periodActive;

    if (!paidActive && !trialActive) {
      console.log("[academy-resource-url] member-tier denied", {
        user: user.id,
        resource: resource.id,
      });
      return respondError(403, "Membership required to access this resource", corsHeaders);
    }
  }

  // ─── External URL shortcut ───────────────────────────────────────
  // For "link-only" resources we don't need a signed URL — just hand
  // back the external link. The gate above still ran.
  if (resource.external_url && !resource.file_path) {
    return respondJson(200, {
      url: resource.external_url,
      expiresInSec: null,
      external: true,
    }, corsHeaders);
  }

  if (!resource.file_path) {
    return respondError(500, "Resource has no file_path or external_url", corsHeaders);
  }

  // ─── Mint signed URL ─────────────────────────────────────────────
  const { data: signed, error: signErr } = await supabase
    .storage
    .from("academy-resources")
    .createSignedUrl(resource.file_path, SIGNED_URL_TTL_SEC, {
      download: resource.title || true,
    });

  if (signErr || !signed?.signedUrl) {
    console.error("[academy-resource-url] sign failed", signErr);
    return respondError(500, signErr?.message ?? "Failed to mint signed URL", corsHeaders);
  }

  return respondJson(200, {
    url: signed.signedUrl,
    expiresInSec: SIGNED_URL_TTL_SEC,
    external: false,
  }, corsHeaders);
});
