// check-subscription — queries Stripe by customer email and syncs the local subscriptions row.
// Called from the frontend on auth change + every 60s.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reverse-lookup price → (tier, interval)
const PRICE_MAP: Record<string, { tier: "pro" | "founding"; interval: "month" | "year" }> = {
  // Legacy Pro prices (kept for back-compat with any older test subs)
  price_1TQ2ZJQVirFUxpBgzaY5UYF0: { tier: "pro", interval: "month" },
  price_1TQ2ZKQVirFUxpBgz4Od1J5C: { tier: "pro", interval: "year" },
  // Legacy Founding prices
  price_1TQ2ZMQVirFUxpBgviQFJwkF: { tier: "founding", interval: "month" },
  price_1TQ2ZNQVirFUxpBgoFdRKYSs: { tier: "founding", interval: "year" },
  // CURRENT Founding Pro price — $19/mo
  price_1TQTyAQVirFUxpBg4YtW8JFo: { tier: "founding", interval: "month" },
  // Legacy $9 prices (kept so older test subs still resolve)
  price_1TQRdvQVirFUxpBgcYeYbhDr: { tier: "founding", interval: "month" },
  price_1TQRdxQVirFUxpBgCBDWbNfI: { tier: "founding", interval: "year" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ subscribed: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ subscribed: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscribed: false, tier: "free" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const customerId = customers.data[0].id;

    // Get most recent active/trialing subscription
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });
    const active = subs.data.find((s: Stripe.Subscription) => ["active", "trialing", "past_due"].includes(s.status));

    if (!active) {
      // Sync to free
      await admin.from("subscriptions").upsert({
        user_id: user.id,
        email: user.email,
        stripe_customer_id: customerId,
        tier: "free",
        status: "canceled",
      }, { onConflict: "stripe_subscription_id" });
      return new Response(JSON.stringify({ subscribed: false, tier: "free" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const item = active.items.data[0];
    const priceId = item.price.id;
    const mapping = PRICE_MAP[priceId] ?? { tier: "pro" as const, interval: "month" as const };
    const foundingNumberRaw = active.metadata?.founding_member_number;
    const foundingNumber = foundingNumberRaw ? parseInt(foundingNumberRaw, 10) : null;

    const periodEnd = (active as unknown as { current_period_end?: number }).current_period_end;
    const periodStart = (active as unknown as { current_period_start?: number }).current_period_start;

    const row = {
      user_id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
      stripe_subscription_id: active.id,
      stripe_price_id: priceId,
      tier: mapping.tier,
      status: active.status,
      billing_interval: mapping.interval,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: !!active.cancel_at_period_end,
      canceled_at: active.canceled_at ? new Date(active.canceled_at * 1000).toISOString() : null,
      trial_end: active.trial_end ? new Date(active.trial_end * 1000).toISOString() : null,
      is_founding_member: mapping.tier === "founding",
      founding_member_number: mapping.tier === "founding" ? foundingNumber : null,
    };

    await admin.from("subscriptions").upsert(row, { onConflict: "stripe_subscription_id" });

    /* ─── Referral conversion side-effect ────────────────────────
       If this user was referred AND we haven't yet recorded their
       premium conversion, stamp the referral row + bump the
       referrer's premium_conversions counter + queue a
       "your friend converted!" email to the referrer. Best-effort:
       errors here don't fail the subscription sync. */
    try {
      const isPremiumActive =
        ["active", "trialing"].includes(active.status) &&
        (mapping.tier === "pro" || mapping.tier === "founding");
      if (isPremiumActive) {
        const { data: ref } = await admin
          .from("referrals")
          .select("referral_id, code, referrer_user_id, became_premium_at")
          .eq("referee_user_id", user.id)
          .maybeSingle();
        if (ref && !ref.became_premium_at) {
          await admin
            .from("referrals")
            .update({ became_premium_at: new Date().toISOString() })
            .eq("referral_id", ref.referral_id);

          // Bump denormalised counter
          const { data: rc } = await admin
            .from("referral_codes")
            .select("premium_conversions")
            .eq("code", ref.code)
            .maybeSingle();
          await admin
            .from("referral_codes")
            .update({ premium_conversions: (rc?.premium_conversions ?? 0) + 1 })
            .eq("code", ref.code);

          // Notify the referrer (best-effort — looks up email via
          // student_profiles since we don't store it on auth.users
          // directly without admin scopes).
          const { data: refProfile } = await admin
            .from("student_profiles")
            .select("email, full_name")
            .eq("user_id", ref.referrer_user_id)
            .maybeSingle();
          if (refProfile?.email) {
            try {
              await admin.functions.invoke("send-transactional-email", {
                body: {
                  to: refProfile.email,
                  template: "referral-converted",
                  data: {
                    name: refProfile.full_name?.split(" ")[0] ?? undefined,
                    referralCount: (rc?.premium_conversions ?? 0) + 1,
                  },
                },
              });
            } catch (e) {
              // referral-converted template may not exist yet; not fatal
              console.warn("[check-subscription] referral notify failed", e);
            }
          }
        }
      }
    } catch (e) {
      console.warn("[check-subscription] referral side-effect failed", e);
    }

    return new Response(JSON.stringify({
      subscribed: true,
      tier: mapping.tier,
      interval: mapping.interval,
      status: active.status,
      current_period_end: row.current_period_end,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-subscription error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
