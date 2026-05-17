// check-subscription — queries Stripe by customer email and syncs the local subscriptions row.
// Called from the frontend on auth change + every 60s.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

// Reverse-lookup price → (tier, interval)
const PRICE_MAP: Record<string, { tier: "pro" | "founding"; interval: "month" | "year" }> = {
  // Legacy Pro prices (kept for back-compat with any older test subs)
  price_1TQ2ZJQVirFUxpBgzaY5UYF0: { tier: "pro", interval: "month" },
  price_1TQ2ZKQVirFUxpBgz4Od1J5C: { tier: "pro", interval: "year" },
  // Legacy Founding prices
  price_1TQ2ZMQVirFUxpBgviQFJwkF: { tier: "founding", interval: "month" },
  price_1TQ2ZNQVirFUxpBgoFdRKYSs: { tier: "founding", interval: "year" },
  // CURRENT Early-Access price — $19/mo
  price_1TQTyAQVirFUxpBg4YtW8JFo: { tier: "founding", interval: "month" },
  // Legacy $9 prices (kept so older test subs still resolve)
  price_1TQRdvQVirFUxpBgcYeYbhDr: { tier: "founding", interval: "month" },
  price_1TQRdxQVirFUxpBgCBDWbNfI: { tier: "founding", interval: "year" },
};

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respondJson(200, { subscribed: false }, corsHeaders);
    }

    const userClient = createUserClient(authHeader);
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user?.email) {
      return respondJson(200, { subscribed: false }, corsHeaders);
    }

    const admin = createServiceClient();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return respondJson(200, { subscribed: false, tier: "free" }, corsHeaders);
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
      return respondJson(200, { subscribed: false, tier: "free" }, corsHeaders);
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
          // student_profiles has no `language` column — selecting it 400s
          // the whole query. Default to English; see saved-searches-cron
          // fix in f30dd1a for context.
          const { data: refProfile } = await admin
            .from("student_profiles")
            .select("email, full_name")
            .eq("user_id", ref.referrer_user_id)
            .maybeSingle();
          if (refProfile?.email) {
            try {
              const refLang: "en" | "ru" = "en";
              await admin.functions.invoke("send-transactional-email", {
                body: {
                  recipientEmail: refProfile.email,
                  templateName: "referral-converted",
                  // Idempotency must be per (referrer, referee) so each
                  // converted friend triggers exactly one notify. Using
                  // ref.referred_user_id was a typo — that field isn't
                  // selected (the column is referee_user_id) so it
                  // resolved to undefined and every conversion under the
                  // same referrer collided on `ref-<uuid>-undefined`,
                  // silently dropping every notification past the first.
                  idempotencyKey: `ref-${ref.referrer_user_id}-${user.id}`,
                  templateData: {
                    name: refProfile.full_name?.split(" ")[0] ?? undefined,
                    referralCount: (rc?.premium_conversions ?? 0) + 1,
                    language: refLang,
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

    return respondJson(200, {
      subscribed: true,
      tier: mapping.tier,
      interval: mapping.interval,
      status: active.status,
      current_period_end: row.current_period_end,
    }, corsHeaders);
  } catch (e) {
    console.error("check-subscription error:", e);
    return respondJson(500, { error: e instanceof Error ? e.message : "Unknown" }, corsHeaders);
  }
});
