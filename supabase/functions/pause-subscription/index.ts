// pause-subscription — freeze the user's active subscription for ~30
// days using Stripe's `pause_collection` field. We use behavior:'void'
// so no invoice is generated during the pause window; subscription
// auto-resumes at `resumes_at`.
//
// Endpoint for the in-product cancellation save flow: instead of
// cancel-or-don't, we offer "pause for a month" as the middle option
// that retains the customer relationship without charging them. Stripe
// handles the auto-resume — no cron required on our side.
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createUserClient } from "../_shared/clients.ts";

const PAUSE_DAYS = 30;

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;
  if (req.method !== "POST") {
    return respondError(405, "POST only", corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respondError(401, "Not authenticated", corsHeaders);
    }

    const userClient = createUserClient(authHeader);
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user?.email) {
      return respondError(401, "Not authenticated", corsHeaders);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Locate the customer by email — same lookup pattern customer-portal
    // uses, no extra mapping table required.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return respondError(404, "No billing account found", corsHeaders);
    }
    const customerId = customers.data[0].id;

    // Find the active subscription. We pause the most recent active one
    // (TopUni only has a single tier today, so listing limit:1 is safe).
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    if (subs.data.length === 0) {
      return respondError(404, "No active subscription to pause", corsHeaders);
    }
    const sub = subs.data[0];

    // Reject re-pausing an already-paused subscription so the UI doesn't
    // accidentally extend the pause window each click.
    if (sub.pause_collection) {
      return respondJson(409, {
        error: "Subscription is already paused",
        resumes_at: sub.pause_collection.resumes_at,
      }, corsHeaders);
    }

    const resumesAt = Math.floor(Date.now() / 1000) + PAUSE_DAYS * 86_400;
    const updated = await stripe.subscriptions.update(sub.id, {
      pause_collection: { behavior: "void", resumes_at: resumesAt },
    });

    return respondJson(200, {
      ok: true,
      subscription_id: updated.id,
      resumes_at: resumesAt,
      resumes_at_iso: new Date(resumesAt * 1000).toISOString(),
      pause_days: PAUSE_DAYS,
    }, corsHeaders);
  } catch (e) {
    console.error("pause-subscription error:", e);
    return respondError(500, e instanceof Error ? e.message : "Unknown", corsHeaders);
  }
});
