// workshop-broadcast-cron
//
// Cron-driven broadcaster for upcoming Academy workshops + office hours.
//
// Promise the product makes (Pricing / FAQ): "live workshops + office
// hours every two weeks, alternating fortnights". For that promise to
// hold, members need the Zoom link in their inbox without checking
// the app first. This cron does exactly two things:
//
//   1. T-24h reminder — for every published academy_workshops row whose
//      scheduled_for is between now+23h and now+25h and whose
//      broadcast_24h_sent_at IS NULL, queue the cohort-event-reminder
//      template to every active member. Stamp broadcast_24h_sent_at on
//      success.
//
//   2. T-1h reminder — same logic, between now+45min and now+75min,
//      stamps broadcast_1h_sent_at. Same template, different lead-time
//      copy is conveyed via the "hoursUntil" templateData field.
//
// Active member definition (matches /admin/segments and KPI digest):
//   subscriptions.status IN ('active', 'trialing')
//
// This cron is meant to be fired by pg_cron every 5 minutes. The two
// scan windows are wide enough to tolerate cron misfires up to ~10
// minutes; the broadcast_*_sent_at columns guarantee idempotency.
//
// Auth: requireAdminOrService — pg_cron uses the dispatch token.

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

interface WorkshopRow {
  id: string;
  title: string;
  kind: string;
  scheduled_for: string;
  join_url: string | null;
  summary: string | null;
}

async function loadActiveMembers(
  admin: ReturnType<typeof createServiceClient>,
): Promise<{ email: string; user_id: string | null }[]> {
  // We pull from subscriptions only — auth.users is the source of truth
  // for email of record. Subscriptions stores email at signup so we
  // don't need a join for the broadcast pass.
  const { data, error } = await admin
    .from("subscriptions")
    .select("email, user_id")
    .in("status", ["active", "trialing"]);
  if (error) {
    console.error("[workshop-broadcast-cron] loadActiveMembers failed", error);
    return [];
  }
  return (data ?? []).filter((r) => !!r.email);
}

async function fanOut(
  admin: ReturnType<typeof createServiceClient>,
  workshop: WorkshopRow,
  leadTimeLabel: "24h" | "1h",
  members: { email: string; user_id: string | null }[],
) {
  // cohort-event-reminder field names — keep this mapping local so
  // the cron stays the single source of truth for what each broadcast
  // window passes to the shared template.
  const eventKind = (
    workshop.kind === "office_hours" ? "office_hours" : "workshop"
  ) as "workshop" | "office_hours";

  let queued = 0;
  for (const m of members) {
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: m.email,
          templateName: "cohort-event-reminder",
          // Idempotency key includes both workshop id and lead-time so
          // re-runs of the same window can't double-send.
          idempotencyKey: `workshop-${workshop.id}-${leadTimeLabel}-${m.email}`,
          templateData: {
            eventTitle: workshop.title,
            eventKind,
            startsAt: workshop.scheduled_for,
            meetingUrl: workshop.join_url ?? `${SITE}/academy`,
            cohortSlug: "academy",
            siteUrl: SITE,
            window: leadTimeLabel,
            language: "en",
          },
        },
      });
      queued++;
    } catch (e) {
      console.warn(
        `[workshop-broadcast-cron] enqueue failed (${leadTimeLabel}) for ${m.email}`,
        e,
      );
    }
  }
  return queued;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return respondError(401, auth.reason ?? "unauthorized", corsHeaders);

  const admin = createServiceClient();

  // ── Window 1: T-24h ─────────────────────────────────────────────────────
  // Pick rows scheduled between now+23h and now+25h whose 24h flag is null.
  const now = Date.now();
  const t24Lo = new Date(now + 23 * 3600 * 1000).toISOString();
  const t24Hi = new Date(now + 25 * 3600 * 1000).toISOString();
  const t01Lo = new Date(now + 45 * 60 * 1000).toISOString();
  const t01Hi = new Date(now + 75 * 60 * 1000).toISOString();

  const { data: due24, error: e24 } = await admin
    .from("academy_workshops")
    .select("id,title,kind,scheduled_for,join_url,summary,broadcast_24h_sent_at")
    .eq("is_published", true)
    .gte("scheduled_for", t24Lo)
    .lte("scheduled_for", t24Hi)
    .is("broadcast_24h_sent_at", null);

  const { data: due01, error: e01 } = await admin
    .from("academy_workshops")
    .select("id,title,kind,scheduled_for,join_url,summary,broadcast_1h_sent_at")
    .eq("is_published", true)
    .gte("scheduled_for", t01Lo)
    .lte("scheduled_for", t01Hi)
    .is("broadcast_1h_sent_at", null);

  if (e24 || e01) {
    console.error("[workshop-broadcast-cron] scan failed", { e24, e01 });
    return respondError(500, "scan failed", corsHeaders);
  }

  const allDue = [
    ...(due24 ?? []).map((w) => ({ row: w as WorkshopRow, leadLabel: "24h" as const })),
    ...(due01 ?? []).map((w) => ({ row: w as WorkshopRow, leadLabel: "1h" as const })),
  ];

  if (allDue.length === 0) {
    return respondJson({ ok: true, broadcasts: 0, note: "no due rows" }, 200, corsHeaders);
  }

  const members = await loadActiveMembers(admin);
  if (members.length === 0) {
    console.warn("[workshop-broadcast-cron] no active members to broadcast to");
    return respondJson({ ok: true, broadcasts: 0, note: "no active members" }, 200, corsHeaders);
  }

  const results: Array<{ workshop_id: string; lead: "24h" | "1h"; queued: number }> = [];
  for (const { row, leadLabel } of allDue) {
    const queued = await fanOut(admin, row, leadLabel, members);
    const stampCol = leadLabel === "24h" ? "broadcast_24h_sent_at" : "broadcast_1h_sent_at";
    await admin
      .from("academy_workshops")
      .update({ [stampCol]: new Date().toISOString() })
      .eq("id", row.id);
    results.push({ workshop_id: row.id, lead: leadLabel, queued });
  }

  return respondJson({ ok: true, broadcasts: results.length, results }, 200, corsHeaders);
});
