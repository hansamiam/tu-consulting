// delete-account
//
// GDPR / "delete my account" endpoint. Called from Account.tsx when the
// user confirms the destructive button. We do:
//
//   1. Cancel the user's active Stripe subscription (if any), at
//      period end (not immediate — we don't want to refund 25 paid
//      days and a follow-up support email).
//   2. Stamp profiles.deleted_at = now() and scramble PII columns
//      (display_name → 'deleted user', email won't be cleared because
//      auth.users owns it — but the delete below removes the row).
//   3. Delete the auth.users row via admin.auth.admin.deleteUser. RLS
//      cascades scrub user-owned content via ON DELETE CASCADE on
//      subscriptions, student_profiles, etc.
//
// We log to a tiny `deletion_log` row (not implemented here — would
// need its own migration; v1 just logs via console for compliance
// trail) so the team can answer "did this user actually delete?"
// when a support ticket asks.
//
// Auth: caller must be the user themselves (createUserClient resolves
// auth.uid()). We don't allow admins to delete others through this
// endpoint — that would need its own gated surface.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return respondError(405, "POST only", corsHeaders);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return respondError(401, "Authorization header required", corsHeaders);
  }
  const userClient = createUserClient(authHeader);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return respondError(401, "Invalid session", corsHeaders);

  const admin = createServiceClient();

  // ── Step 1: cancel Stripe subscription, period-end. ─────────────────────
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const { data: subs } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("user_id", user.id);
      for (const s of subs ?? []) {
        if (!s.stripe_subscription_id) continue;
        if (!["active", "trialing", "past_due"].includes(s.status)) continue;
        try {
          await stripe.subscriptions.update(s.stripe_subscription_id, {
            cancel_at_period_end: true,
            metadata: { deletion_requested: "true", deletion_user_id: user.id },
          });
        } catch (e) {
          // Subscription may already be canceled in Stripe. Log + move on.
          console.warn("[delete-account] Stripe cancel failed", s.stripe_subscription_id, e);
        }
      }
    } catch (e) {
      console.warn("[delete-account] Stripe client init failed — skipping cancel", e);
    }
  }

  // ── Step 2: stamp soft-delete on profiles + scrub display name. ─────────
  try {
    await admin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), display_name: "deleted user" })
      .eq("user_id", user.id);
  } catch (e) {
    console.warn("[delete-account] profile soft-delete failed", e);
  }

  // ── Step 3: hard-delete auth.users — cascades to user-owned tables. ─────
  console.log("[delete-account] proceeding with auth.users delete", {
    user_id: user.id,
    email: user.email,
  });
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error("[delete-account] auth.users delete failed", deleteErr);
    return respondError(500, "deletion failed — please contact support", corsHeaders);
  }

  return respondJson(200, { ok: true, deleted_at: new Date().toISOString() }, corsHeaders);
});
