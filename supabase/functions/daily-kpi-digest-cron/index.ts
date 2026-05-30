// daily-kpi-digest-cron
//
// One email a day to the founder team summarising the last 24 hours:
//   - signups (auth.users created in 24h)
//   - paying members (subscriptions where status in active/trialing)
//   - MRR right now + MRR delta vs prior 24h
//   - churn (subscriptions transitioned to canceled in 24h)
//   - wizard completions (analytics event: brief_completed) + conversion
//
// Fired by pg_cron at 9am Almaty (UTC+5) → 04:00 UTC. Hardcoded
// recipient: samuel.shn.han@gmail.com (the template's `to` default
// also points there but we pass it explicitly so the cron is the
// single source of truth).
//
// Idempotency: one digest per UTC date is enough; the idempotency_key
// in send-transactional-email guarantees we don't double-send if cron
// fires twice (or admin manually re-invokes).
//
// Auth: requireAdminOrService.

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

const PRICE_TO_MONTHLY_USD: Record<string, number> = {
  // Mirror PRICE_MAP in stripe-webhook so MRR math stays in lockstep.
  // Annual prices contribute their monthly equivalent ($360/yr → $30/mo).
  price_1TQ2ZJQVirFUxpBgzaY5UYF0: 39.99, // pro monthly
  price_1TQ2ZKQVirFUxpBgz4Od1J5C: 30.00, // pro yearly
  price_1TQ2ZMQVirFUxpBgviQFJwkF: 39.99, // founding monthly
  price_1TQ2ZNQVirFUxpBgoFdRKYSs: 30.00, // founding yearly
  price_1TQTyAQVirFUxpBg4YtW8JFo: 39.99, // founding monthly (variant)
  price_1TQRdvQVirFUxpBgcYeYbhDr: 39.99, // founding monthly (variant)
  price_1TQRdxQVirFUxpBgCBDWbNfI: 30.00, // founding yearly (variant)
};

function mrrOf(rows: { stripe_price_id: string | null; status: string }[]): number {
  return rows
    .filter((r) => ["active", "trialing"].includes(r.status))
    .reduce((sum, r) => sum + (PRICE_TO_MONTHLY_USD[r.stripe_price_id ?? ""] ?? 0), 0);
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return respondError(401, auth.reason ?? "unauthorized", corsHeaders);

  const admin = createServiceClient();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000);

  // Paying members + MRR snapshot — all rows, status filter applied in mrrOf.
  const { data: subs } = await admin
    .from("subscriptions")
    .select("stripe_price_id, status, created_at, canceled_at");
  const subsRows = subs ?? [];
  const payingMembers = subsRows.filter((r) =>
    ["active", "trialing"].includes(r.status)
  ).length;
  const mrrUsd = mrrOf(subsRows);

  // Synthetic prior-day snapshot: subtract rows that became active in
  // the last 24h, add back rows canceled in the last 24h. Approximate
  // but good enough to flag direction-of-travel.
  const recentlyActivated = subsRows.filter((r) =>
    r.created_at && new Date(r.created_at) > dayAgo &&
    ["active", "trialing"].includes(r.status)
  );
  const recentlyCanceled = subsRows.filter((r) =>
    r.canceled_at && new Date(r.canceled_at) > dayAgo
  );
  const priorMrr = mrrUsd
    - recentlyActivated.reduce((s, r) => s + (PRICE_TO_MONTHLY_USD[r.stripe_price_id ?? ""] ?? 0), 0)
    + recentlyCanceled.reduce((s, r) => s + (PRICE_TO_MONTHLY_USD[r.stripe_price_id ?? ""] ?? 0), 0);
  const mrrDelta24hUsd = +(mrrUsd - priorMrr).toFixed(2);

  // Signups in last 24h.
  let signups24h = 0;
  try {
    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    signups24h = (usersPage?.users ?? []).filter(
      (u) => u.created_at && new Date(u.created_at) > dayAgo
    ).length;
  } catch (e) {
    console.warn("[daily-kpi-digest-cron] listUsers failed", e);
  }

  // Wizard completion event in last 24h + conversion proxy: how many
  // unique anon_ids saw brief_completed → also became signed-in users.
  const { data: wizardEvents } = await admin
    .from("analytics_events")
    .select("anon_id, user_id, created_at, event_name")
    .eq("event_name", "brief_completed")
    .gte("created_at", dayAgo.toISOString());

  const wizardCompletions24h = (wizardEvents ?? []).length;
  const signedThroughWizard = (wizardEvents ?? []).filter((e) => !!e.user_id).length;
  const wizardToSignupRate = wizardCompletions24h > 0
    ? signedThroughWizard / wizardCompletions24h
    : undefined;

  const forDateLabel = dayAgo.toISOString().slice(0, 10);

  // Top note — single human-readable sentence picking the most salient
  // signal of the day so the founder can skim in 2 seconds.
  let topNote: string | undefined;
  if (signups24h === 0 && wizardCompletions24h > 0) {
    topNote = `${wizardCompletions24h} wizard completions but 0 signups — gate / pricing friction worth a look.`;
  } else if (mrrDelta24hUsd < 0) {
    topNote = `MRR down $${Math.abs(mrrDelta24hUsd).toFixed(2)} today — check cancellations.`;
  } else if (signups24h >= 3) {
    topNote = `Strong day — ${signups24h} new signups.`;
  }

  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        recipientEmail: "samuel.shn.han@gmail.com",
        templateName: "member-kpi-digest",
        idempotencyKey: `kpi-digest-${forDateLabel}`,
        templateData: {
          forDateLabel,
          signups24h,
          payingMembers,
          mrrUsd,
          mrrDelta24hUsd,
          churned24h: recentlyCanceled.length,
          wizardCompletions24h,
          wizardToSignupRate,
          topNote,
          language: "en",
        },
      },
    });
  } catch (e) {
    console.error("[daily-kpi-digest-cron] enqueue failed", e);
    return respondError(500, "enqueue failed", corsHeaders);
  }

  return respondJson(200, {
    ok: true,
    forDateLabel,
    signups24h,
    payingMembers,
    mrrUsd,
    mrrDelta24hUsd,
    churned24h: recentlyCanceled.length,
    wizardCompletions24h,
    wizardToSignupRate,
  }, corsHeaders);
});
