// Creates a Stripe Checkout Session for the Early-Access Membership.
// Single SKU tier ('founding' — kept as the internal identifier so
// active subscriptions don't break), two intervals ('month' | 'year').
// Capped at 50 spots in production (founding_member_counter.cap),
// down from 100 — the cohort moved smaller for stronger scarcity.
// Atomically reserves an early-access slot before checkout — no
// overselling.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

// TopUni Membership — $39.99/mo, $299.99/yr (effective $24.99/mo).
// Internal SKU identifier 'founding' preserved (existing DB rows
// reference it). The defaults below are the canonical live prices on
// product prod_UPIZ0f2qRvxvAc; env overrides let staging or future
// price-revision deploys swap them out via `supabase secrets set`
// without a code change. The Pricing UI's monthly/annual toggle maps
// directly onto the `interval` field.
const FOUNDING_PRICES: { month: string; year: string } = {
  month: Deno.env.get("STRIPE_PRICE_ID_MONTHLY") ?? "price_1TbkojQVirFUxpBg5iPsYmBO",
  year:  Deno.env.get("STRIPE_PRICE_ID_ANNUAL")  ?? "price_1Tci5AQVirFUxpBgit06oeKa",
};

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  try {
    const body = await req.json();
    // Backward-compat: accept legacy { tier, interval } payloads, but always treat as founding.
    const interval = body.interval === "year" ? "year" : "month";
    // 2026-05-27: when ?embedded=true, return a client_secret for inline
    // Stripe Checkout (ui_mode: "embedded") instead of a redirect URL.
    // Lets the pricing page render the checkout form inline rather than
    // bouncing the user to Stripe's hosted page — keeps Sam's full pitch
    // and the payment form on the same screen.
    const embedded = body.embedded === true;

    // Auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respondError(401, "Sign in required", corsHeaders);
    }
    const userClient = createUserClient(authHeader);
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user?.email) {
      return respondError(401, "Not authenticated", corsHeaders);
    }

    const admin = createServiceClient();

    // Atomically reserve a founding slot
    const { data: claimData, error: claimErr } = await admin.rpc("claim_founding_member_slot");
    if (claimErr) {
      console.error("claim error", claimErr);
      return respondError(500, "Couldn't reserve early-access spot", corsHeaders);
    }
    if (claimData == null) {
      // Hardcoded denominator removed (was "100/100") — the cap moved
      // to 50 and any future shift would re-stale this string. The
      // claim_founding_spot RPC returns null when the cohort is full
      // regardless of cap.
      return respondError(409, "Early-access cohort is sold out. Join the waitlist for the launch-discount tier (50% off year one for the next 200 members).", corsHeaders);
    }
    const reservedFoundingNumber = claimData as number;

    // Guard: annual price must be configured before accepting year-interval
    // checkout. Empty string ⇒ STRIPE_PRICE_ID_ANNUAL secret not set yet.
    // Fail loud rather than silently bill the monthly price.
    const priceId = FOUNDING_PRICES[interval];
    if (!priceId) {
      return respondError(400, "Annual billing is not yet configured. Please choose monthly.", corsHeaders);
    }

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

    const baseSessionParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription" as const,
      line_items: [{ price: priceId, quantity: 1 }],
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
    };

    if (embedded) {
      // Embedded mode — Stripe renders the checkout inside our page.
      // No cancel_url (the page itself handles closing the embed); on
      // success, Stripe navigates the top frame to return_url.
      const session = await stripe.checkout.sessions.create({
        ...baseSessionParams,
        ui_mode: "embedded",
        return_url: `${origin}/account?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      });
      return respondJson(200, { client_secret: session.client_secret, session_id: session.id }, corsHeaders);
    }

    // Legacy redirect mode — kept for callers that haven't migrated yet
    // and as a fallback when VITE_STRIPE_PUBLISHABLE_KEY is missing.
    const session = await stripe.checkout.sessions.create({
      ...baseSessionParams,
      success_url: `${origin}/account?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
    });

    return respondJson(200, { url: session.url }, corsHeaders);
  } catch (e) {
    console.error("create-subscription-checkout error:", e);
    return respondError(500, e instanceof Error ? e.message : "Unknown", corsHeaders);
  }
});
