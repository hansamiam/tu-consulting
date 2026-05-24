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

async function queueMembershipWelcomeEmail(
  admin: ReturnType<typeof createServiceClient>,
  email: string,
  subId: string,
  tier: "pro" | "founding",
) {
  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "membership-welcome",
        // One welcome per subscription. If the user cancels and
        // resubscribes later, the new sub_id rekey means they get
        // a fresh welcome — by design.
        idempotencyKey: `membership-welcome-${subId}`,
        templateData: {
          tier,
          briefUrl: `${SITE}/topuni-ai`,
          resourcesUrl: `${SITE}/academy`,
          discoverUrl: `${SITE}/discover`,
          pipelineUrl: `${SITE}/pipeline`,
          accountUrl: `${SITE}/account`,
          language: "en",
        },
      },
    });
  } catch (e) {
    console.warn("[stripe-webhook] membership-welcome enqueue failed", e);
  }
}

// Phase B2 v2 — membership-perk model. After membership-welcome, look up
// the cohort the new subscriber gets dropped into and fire cohort-welcome.
// "The cohort" = the next-starting cohort whose window includes or is
// within 60 days of now() and whose status is open/in_progress.
//
// Skips silently if there's no current/upcoming cohort (admin hasn't
// created one yet, transition gap between cycles, etc.) — they'll get
// the next cohort's welcome when one opens via a separate trigger we'll
// wire as a later iteration.
async function queueCohortWelcomeEmail(
  admin: ReturnType<typeof createServiceClient>,
  email: string,
  subId: string,
  firstName: string | null,
) {
  // We keep this try/catch broad so the webhook stays 200-ack-able even
  // if the cohorts table is unreachable — Stripe redelivery would not
  // help recover a missed cohort-welcome (the subscription row is
  // already synced, so retried events would no-op on the upsert and
  // we'd lose this side-effect entirely). Instead: log loudly with
  // enough context (subId, cohort_id when known) for a manual re-send.
  let loadedCohortId: string | null = null;
  try {
    // Casts through any until gen:types catches up with the cohorts
    // schema (added in 20260524120000_cohorts_schema.sql, PR #63).
    // deno-lint-ignore no-explicit-any
    const db = admin as any;
    const { data: cohort, error } = await db
      .from("cohorts")
      .select("cohort_id, name, slug, starts_at")
      .in("status", ["open", "in_progress"])
      .gte("ends_at", new Date().toISOString())
      // 60-day lookahead so members joining ahead of a cycle still get
      // welcomed into the next one; tweak if cycles grow longer-spaced.
      .lte("starts_at", new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[stripe-webhook] cohort lookup failed — cohort-welcome SKIPPED, manual re-send needed", {
        sub_id: subId,
        email,
        error: error.message,
      });
      return;
    }
    if (!cohort) {
      // No current/upcoming cohort — fine, skip the welcome.
      return;
    }
    loadedCohortId = cohort.cohort_id;
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "cohort-welcome",
        // Idempotency keyed by (subscription, cohort) — a user keeping
        // their sub across multiple cohorts will get a fresh welcome
        // each time a new cohort opens (the cohort_id rotates).
        idempotencyKey: `cohort-welcome-${subId}-${cohort.cohort_id}`,
        templateData: {
          cohortName: cohort.name,
          startsAt: cohort.starts_at,
          cohortSlug: cohort.slug,
          siteUrl: SITE,
          firstName: firstName ?? undefined,
          language: "en",
        },
      },
    });
  } catch (e) {
    console.error("[stripe-webhook] cohort-welcome enqueue failed — manual re-send needed", {
      sub_id: subId,
      email,
      cohort_id: loadedCohortId,
      error: (e as Error).message,
    });
  }
}

async function queueCancellationEmail(
  admin: ReturnType<typeof createServiceClient>,
  email: string,
  subId: string,
  periodEndIso: string | null,
  language: "en" | "ru" = "en",
) {
  // One email per subscription cancellation cycle. If the user
  // reactivates and then cancels again, the new cancellation gets
  // a new period_end so we re-key on it.
  const periodKey = periodEndIso?.slice(0, 10) ?? "unknown";
  const periodEndDate = periodEndIso
    ? new Date(periodEndIso).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : (language === "ru" ? "конец оплаченного периода" : "end of your billing period");
  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "cancellation-recovery",
        idempotencyKey: `cancellation-recovery-${subId}-${periodKey}`,
        templateData: {
          periodEndDate,
          reactivateUrl: `${SITE}/account`,
          surveyUrl: `${SITE}/account?action=cancel-survey`,
          language,
        },
      },
    });
  } catch (e) {
    console.warn("[stripe-webhook] cancellation-recovery enqueue failed", e);
  }
}

// Renewal receipt — fires on invoice.payment_succeeded with
// billing_reason === 'subscription_cycle' (i.e. true monthly/yearly
// renewal, not the first charge of a new sub which is already covered
// by membership-welcome). Body: amount, period, billing portal link.
//
// Idempotency keyed by invoice.id so webhook retries don't double-send.
// Same billing-portal try/catch fallback as queuePaymentFailedEmail.
async function queueRenewalReceiptEmail(
  admin: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  email: string,
  invoice: Stripe.Invoice,
  customerId: string | null,
  tier: "pro" | "founding",
) {
  let billingPortalUrl = `${SITE}/account`;
  if (customerId) {
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${SITE}/account`,
      });
      if (portal.url) billingPortalUrl = portal.url;
    } catch (e) {
      console.warn("[stripe-webhook] billingPortal.create failed (renewal), falling back to /account", (e as Error).message);
    }
  }

  // Invoice fields land at the top level for one-time invoices but on
  // the first line item for subscription invoices. Pull the period from
  // the line item when present so the email shows the actual billed
  // window (Stripe rolls the period off the price). Fall back to invoice-
  // level fields if line items aren't expanded.
  const line = invoice.lines?.data?.[0] as
    | { period?: { start?: number; end?: number } }
    | undefined;
  const startUnix = line?.period?.start
    ?? (invoice as unknown as { period_start?: number }).period_start
    ?? null;
  const endUnix = line?.period?.end
    ?? (invoice as unknown as { period_end?: number }).period_end
    ?? null;
  const periodStart = startUnix
    ? new Date(startUnix * 1000).toISOString()
    : new Date().toISOString();
  const periodEnd = endUnix
    ? new Date(endUnix * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  // amount_paid is in minor units (cents). Currency is already an ISO 4217
  // string from Stripe.
  const amount = (invoice.amount_paid ?? 0) / 100;
  const currency = invoice.currency ?? "usd";

  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "renewal-receipt",
        idempotencyKey: `renewal-receipt-${invoice.id}`,
        templateData: {
          amount,
          currency,
          periodStart,
          periodEnd,
          billingPortalUrl,
          tier,
          language: "en",
        },
      },
    });
  } catch (e) {
    console.warn("[stripe-webhook] renewal-receipt enqueue failed", e);
  }
}

async function queuePaymentFailedEmail(
  admin: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  email: string,
  invoiceId: string,
  customerId: string | null,
) {
  // Idempotency keyed by invoice — Stripe will retry the same invoice
  // multiple times before giving up; we want one email per dunning
  // cycle, not one per retry.
  //
  // Generate a Stripe Billing Portal session so the recovery email's
  // CTA drops the user straight into the payment-method edit screen
  // instead of bouncing through /account. If the Stripe API call fails
  // (network blip, deleted customer, missing portal config), fall back
  // to the generic account URL so the email still sends.
  let billingPortalUrl = `${SITE}/account`;
  if (customerId) {
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${SITE}/account`,
      });
      if (portal.url) billingPortalUrl = portal.url;
    } catch (e) {
      console.warn("[stripe-webhook] billingPortal.create failed, falling back to /account", (e as Error).message);
    }
  }

  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: email,
        templateName: "payment-failed-recovery",
        idempotencyKey: `payment-failed-${invoiceId}`,
        templateData: {
          billingPortalUrl,
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
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const { userEmail } = await syncSubscription(stripe, admin, sub);
        const item = sub.items.data[0];
        const priceId = item?.price?.id;
        const tier = priceId && PRICE_MAP[priceId]?.tier;
        const isActive = ["active", "trialing"].includes(sub.status);
        if (userEmail && tier && isActive) {
          await queueMembershipWelcomeEmail(admin, userEmail, sub.id, tier);
          // Phase B2 v2 — cohort welcome rides on the membership welcome.
          // Stripe customer name (if present) becomes firstName for the
          // greeting; otherwise the email greets neutrally.
          const customerId = typeof sub.customer === "string"
            ? sub.customer
            : sub.customer.id;
          let firstName: string | null = null;
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !(customer as Stripe.DeletedCustomer).deleted) {
              const fullName = (customer as Stripe.Customer).name ?? null;
              firstName = fullName ? fullName.split(" ")[0] : null;
            }
          } catch (_) {
            // Customer fetch failure is non-fatal — fall through with
            // null firstName and the email uses the neutral greeting.
          }
          await queueCohortWelcomeEmail(admin, userEmail, sub.id, firstName);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(stripe, admin, sub);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        // Stripe diffs the prior state in `previous_attributes` so we
        // can detect a transition rather than firing the cancellation
        // email on every subsequent update. We only care about the
        // false→true flip on cancel_at_period_end (user clicked cancel).
        const prev = (event.data as unknown as { previous_attributes?: { cancel_at_period_end?: boolean } })
          .previous_attributes;
        const justCanceled =
          prev?.cancel_at_period_end === false && sub.cancel_at_period_end === true;

        const { userEmail } = await syncSubscription(stripe, admin, sub);
        if (justCanceled && userEmail) {
          const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
          const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
          await queueCancellationEmail(admin, userEmail, sub.id, periodEndIso);
        }
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
          const customerId = typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null;
          if (email && invoice.id) {
            await queuePaymentFailedEmail(admin, stripe, email, invoice.id, customerId);
          } else {
            console.error("[stripe-webhook] payment_failed but no email resolvable — dunning email skipped", {
              invoice_id: invoice.id,
              customer_id: customerId,
              userEmail_present: !!userEmail,
              customer_email_present: !!invoice.customer_email,
            });
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
          const { userEmail } = await syncSubscription(stripe, admin, sub);

          // Receipt email — only on true renewals. The first invoice of
          // a new subscription has billing_reason === 'subscription_create'
          // and is the same charge that fires customer.subscription.created
          // (which already sends membership-welcome). Sending a receipt
          // there would double up. Real renewals are 'subscription_cycle'.
          // Other billing_reasons (subscription_update for proration,
          // manual, etc.) are skipped here — they're rare enough that
          // silence is fine until we explicitly want to handle them.
          const billingReason = (invoice as unknown as { billing_reason?: string }).billing_reason;
          if (
            billingReason === "subscription_cycle"
            && userEmail
            && invoice.id
          ) {
            const item = sub.items.data[0];
            const priceId = item?.price?.id;
            const tier = (priceId && PRICE_MAP[priceId]?.tier) ?? "pro";
            const customerId = typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id ?? null;
            await queueRenewalReceiptEmail(admin, stripe, userEmail, invoice, customerId, tier);
          } else if (billingReason === "subscription_cycle" && (!userEmail || !invoice.id)) {
            const customerId = typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id ?? null;
            console.error("[stripe-webhook] payment_succeeded (subscription_cycle) but no email resolvable — renewal receipt skipped", {
              invoice_id: invoice.id,
              customer_id: customerId,
              userEmail_present: !!userEmail,
              customer_email_present: !!invoice.customer_email,
            });
          }
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
