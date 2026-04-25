// Creates a Stripe Checkout Session for a subscription.
// Tiers: 'pro' | 'founding'   Intervals: 'month' | 'year'
// Founding membership atomically claims a slot before checkout — no overselling.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICES: Record<string, { month: string; year: string }> = {
  pro: {
    month: "price_1TQ2ZJQVirFUxpBgzaY5UYF0",
    year: "price_1TQ2ZKQVirFUxpBgz4Od1J5C",
  },
  founding: {
    month: "price_1TQ2ZMQVirFUxpBgviQFJwkF",
    year: "price_1TQ2ZNQVirFUxpBgoFdRKYSs",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tier, interval } = await req.json();
    if (!["pro", "founding"].includes(tier) || !["month", "year"].includes(interval)) {
      return new Response(JSON.stringify({ error: "Invalid tier or interval" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Founding tier: atomically reserve a slot
    let reservedFoundingNumber: number | null = null;
    if (tier === "founding") {
      const { data: claimData, error: claimErr } = await admin.rpc("claim_founding_member_slot");
      if (claimErr) {
        console.error("claim error", claimErr);
        return new Response(JSON.stringify({ error: "Couldn't reserve founding spot" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (claimData == null) {
        return new Response(JSON.stringify({ error: "Founding membership is sold out (100/100). Pick Pro instead." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      reservedFoundingNumber = claimData as number;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Find or reuse Stripe customer
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const origin = req.headers.get("origin") || "https://topuniconsulting.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      line_items: [{ price: PRICES[tier][interval as "month" | "year"], quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier,
          interval,
          founding_member_number: reservedFoundingNumber?.toString() ?? "",
        },
      },
      metadata: {
        user_id: user.id,
        tier,
        interval,
        founding_member_number: reservedFoundingNumber?.toString() ?? "",
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
