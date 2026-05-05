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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  nudge_opt_out: boolean;
  created_at: string | null;
}

interface AuthUser {
  id: string;
  email?: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

const hoursBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 3600_000;
const daysBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 86_400_000;

async function alreadySent(supa: ReturnType<typeof createClient>, templateName: string, recipientEmail: string, sinceIso?: string): Promise<boolean> {
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Pull every authed user in one shot (paginated). At founding-cohort
  // scale this is fine; we'll batch later if it ever exceeds 5k.
  const allUsers: AuthUser[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

  // Hydrate profile data (nudge_opt_out + display name) for everyone.
  const userIds = allUsers.map((u) => u.id);
  const { data: profiles } = await supa
    .from("student_profiles")
    .select("user_id, full_name, email, nudge_opt_out, created_at")
    .in("user_id", userIds);
  const profileMap = new Map<string, ProfileRow>(
    (profiles ?? []).map((p) => [p.user_id as string, p as ProfileRow]),
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
                  discoverUrl: `${SITE}/discover`,
                  pipelineUrl: `${SITE}/pipeline`,
                  manageUrl: `${SITE}/account?action=pause-nudges`,
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
                  pipelineUrl: `${SITE}/pipeline`,
                  discoverUrl: `${SITE}/discover`,
                  manageUrl: `${SITE}/account?action=pause-nudges`,
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
                  pipelineUrl: `${SITE}/pipeline`,
                  discoverUrl: `${SITE}/discover`,
                  manageUrl: `${SITE}/account?action=pause-nudges`,
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

  return new Response(
    JSON.stringify({
      candidates: allUsers.length,
      sent,
      skipped,
      failed,
      first_errors: errors.slice(0, 5),
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
