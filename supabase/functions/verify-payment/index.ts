// Verifies a Stripe Checkout session and marks the corresponding booking paid.
// Called from the ThankYou page on load with ?session_id=cs_...
// Idempotent — safe to call multiple times.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  try {
    const { session_id } = await req.json().catch(() => ({}));
    if (!session_id || typeof session_id !== "string" || !session_id.startsWith("cs_")) {
      return respondError(400, "Valid session_id required", corsHeaders);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    const supabase = createServiceClient();

    const paid = session.payment_status === "paid";
    const status = paid ? "paid" : session.payment_status === "unpaid" ? "checkout_initiated" : "pending_review";

    // Find the booking we created at checkout time.
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, status, paid_at")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (existing && (existing.status !== "paid" || !existing.paid_at)) {
      const updates: Record<string, unknown> = { status };
      if (paid) {
        updates.paid_at = new Date().toISOString();
        updates.stripe_payment_intent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null;
      }
      await supabase.from("bookings").update(updates).eq("id", existing.id);

      if (paid) {
        await supabase.from("student_interactions").insert({
          event_type: "payment_completed",
          event_data: {
            booking_id: existing.id,
            amount_usd: (session.amount_total || 0) / 100,
            session_id,
          },
        });
      }
    }

    return respondJson(200, {
      paid,
      status,
      amount_usd: (session.amount_total || 0) / 100,
      currency: session.currency,
      customer_email: session.customer_email || session.customer_details?.email,
      product_name: session.metadata?.product_key || null,
      is_consultation: session.metadata?.is_consultation === "true",
    }, corsHeaders);
  } catch (e) {
    console.error("verify-payment error:", e);
    return respondError(500, e instanceof Error ? e.message : "Unknown", corsHeaders);
  }
});
