// lifecycle-emails-cron
//
// Single daily cron that fires the activation + win-back emails:
//   · Day 1 since signup     → activation-day-1   (wakes new users up)
//   · Day 7 since signup     → activation-day-7   (week-1 reflection)
//   · 30+ days since last    → inactive-winback   (one-shot win-back;
//     sign-in                  60-day cooldown via email_send_log)
//
// Idempotency: each email's templateName + recipient_email is checked
// against email_send_log. If a row exists with status='sent' for the
// same (template, recipient), we skip. send-transactional-email also
// applies its own idempotencyKey at the queue level, so this is a
// belt-and-braces dedup.
//
// Honors student_profiles.nudge_opt_out — the same single mute control
// gates all email surfaces.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  nudge_opt_out: boolean;
  created_at: string | null;
  language: string | null;
}

interface AuthUser {
  id: string;
  email?: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const hoursBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 3600_000;
const daysBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 86_400_000;

async function alreadySent(supa: SupabaseClient, templateName: string, recipientEmail: string, sinceIso?: string): Promise<boolean> {
  let q = supa
    .from("email_send_log")
    .select("id", { head: true, count: "exact" })
    .eq("template_name", templateName)
    .eq("recipient_email", recipientEmail)
    .eq("status", "sent")
    .limit(1);
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { count, error } = await q;
  if (error) {
    console.warn("[lifecycle-emails-cron] email_send_log lookup failed", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") {
    return respondError(405, "POST only", corsHeaders);
  }

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return respondError(401, auth.reason ?? "unauthorized", corsHeaders);

  const startedAt = Date.now();
  const supa = createServiceClient();

  // Pull every authed user in one shot (paginated). At founding-cohort
  // scale this is fine; we'll batch later if it ever exceeds 5k.
  const allUsers: AuthUser[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return respondError(500, error.message, corsHeaders);
    }
    for (const u of data.users) {
      allUsers.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: (u as unknown as { last_sign_in_at?: string | null }).last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 200) break;
    page += 1;
    if (page > 50) break; // hard cap for safety
  }

  // Hydrate profile data (nudge_opt_out + display name + language) for
  // everyone. The `language` column was added in migration
  // 20260524160000_student_profiles_language.sql — until that migration
  // is applied, the select will 400 here. Defaults to 'en' if missing.
  // The cast around the select is to bypass stale generated DB types
  // (regenerate via `npm run gen:types` after the migration applies).
  const userIds = allUsers.map((u) => u.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supa as unknown as { from: (t: string) => any })
    .from("student_profiles")
    .select("user_id, full_name, email, nudge_opt_out, created_at, language")
    .in("user_id", userIds);
  const profileMap = new Map<string, ProfileRow>(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p]),
  );

  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];
  const now = new Date();

  for (const u of allUsers) {
    const email = u.email || profileMap.get(u.id)?.email;
    if (!email) { skipped++; continue; }
    const profile = profileMap.get(u.id);
    if (profile?.nudge_opt_out) { skipped++; continue; }

    const firstName = profile?.full_name?.split(" ")[0]?.trim() || undefined;
    // Read language from student_profiles (added 2026-05-24). Falls back
    // to 'en' for legacy rows whose default never got overwritten.
    const userLang: "en" | "ru" = profile?.language === "ru" ? "ru" : "en";
    const localizedDiscover = `${SITE}/discover`;
    const localizedPipeline = `${SITE}/pipeline`;
    const localizedManage = `${SITE}/account?action=pause-nudges`;

    const createdAt = u.created_at ? new Date(u.created_at) : null;
    const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;

    // ─── Day 1 activation ────────────────────────────────────────────
    if (createdAt) {
      const ageHours = hoursBetween(createdAt, now);
      // 18-30h since signup window. The cron runs daily so any user is
      // guaranteed to fall inside this window exactly once.
      if (ageHours >= 18 && ageHours < 30) {
        if (!(await alreadySent(supa, "activation-day-1", email))) {
          // Brief existence is a soft personalization signal — does the
          // user have a generated brief or not? Used to vary the lead.
          const { data: brief } = await supa
            .from("pathway_reports")
            .select("user_id")
            .eq("user_id", u.id)
            .maybeSingle();

          const userStartedAt = Date.now();
          try {
            const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
              body: {
                recipientEmail: email,
                templateName: "activation-day-1",
                idempotencyKey: `activation-day-1-${u.id}`,
                templateData: {
                  name: firstName,
                  briefReady: !!brief,
                  discoverUrl: localizedDiscover,
                  pipelineUrl: localizedPipeline,
                  manageUrl: localizedManage,
                  language: userLang,
                },
              },
            });
            if (sendErr) throw new Error(sendErr.message);
            sent++;
          } catch (e) {
            failed++;
            errors.push(`day-1 ${u.id}: ${(e as Error).message} (${Date.now() - userStartedAt}ms)`);
          }
          continue;
        }
      }

      // ─── Day 7 activation ─────────────────────────────────────────
      const ageDays = daysBetween(createdAt, now);
      if (ageDays >= 7 && ageDays < 8) {
        if (!(await alreadySent(supa, "activation-day-7", email))) {
          // Personalize on tracker state — count active rows + count of
          // those with deadlines in the next 30 days.
          const { data: trackerRows } = await supa
            .from("application_tracker")
            .select(`scholarship_id, scholarship:scholarship_id(application_deadline)`)
            .eq("user_id", u.id);
          const trackedCount = trackerRows?.length ?? 0;
          const upcomingDeadlineCount = (trackerRows ?? [])
            .map((r) => (r as unknown as { scholarship?: { application_deadline?: string | null } }).scholarship?.application_deadline)
            .filter((d): d is string => !!d)
            .filter((d) => {
              const days = (new Date(d).getTime() - Date.now()) / 86_400_000;
              return days > 0 && days <= 30;
            }).length;

          try {
            const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
              body: {
                recipientEmail: email,
                templateName: "activation-day-7",
                idempotencyKey: `activation-day-7-${u.id}`,
                templateData: {
                  name: firstName,
                  trackedCount,
                  upcomingDeadlineCount,
                  pipelineUrl: localizedPipeline,
                  discoverUrl: localizedDiscover,
                  manageUrl: localizedManage,
                  language: userLang,
                },
              },
            });
            if (sendErr) throw new Error(sendErr.message);
            sent++;
          } catch (e) {
            failed++;
            errors.push(`day-7 ${u.id}: ${(e as Error).message}`);
          }
          continue;
        }
      }
    }

    // ─── Inactive win-back ────────────────────────────────────────────
    if (lastSignIn) {
      const daysAway = daysBetween(lastSignIn, now);
      if (daysAway >= 30) {
        // 60-day cooldown — never win-back the same user twice in 60 days
        const since = new Date(now.getTime() - 60 * 86_400_000).toISOString();
        if (!(await alreadySent(supa, "inactive-winback", email, since))) {
          // Surface "new scholarships since you've been gone" — counted
          // off the user's last_sign_in_at.
          const { count: newCount } = await supa
            .from("scholarships")
            .select("scholarship_id", { count: "exact", head: true })
            .eq("verification_status", "verified")
            .gte("created_at", lastSignIn.toISOString());
          // Their tracker count for personalization.
          const { count: trackedCount } = await supa
            .from("application_tracker")
            .select("scholarship_id", { count: "exact", head: true })
            .eq("user_id", u.id);

          try {
            const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
              body: {
                recipientEmail: email,
                templateName: "inactive-winback",
                idempotencyKey: `inactive-winback-${u.id}-${new Date().toISOString().slice(0, 7)}`,
                templateData: {
                  name: firstName,
                  daysAway: Math.floor(daysAway),
                  newScholarshipsSinceVisit: newCount ?? 0,
                  trackedCount: trackedCount ?? 0,
                  pipelineUrl: localizedPipeline,
                  discoverUrl: localizedDiscover,
                  manageUrl: localizedManage,
                  language: userLang,
                },
              },
            });
            if (sendErr) throw new Error(sendErr.message);
            sent++;
          } catch (e) {
            failed++;
            errors.push(`winback ${u.id}: ${(e as Error).message}`);
          }
          continue;
        }
      }
    }

    skipped++;
  }

  /* ─── brief_leads: anon wizard email recovery ────────────────────────
     Two passes over the brief_leads table:
       1. Mark converted_at on any open lead whose email now has an
          auth.users record — they signed up after the brief, so we
          stop nudging them. The cron is the right place for this
          stamp (rather than the auth signup webhook) because we
          already paginate every auth user here, and the conversion
          stamp doesn't need to be real-time.
       2. Send brief-lead-nudge to open leads created 24-48h ago that
          haven't been nudged yet. Once-only: nudge_sent_at gates the
          send.
     The Suppression list (email_suppressions) is already honored by
     send-transactional-email, so we don't double-check here. */
  let leadsConverted = 0;
  let leadsNudged = 0;
  try {
    // Pass 1 — convert
    const emailToUserId = new Map<string, string>();
    for (const u of allUsers) {
      if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id);
    }
    const { data: openLeads } = await (supa as unknown as { from: (t: string) => any })
      .from("brief_leads")
      .select("id, email, full_name, created_at, language, nudge_sent_at")
      .is("converted_at", null);
    const leads = (openLeads ?? []) as Array<{
      id: string;
      email: string;
      full_name: string | null;
      created_at: string;
      language: string;
      nudge_sent_at: string | null;
    }>;
    const nowIso = new Date().toISOString();
    const toConvert: string[] = [];
    for (const l of leads) {
      if (emailToUserId.has(l.email.toLowerCase())) toConvert.push(l.id);
    }
    if (toConvert.length > 0) {
      const { error: convErr } = await (supa as unknown as { from: (t: string) => any })
        .from("brief_leads")
        .update({ converted_at: nowIso })
        .in("id", toConvert);
      if (convErr) {
        errors.push(`brief_leads convert: ${convErr.message}`);
      } else {
        leadsConverted = toConvert.length;
      }
    }

    // Pass 2 — nudge once. 24-48h window relative to lead created_at.
    const unsubscribeBase = `${SITE}/unsubscribe`;
    for (const l of leads) {
      if (l.nudge_sent_at) continue;
      if (emailToUserId.has(l.email.toLowerCase())) continue;
      const ageHours = hoursBetween(new Date(l.created_at), now);
      if (ageHours < 24 || ageHours >= 48) continue;

      if (await alreadySent(supa, "brief-lead-nudge", l.email)) {
        await (supa as unknown as { from: (t: string) => any })
          .from("brief_leads")
          .update({ nudge_sent_at: nowIso })
          .eq("id", l.id);
        continue;
      }

      const firstName = l.full_name?.split(" ")[0]?.trim() || undefined;
      const lang: "en" | "ru" = l.language === "ru" ? "ru" : "en";
      try {
        const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
          body: {
            recipientEmail: l.email,
            templateName: "brief-lead-nudge",
            idempotencyKey: `brief-lead-nudge-${l.id}`,
            templateData: {
              name: firstName,
              recoverUrl: lang === "ru" ? `${SITE}/topuni-ai/ru` : `${SITE}/topuni-ai`,
              unsubscribeUrl: `${unsubscribeBase}?email=${encodeURIComponent(l.email)}`,
              language: lang,
            },
          },
        });
        if (sendErr) throw new Error(sendErr.message);
        await (supa as unknown as { from: (t: string) => any })
          .from("brief_leads")
          .update({ nudge_sent_at: nowIso })
          .eq("id", l.id);
        leadsNudged++;
      } catch (e) {
        failed++;
        errors.push(`brief-lead-nudge ${l.id}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    errors.push(`brief_leads block: ${(e as Error).message}`);
  }

  return respondJson(200, {
    candidates: allUsers.length,
    sent,
    skipped,
    failed,
    leads_converted: leadsConverted,
    leads_nudged: leadsNudged,
    first_errors: errors.slice(0, 5),
    duration_ms: Date.now() - startedAt,
  }, corsHeaders);
});
