// Creates a Stripe Checkout Session for the Founding Membership.
// Single tier ('founding'), two intervals ('month' | 'year'). Capped at 100 spots.
// Atomically reserves a founding slot before checkout — no overselling.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Founding Pro — $19/mo. Single tier, monthly only for now.
const FOUNDING_PRICES: { month: string; year: string } = {
  month: "price_1TQTyAQVirFUxpBg4YtW8JFo",
  year: "price_1TQTyAQVirFUxpBg4YtW8JFo", // alias to monthly for now
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    // Backward-compat: accept legacy { tier, interval } payloads, but always treat as founding.
    const interval = body.interval === "year" ? "year" : "month";

    // Auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sign in required" }), {
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Atomically reserve a founding slot
    const { data: claimData, error: claimErr } = await admin.rpc("claim_founding_member_slot");
    if (claimErr) {
      console.error("claim error", claimErr);
      return new Response(JSON.stringify({ error: "Couldn't reserve founding spot" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (claimData == null) {
      return new Response(JSON.stringify({ error: "Founding membership is sold out (100/100). Join the waitlist for the public launch." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const reservedFoundingNumber = claimData as number;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Find or reuse Stripe customer
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id;

    // Origin allowlist — see same fix in create-checkout. The previous
    // code took whatever Origin the caller sent, letting an attacker
    // redirect a paid customer to attacker-controlled URL post-checkout.
    const PUBLIC_SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";
    const ALLOWED_ORIGINS = new Set([
      PUBLIC_SITE,
      "https://topuni.org",
      "https://www.topuni.org",
      "https://topuniconsulting.com",
      "https://www.topuniconsulting.com",
    ]);
    const requestedOrigin = req.headers.get("origin") ?? "";
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestedOrigin);
    const origin = (ALLOWED_ORIGINS.has(requestedOrigin) || isLocalhost)
      ? requestedOrigin
      : PUBLIC_SITE;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: [{ price: FOUNDING_PRICES[interval], quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier: "founding",
          interval,
          founding_member_number: reservedFoundingNumber.toString(),
        },
      },
      metadata: {
        user_id: user.id,
        tier: "founding",
        interval,
        founding_member_number: reservedFoundingNumber.toString(),
      },
      success_url: `${origin}/account?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-subscription-checkout error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
