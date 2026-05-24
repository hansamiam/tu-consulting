// cohort-reminder-cron — Phase B3 v2.
//
// Walks cohort_events with starts_at coming up in the next 24h or 1h window
// and fires a reminder email to every active member. Idempotency lives at
// two levels: the cohort_events row has per-window sent_at flags (so the
// SQL filter skips already-reminded events) AND each per-member enqueue
// carries an idempotency_key keyed by (event_id, window, recipient).
//
// Schedule: pg_cron fires this every 5 minutes (added in
// 20260524130000_cohort_reminder_cron_schedule.sql). 5-min granularity
// means worst-case slip is ~5 min on either reminder window — fine for
// human-attended events.
//
// Membership check: "active members" = subscriptions WHERE status IN
// ('active', 'trialing'). Cohorts are a membership perk; if you stopped
// paying, you stop getting reminders. New members joining mid-cohort get
// reminders going forward (no backfill of past events).
//
// Auth: verify_jwt = false in config.toml. Self-gates via dispatchClient's
// rotation-resilient internal token: hits from pg_net carry that header.
// Public callers without the token get a 401.

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

// How far out we look. The cron fires every 5min; a tighter window means
// less wasted work per tick. Reminder rows are marked at flag time so
// they're skipped on subsequent ticks regardless of window size.
const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const WINDOW_1H_MS = 60 * 60 * 1000;
// Slack added so a reminder fires even if cron tick lands just past the
// exact target time (e.g. tick at T+24h05m still catches an event at T+24h).
const TICK_SLACK_MS = 10 * 60 * 1000;

// Auth-user fetch cap — single page only (see fanOutReminder). If
// membership grows past this, paginate; until then a single page keeps
// the function fast. We log loudly when we hit the cap so silent
// truncation surfaces in logs instead of silently swapping in English
// fallbacks for members past the cap.
const USER_FETCH_CAP = 500;

interface EventRow {
  event_id: string;
  cohort_id: string;
  kind: "group_call" | "workshop" | "office_hours" | "external";
  title: string;
  starts_at: string;
  meeting_url: string | null;
}

interface MemberRow {
  user_id: string;
  email: string;
  display_name: string | null;
  language?: "en" | "ru" | null;
}

interface CohortRow {
  slug: string;
  name: string;
}

interface RunResult {
  scanned: number;
  events_24h: number;
  events_1h: number;
  sent: number;
  failed: number;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  if (req.method !== "POST" && req.method !== "GET") {
    return respondError(405, "POST or GET only", corsHeaders);
  }

  // Self-gate via admin/service-role check. Same pattern as the existing
  // pg_cron-callable functions (process-email-queue etc.).
  const auth = await requireAdminOrService(req);
  if (!auth.ok) {
    return respondError(401, "Unauthorized", corsHeaders);
  }

  const admin = createServiceClient();
  // deno-lint-ignore no-explicit-any
  const db = admin as any;

  const now = new Date();
  const result: RunResult = {
    scanned: 0,
    events_24h: 0,
    events_1h: 0,
    sent: 0,
    failed: 0,
  };

  try {
    // ── 24h reminders ─────────────────────────────────────────────────────
    // Events whose starts_at is in the next 24h ± slack AND haven't been
    // reminded at the 24h mark yet. We also clip out anything in the past
    // (starts_at >= now) — a missed window doesn't backfill.
    const upper24h = new Date(now.getTime() + WINDOW_24H_MS + TICK_SLACK_MS);
    const { data: events24h, error: err24h } = await db
      .from("cohort_events")
      .select("event_id, cohort_id, kind, title, starts_at, meeting_url")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", upper24h.toISOString())
      .is("reminder_24h_sent_at", null);
    if (err24h) throw err24h;

    for (const ev of (events24h ?? []) as EventRow[]) {
      result.scanned += 1;
      const sent = await fanOutReminder(db, ev, "24h");
      result.sent += sent.sent;
      result.failed += sent.failed;
      // Only stamp the row reminded when we actually fanned out to at
      // least one member OR there were zero failures. If sent === 0 and
      // failed > 0, the subscriptions/users query failed transiently and
      // marking sent would silently lose the reminder forever. Leave the
      // flag null so next tick retries.
      if (sent.sent > 0 || sent.failed === 0) {
        const { error: markErr } = await db
          .from("cohort_events")
          .update({ reminder_24h_sent_at: new Date().toISOString() })
          .eq("event_id", ev.event_id);
        if (markErr) {
          console.error("[cohort-reminder-cron] 24h mark failed", ev.event_id, markErr);
        } else {
          result.events_24h += 1;
        }
      } else {
        console.warn(
          "[cohort-reminder-cron] 24h stamp SKIPPED — fan-out fully failed, will retry next tick",
          { event_id: ev.event_id, sent: sent.sent, failed: sent.failed },
        );
      }
    }

    // ── 1h reminders ──────────────────────────────────────────────────────
    // Same logic, tighter window. Slack means events as far as T+1h10m
    // still trigger here on a 5-min tick.
    const upper1h = new Date(now.getTime() + WINDOW_1H_MS + TICK_SLACK_MS);
    const { data: events1h, error: err1h } = await db
      .from("cohort_events")
      .select("event_id, cohort_id, kind, title, starts_at, meeting_url")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", upper1h.toISOString())
      .is("reminder_1h_sent_at", null);
    if (err1h) throw err1h;

    for (const ev of (events1h ?? []) as EventRow[]) {
      result.scanned += 1;
      const sent = await fanOutReminder(db, ev, "1h");
      result.sent += sent.sent;
      result.failed += sent.failed;
      // Same gate as the 24h pass — see comment above.
      if (sent.sent > 0 || sent.failed === 0) {
        const { error: markErr } = await db
          .from("cohort_events")
          .update({ reminder_1h_sent_at: new Date().toISOString() })
          .eq("event_id", ev.event_id);
        if (markErr) {
          console.error("[cohort-reminder-cron] 1h mark failed", ev.event_id, markErr);
        } else {
          result.events_1h += 1;
        }
      } else {
        console.warn(
          "[cohort-reminder-cron] 1h stamp SKIPPED — fan-out fully failed, will retry next tick",
          { event_id: ev.event_id, sent: sent.sent, failed: sent.failed },
        );
      }
    }

    return respondJson(200, { ok: true, ...result }, corsHeaders);
  } catch (e) {
    console.error("[cohort-reminder-cron] failed", e);
    return respondError(500, (e as Error).message, corsHeaders);
  }
});

// Fan out a single event's reminder to every active member. Returns
// per-event sent + failed counts so the caller can aggregate.
async function fanOutReminder(
  // deno-lint-ignore no-explicit-any
  db: any,
  ev: EventRow,
  window: "24h" | "1h",
): Promise<{ sent: number; failed: number }> {
  // Pull cohort slug for the portal link in the email body.
  const { data: cohort } = await db
    .from("cohorts")
    .select("slug, name")
    .eq("cohort_id", ev.cohort_id)
    .maybeSingle();
  const cohortSlug = (cohort as CohortRow | null)?.slug ?? "current";

  // Active members. We pull email + user_id + the display name from auth
  // metadata via the user list (paginated; tu-consulting's stripe-webhook
  // uses the same pattern). For volume reasons we cap at 500 — anything
  // bigger and we'd page in the future.
  const { data: subs, error: subsErr } = await db
    .from("subscriptions")
    .select("user_id, email")
    .in("status", ["active", "trialing"]);
  if (subsErr || !subs) {
    console.error("[cohort-reminder-cron] active members lookup failed", subsErr);
    return { sent: 0, failed: 1 };
  }

  // Resolve display_name from auth.users by listing the first page and
  // matching on user_id. Same approach as stripe-webhook's syncSubscription.
  const { data: usersPage } = await db.auth.admin.listUsers({ page: 1, perPage: USER_FETCH_CAP });
  if (usersPage?.users?.length === USER_FETCH_CAP) {
    console.error(
      "[cohort-reminder-cron] user fetch hit cap — possible truncation, members past cap will language-fallback",
      { cap: USER_FETCH_CAP },
    );
  }
  const userIndex = new Map<string, MemberRow>();
  for (const u of usersPage?.users ?? []) {
    if (!u.email) continue;
    userIndex.set(u.id, {
      user_id: u.id,
      email: u.email,
      display_name: (u.user_metadata?.full_name as string | undefined) ?? null,
      language: (u.user_metadata?.language as "en" | "ru" | undefined) ?? "en",
    });
  }

  let sent = 0;
  let failed = 0;
  for (const sub of (subs ?? []) as Pick<MemberRow, "user_id" | "email">[]) {
    const authUser = userIndex.get(sub.user_id);
    if (!authUser) {
      console.warn(
        "[cohort-reminder-cron] subscription without matching auth user",
        { user_id: sub.user_id, event_id: ev.event_id },
      );
    }
    const member = authUser ?? {
      user_id: sub.user_id,
      email: sub.email,
      display_name: null,
      language: "en",
    };
    const firstName = member.display_name
      ? member.display_name.split(" ")[0]
      : undefined;
    try {
      await db.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: member.email,
          templateName: "cohort-event-reminder",
          // Per (event, window, recipient) idempotency — replays from
          // cron retries or webhook redeliveries don't double-send.
          idempotencyKey: `cohort-event-${ev.event_id}-${window}-${member.user_id}`,
          templateData: {
            eventTitle: ev.title,
            eventKind: ev.kind,
            startsAt: ev.starts_at,
            meetingUrl: ev.meeting_url ?? undefined,
            cohortSlug,
            siteUrl: SITE,
            firstName,
            window,
            language: member.language ?? "en",
          },
        },
      });
      sent += 1;
    } catch (e) {
      console.warn(
        "[cohort-reminder-cron] member send failed",
        ev.event_id,
        member.user_id,
        e,
      );
      failed += 1;
    }
  }
  return { sent, failed };
}
