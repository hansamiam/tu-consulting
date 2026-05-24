// notify-cohort-scheduled — manually-invoked broadcast for an
// already-scheduled cohort.
//
// Why this exists: queueCohortWelcomeEmail in stripe-webhook only fires on
// customer.subscription.created, so brand-new members hear about the
// current cohort immediately. EXISTING members who were already subscribed
// before a cohort was scheduled hear nothing — Samuel could schedule next
// Wednesday's workshop and the cohort lands silent.
//
// This closes the loop. When Samuel creates a new cohort (or wants to
// announce one to the standing roster), he invokes this once with the
// cohort_id and we fan out the existing cohort-welcome template to every
// active subscriber.
//
// NO cron schedule — manual only. Sample call:
//   curl -X POST -H "Authorization: Bearer <SERVICE_ROLE>" \
//     https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/notify-cohort-scheduled \
//     -d '{"cohort_id":"<uuid>"}'
//
// Auth: verify_jwt = false in config.toml. Self-gates via
// requireAdminOrService — only the service-role key or an admin user JWT
// gets through. Public callers without either get 401.
//
// Idempotency: per-member key is `cohort-scheduled-{cohort_id}-{user_id}`.
// Re-invoking with the same cohort_id is a no-op for anyone who already
// got the email — safe to retry on transient failures.

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

// Match cohort-reminder-cron's 1000-user fetch cap. If membership grows
// past that, paginate; until then a single page keeps the function fast
// and avoids partial-failure split-brain across pages.
const USER_FETCH_CAP = 1000;

interface CohortRow {
  cohort_id: string;
  name: string;
  slug: string;
  starts_at: string;
}

interface MemberRow {
  user_id: string;
  email: string;
  display_name: string | null;
  language: "en" | "ru";
}

interface RunResult {
  cohort_id: string;
  cohort_name: string;
  sent: number;
  skipped: number;
  failed: number;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  if (req.method !== "POST") {
    return respondError(405, "POST only", corsHeaders);
  }

  const auth = await requireAdminOrService(req);
  if (!auth.ok) {
    return respondError(401, "Unauthorized", corsHeaders);
  }

  // Accept cohort_id from JSON body OR ?cohort_id= query string — same
  // tradeoff most internal admin functions make. JSON wins if both.
  let cohortId: string | null = null;
  try {
    const body = await req.json().catch(() => null) as { cohort_id?: string } | null;
    cohortId = body?.cohort_id?.trim() || null;
  } catch {
    cohortId = null;
  }
  if (!cohortId) {
    const url = new URL(req.url);
    cohortId = url.searchParams.get("cohort_id")?.trim() || null;
  }
  if (!cohortId) {
    return respondError(400, "cohort_id required (JSON body or ?cohort_id=)", corsHeaders);
  }

  const admin = createServiceClient();
  // deno-lint-ignore no-explicit-any
  const db = admin as any;

  try {
    // Load the cohort. Any status is fine — Samuel may want to broadcast
    // an upcoming-but-not-yet-open cohort too (e.g. early reveal). The
    // email's "starting <date>" line is timeless either way.
    const { data: cohort, error: cohortErr } = await db
      .from("cohorts")
      .select("cohort_id, name, slug, starts_at")
      .eq("cohort_id", cohortId)
      .maybeSingle();
    if (cohortErr) {
      console.error("[notify-cohort-scheduled] cohort lookup failed", cohortErr);
      return respondError(500, `cohort lookup failed: ${cohortErr.message}`, corsHeaders);
    }
    if (!cohort) {
      return respondError(404, `cohort ${cohortId} not found`, corsHeaders);
    }
    const cohortRow = cohort as CohortRow;

    // Active members. Mirrors cohort-reminder-cron's pattern: pull subs
    // + paginated auth users + index by user_id for display_name/language.
    const { data: subs, error: subsErr } = await db
      .from("subscriptions")
      .select("user_id, email")
      .in("status", ["active", "trialing"]);
    if (subsErr) {
      console.error("[notify-cohort-scheduled] subs lookup failed", subsErr);
      return respondError(500, `subscriptions lookup failed: ${subsErr.message}`, corsHeaders);
    }

    const { data: usersPage } = await db.auth.admin.listUsers({
      page: 1,
      perPage: USER_FETCH_CAP,
    });
    if (usersPage?.users?.length === USER_FETCH_CAP) {
      console.error(
        "[notify-cohort-scheduled] user fetch hit cap — possible truncation",
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
        language: ((u.user_metadata?.language as string | undefined) === "ru" ? "ru" : "en"),
      });
    }

    const result: RunResult = {
      cohort_id: cohortRow.cohort_id,
      cohort_name: cohortRow.name,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    // Dedup by email — if a user somehow has two active subs (shouldn't,
    // but defense in depth) we only email them once. Idempotency key
    // also dedupes downstream, but this keeps the counts honest.
    const seenEmails = new Set<string>();

    for (const sub of (subs ?? []) as Pick<MemberRow, "user_id" | "email">[]) {
      const authUser = userIndex.get(sub.user_id);
      if (!authUser) {
        console.warn(
          "[notify-cohort-scheduled] subscription without matching auth user",
          { user_id: sub.user_id },
        );
      }
      const member = authUser ?? {
        user_id: sub.user_id,
        email: sub.email,
        display_name: null,
        language: "en" as const,
      };
      if (!member.email) {
        result.skipped += 1;
        continue;
      }
      const emailKey = member.email.toLowerCase();
      if (seenEmails.has(emailKey)) {
        result.skipped += 1;
        continue;
      }
      seenEmails.add(emailKey);

      const firstName = member.display_name
        ? member.display_name.split(" ")[0]
        : undefined;
      try {
        await db.functions.invoke("send-transactional-email", {
          body: {
            recipientEmail: member.email,
            templateName: "cohort-welcome",
            // Per (cohort, user) idempotency. Re-invoking this function
            // with the same cohort_id will short-circuit at the email
            // queue and not re-send to anyone already broadcasted-to.
            idempotencyKey: `cohort-scheduled-${cohortRow.cohort_id}-${member.user_id}`,
            templateData: {
              cohortName: cohortRow.name,
              startsAt: cohortRow.starts_at,
              cohortSlug: cohortRow.slug,
              siteUrl: SITE,
              firstName,
              language: member.language,
            },
          },
        });
        result.sent += 1;
      } catch (e) {
        console.warn(
          "[notify-cohort-scheduled] member send failed",
          cohortRow.cohort_id,
          member.user_id,
          e,
        );
        result.failed += 1;
      }
    }

    return respondJson(200, { ok: true, ...result }, corsHeaders);
  } catch (e) {
    console.error("[notify-cohort-scheduled] failed", e);
    return respondError(500, (e as Error).message, corsHeaders);
  }
});
