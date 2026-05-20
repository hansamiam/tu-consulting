// stripe-webhook — receives subscription/billing events from Stripe and
// mirrors them into public.subscriptions + queues churn-recovery email.
//
// Previously the only path to refresh local subscription state was the
// frontend polling check-subscription (every 60s while the app is open).
// That meant:
//   · A user whose card failed had to revisit the app for us to even
//     notice they were past_due.
//   · We never sent a dunning email, so cards expiring → silent churn.
//   · A user cancelling from the Stripe customer portal didn't update
//     local state until they happened to load the SPA again.
//
// This webhook closes that loop. Events handled:
//
//   customer.subscription.created  →  upsert row (status from Stripe)
//   customer.subscription.updated  →  upsert row (status, period, cancel-at-period-end)
//   customer.subscription.deleted  →  upsert row as canceled
//   invoice.payment_failed         →  mark past_due + queue churn email
//   invoice.payment_succeeded      →  re-affirm active (past_due → active)
//
// Setup (one-time, in Stripe dashboard):
//   1. Webhook endpoint: https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/stripe-webhook
//   2. Events to send: the five above
//   3. Set STRIPE_WEBHOOK_SECRET in Supabase function secrets to the
//      webhook signing secret Stripe gives you.
//
// Auth: verify_jwt = false in config.toml. The webhook signature header
// (Stripe-Signature) is the auth — Stripe.webhooks.constructEventAsync
// rejects any request that doesn't carry a valid HMAC over the raw body.
// Failed signature verification returns 400 so Stripe stops retrying.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const PRICE_MAP: Record<string, { tier: "pro" | "founding"; interval: "month" | "year" }> = {
  // Legacy + current price IDs, kept in sync with check-subscription's PRICE_MAP.
  price_1TQ2ZJQVirFUxpBgzaY5UYF0: { tier: "pro", interval: "month" },
  price_1TQ2ZKQVirFUxpBgz4Od1J5C: { tier: "pro", interval: "year" },
  price_1TQ2ZMQVirFUxpBgviQFJwkF: { tier: "founding", interval: "month" },
  price_1TQ2ZNQVirFUxpBgoFdRKYSs: { tier: "founding", interval: "year" },
  price_1TQTyAQVirFUxpBg4YtW8JFo: { tier: "founding", interval: "month" },
  price_1TQRdvQVirFUxpBgcYeYbhDr: { tier: "founding", interval: "month" },
  price_1TQRdxQVirFUxpBgCBDWbNfI: { tier: "founding", interval: "year" },
};

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

async function syncSubscription(
  stripe: Stripe,
  admin: ReturnType<typeof createServiceClient>,
  sub: Stripe.Subscription,
) {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const mapping = priceId && PRICE_MAP[priceId]
    ? PRICE_MAP[priceId]
    : { tier: "pro" as const, interval: "month" as const };

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Resolve user_id + email. Always pull the customer so we have email
  // even when metadata.user_id is present (we need it on the row).
  let userId: string | null = (sub.metadata?.user_id as string) ?? null;
  let userEmail: string | null = null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer && !(customer as Stripe.DeletedCustomer).deleted) {
    userEmail = (customer as Stripe.Customer).email ?? null;
  }

  if (!userId && userEmail) {
    // Look up auth user by email. We use a paginated listUsers + filter
    // rather than auth.admin.getUserByEmail because the latter isn't
    // available in the deno @supabase/supabase-js client at v2.x.
    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = usersPage?.users.find((u) => u.email?.toLowerCase() === userEmail!.toLowerCase());
    userId = match?.id ?? null;
  }

  if (!userId || !userEmail) {
    console.warn("[stripe-webhook] could not resolve user for subscription", {
      sub_id: sub.id,
      has_user_id: !!userId,
      has_email: !!userEmail,
    });
    return { userId: null, userEmail: null };
  }

  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  const periodStart = (sub as unknown as { current_period_start?: number }).current_period_start;
  const foundingNumberRaw = sub.metadata?.founding_member_number;
  const foundingNumber = foundingNumberRaw ? parseInt(foundingNumberRaw, 10) : null;

  const row = {
    user_id: userId,
    email: userEmail,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    tier: mapping.tier,
    status: sub.status,
    billing_interval: mapping.interval,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    is_founding_member: mapping.tier === "founding",
    founding_member_number: mapping.tier === "founding" ? foundingNumber : null,
  };

  const { error } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "stripe_subscription_id" });
  if (error) {
    console.error("[stripe-webhook] subscriptions upsert failed", error.message, sub.id);
  }
  return { userId, userEmail };
}

async function queuePaymentFailedEmail(
  admin: ReturnType<typeof createServiceClient>,
  email: string,
  invoiceId: string,
) {
  // Idempotency keyed by invoice — Stripe will retry the same invoice
  // multiple times before giving up; we want one email per dunning
  // cycle, not one per retry.
  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "payment-failed-recovery",
        idempotencyKey: `payment-failed-${invoiceId}`,
        templateData: {
          billingPortalUrl: `${SITE}/account`,
          language: "en",
        },
      },
    });
  } catch (e) {
    console.warn("[stripe-webhook] payment-failed-recovery enqueue failed", e);
  }
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") {
    return respondError(405, "POST only", corsHeaders);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return respondError(400, "Missing Stripe-Signature header", corsHeaders);
  }

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const apiKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret || !apiKey) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY unset");
    return respondError(500, "Server misconfigured", corsHeaders);
  }

  const stripe = new Stripe(apiKey, { apiVersion: "2025-08-27.basil" });
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch (e) {
    console.warn("[stripe-webhook] signature verification failed", (e as Error).message);
    return respondError(400, `Invalid signature: ${(e as Error).message}`, corsHeaders);
  }

  const admin = createServiceClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(stripe, admin, sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string | Stripe.Subscription }).subscription;
        if (subId) {
          const sub = typeof subId === "string"
            ? await stripe.subscriptions.retrieve(subId)
            : subId;
          const { userEmail } = await syncSubscription(stripe, admin, sub);
          const email = userEmail || invoice.customer_email;
          if (email && invoice.id) {
            await queuePaymentFailedEmail(admin, email, invoice.id);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string | Stripe.Subscription }).subscription;
        if (subId) {
          const sub = typeof subId === "string"
            ? await stripe.subscriptions.retrieve(subId)
            : subId;
          await syncSubscription(stripe, admin, sub);
        }
        break;
      }

      default:
        // We only subscribe to the events we handle; any other event
        // here means Stripe sent us something we didn't ask for —
        // 200-ack so Stripe stops retrying.
        console.log("[stripe-webhook] ignoring event type", event.type);
    }

    return respondJson(200, { received: true, type: event.type }, corsHeaders);
  } catch (e) {
    console.error("[stripe-webhook] handler error", e);
    // Return 500 so Stripe retries — transient DB errors shouldn't
    // be silently swallowed.
    return respondError(500, (e as Error).message, corsHeaders);
  }
});
