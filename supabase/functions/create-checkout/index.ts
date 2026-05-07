// Creates a Stripe Checkout Session for a consulting package or consultation.
// Public endpoint (no auth required) — bookings are anonymous and tied by email.
// Uses dynamic price_data (no Stripe Product/Price required) so we can iterate
// pricing without re-creating Stripe objects every time.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Authoritative server-side catalog. Frontend can never tamper with prices.
// product_key -> { name, amount_usd_cents, is_consultation, sessions, image }
const CATALOG: Record<
  string,
  {
    name: string;
    amount_usd_cents: number;
    is_consultation: boolean;
    description: string;
  }
> = {
  starter: {
    name: "Starter Package",
    amount_usd_cents: 39000,
    is_consultation: false,
    description: "5 sessions of comprehensive consulting + essay structure review + mock admissions feedback.",
  },
  standard: {
    name: "Standard Package",
    amount_usd_cents: 69000,
    is_consultation: false,
    description: "10 sessions, full essay editing (3 essays), interview prep, scholarship guidance, ongoing email support.",
  },
  premium: {
    name: "Premium Package",
    amount_usd_cents: 130000,
    is_consultation: false,
    description: "20 sessions, unlimited essay revisions, 3 mock interviews, priority support, post-application guidance.",
  },
  strategy: {
    name: "Strategy Consultation (50 min)",
    amount_usd_cents: 5800,
    is_consultation: true,
    description: "Extended 1-on-1 strategy call: comprehensive discussion, initial assessment, package recommendations, Q&A.",
  },
};

// Promo codes — server-side enforced (frontend can hint, but we re-validate here).
const PROMOS: Record<string, { discount: number; only_consultation: boolean; label: string }> = {
  LAUNCH30: { discount: 0.3, only_consultation: true, label: "Launch 30% off (consultations)" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      product_key,
      contact_email,
      contact_name,
      contact_phone,
      promo_code,
      language = "en",
      metadata: extraMeta = {},
    } = body || {};

    if (!product_key || typeof product_key !== "string" || !CATALOG[product_key]) {
      return new Response(JSON.stringify({ error: "Invalid product_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!contact_email || typeof contact_email !== "string" || !contact_email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid contact_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const item = CATALOG[product_key];
    let amount = item.amount_usd_cents;
    let appliedPromo: string | null = null;
    let discountPct = 0;

    if (promo_code && typeof promo_code === "string") {
      const code = promo_code.trim().toUpperCase();
      const promo = PROMOS[code];
      if (promo && (!promo.only_consultation || item.is_consultation)) {
        amount = Math.round(amount * (1 - promo.discount));
        appliedPromo = code;
        discountPct = promo.discount;
      }
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY missing");
      return new Response(JSON.stringify({ error: "Payment provider not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Pre-create a pending booking row so we can correlate the session_id later.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        consultation_type: item.name,
        is_consultation: item.is_consultation,
        original_price: `$${(item.amount_usd_cents / 100).toFixed(2)}`,
        discount: discountPct,
        final_price: amount / 100,
        promo_code: appliedPromo,
        currency: "usd",
        language,
        contact_email: contact_email.trim().toLowerCase(),
        contact_name: contact_name?.trim() || null,
        contact_phone: contact_phone?.trim() || null,
        status: "checkout_initiated",
      })
      .select()
      .single();

    if (bookingErr) {
      console.error("Pre-checkout booking insert failed:", bookingErr);
    }

    // Resolve the success/cancel origin against an allowlist instead of
    // trusting the caller's Origin header. The previous code accepted
    // whatever Origin the request supplied; an attacker could spoof
    // Origin: https://attacker.example, Stripe would redirect the paid
    // user there post-checkout with the session_id in the URL — letting
    // the attacker pull session metadata via verify-payment. Allow
    // localhost (dev) + the configured site + the legacy domain.
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
    const langSuffix = language === "ru" ? "/ru" : "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: contact_email.trim().toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: item.name,
              description: item.description,
            },
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: false, // we apply promos server-side ourselves
      success_url: `${origin}/thank-you${langSuffix}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled${langSuffix}?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        product_key,
        booking_id: booking?.id || "",
        contact_name: contact_name?.trim() || "",
        contact_phone: contact_phone?.trim() || "",
        is_consultation: String(item.is_consultation),
        promo_code: appliedPromo || "",
        language,
        ...Object.fromEntries(
          Object.entries(extraMeta || {})
            .filter(([_, v]) => typeof v === "string" || typeof v === "number")
            .slice(0, 10)
            .map(([k, v]) => [k.slice(0, 40), String(v).slice(0, 200)]),
        ),
      },
    });

    if (booking?.id && session.id) {
      await supabase
        .from("bookings")
        .update({ stripe_session_id: session.id })
        .eq("id", booking.id);
    }

    // Funnel mirror
    await supabase.from("student_interactions").insert({
      event_type: "checkout_created",
      event_data: {
        product_key,
        amount_usd: amount / 100,
        promo: appliedPromo,
        booking_id: booking?.id || null,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id, booking_id: booking?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
