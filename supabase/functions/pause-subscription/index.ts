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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAUSE_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Locate the customer by email — same lookup pattern customer-portal
    // uses, no extra mapping table required.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ error: "No billing account found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "No active subscription to pause" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sub = subs.data[0];

    // Reject re-pausing an already-paused subscription so the UI doesn't
    // accidentally extend the pause window each click.
    if (sub.pause_collection) {
      return new Response(
        JSON.stringify({
          error: "Subscription is already paused",
          resumes_at: sub.pause_collection.resumes_at,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resumesAt = Math.floor(Date.now() / 1000) + PAUSE_DAYS * 86_400;
    const updated = await stripe.subscriptions.update(sub.id, {
      pause_collection: { behavior: "void", resumes_at: resumesAt },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        subscription_id: updated.id,
        resumes_at: resumesAt,
        resumes_at_iso: new Date(resumesAt * 1000).toISOString(),
        pause_days: PAUSE_DAYS,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("pause-subscription error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
