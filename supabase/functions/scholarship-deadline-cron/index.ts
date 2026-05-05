// scholarship-deadline-cron
//
// Daily cron job that finds applications a student is actively tracking
// (status in researching/drafting/submitted) whose deadline is coming up
// in the next 30 days, and sends them a deadline-reminder email. Runs
// at 09:00 UTC every day; idempotent within a 14-day rolling window
// (a row's reminder_sent_at gates re-send).
//
// Cadence per row:
//   - First reminder when deadline is 30 days out (or sooner if first contact)
//   - Subsequent reminders at 14 / 7 / 3 / 1 days remaining
//   - reminder_sent_at is updated each time so we don't double-send the
//     same urgency window
//
// Triggers via supabase pg_cron — see migration
// 20260502033000_schedule_scholarship_deadline_cron.sql.
//
// Manual run for debug:
//   curl -X POST <fn-url>/scholarship-deadline-cron \
//     -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

interface DueRow {
  user_id: string;
  scholarship_id: string;
  status: string | null;
  reminder_sent_at: string | null;
  scholarship: {
    scholarship_name: string;
    application_deadline: string | null;
    award_amount_text: string | null;
    coverage_type: string | null;
    estimated_total_value_usd: number | null;
    official_url: string | null;
  } | null;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  researching: "Researching",
  drafting: "Drafting application",
  submitted: "Submitted — awaiting decision",
};

/* The cadence buckets (days remaining → human label). Used so the same
   row gets exactly one email per bucket: when deadline ticks from "12
   days remaining" down to "10", we don't re-send because they're both
   in the 14-day window — but when it crosses into 7 we send again. */
const BUCKETS = [30, 14, 7, 3, 1] as const;
const bucketFor = (days: number): number | null => {
  if (days <= 0) return 0;
  for (const b of BUCKETS) if (days <= b) return b;
  return null;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const formatAmount = (
  amount_text: string | null,
  coverage: string | null,
  usd: number | null,
): string | undefined => {
  if (amount_text && amount_text.length > 5) return amount_text.slice(0, 120);
  if (usd && usd > 0) return `~$${Math.round(usd / 1000)}K total value`;
  if (coverage === "full_ride") return "Full coverage";
  if (coverage === "tuition_only") return "Tuition only";
  if (coverage === "stipend") return "Stipend";
  return undefined;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  // Look 32 days out (covers the 30-day bucket + 2-day grace window)
  const cutoff = new Date(now.getTime() + 32 * 86400_000).toISOString().slice(0, 10);

  // We can't (cleanly) join scholarships and student_profiles in the
  // PostgREST view, so do a single-shot SQL via RPC if it exists, or
  // fan out three queries.
  const { data: tracker, error: trackErr } = await supa
    .from("application_tracker")
    .select(`
      user_id, scholarship_id, status, reminder_sent_at,
      scholarship:scholarship_id (
        scholarship_name, application_deadline, award_amount_text,
        coverage_type, estimated_total_value_usd, official_url
      )
    `)
    .in("status", ["researching", "drafting", "submitted"])
    .gte("scholarship.application_deadline", today)
    .lte("scholarship.application_deadline", cutoff)
    .returns<Omit<DueRow, "profile">[]>();

  if (trackErr) {
    return new Response(JSON.stringify({ error: trackErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const candidates = (tracker ?? []).filter((r) => r.scholarship?.application_deadline);
  if (candidates.length === 0) {
    return new Response(
      JSON.stringify({ checked: 0, sent: 0, duration_ms: Date.now() - startedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Hydrate emails / names from student_profiles (one query, all users).
  // Filter out opted-out users at the source — same pause control that
  // gates the weekly-nudge-cron, so users who muted nudges don't keep
  // getting deadline emails. Pre-migration profiles without nudge_opt_out
  // default to false (opted-in) which matches the column default.
  const userIds = Array.from(new Set(candidates.map((c) => c.user_id)));
  const { data: profiles } = await supa
    .from("student_profiles")
    .select("user_id, full_name, email, nudge_opt_out")
    .in("user_id", userIds);
  const profileMap = new Map<string, { full_name: string | null; email: string | null; nudge_opt_out: boolean }>(
    (profiles ?? []).map((p) => [p.user_id, p as any]),
  );

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Anti-spam: at most ONE email per user per cron run. With buckets at
  // 30/14/7/3/1 a user with 4 scholarships in the same window would get
  // 4 emails today; we'd rather send the most-urgent one and let
  // tomorrow's run handle the next. Sort by days-remaining ascending so
  // the user gets the closest deadline first.
  candidates.sort((a, b) => {
    const da = a.scholarship?.application_deadline ? new Date(a.scholarship.application_deadline).getTime() : Infinity;
    const db = b.scholarship?.application_deadline ? new Date(b.scholarship.application_deadline).getTime() : Infinity;
    return da - db;
  });
  const sentToUser = new Set<string>();

  for (const row of candidates) {
    const profile = profileMap.get(row.user_id);
    if (!profile?.email) {
      skipped++;
      continue;
    }
    if (profile.nudge_opt_out) {
      // User paused nudges → respect it for deadline emails too.
      skipped++;
      continue;
    }
    if (sentToUser.has(row.user_id)) {
      // Already emailed this user about another deadline today.
      skipped++;
      continue;
    }
    const sch = row.scholarship!;
    const dl = new Date(sch.application_deadline!);
    const daysRemaining = Math.ceil((dl.getTime() - now.getTime()) / 86400_000);
    const bucket = bucketFor(daysRemaining);
    if (bucket === null) {
      skipped++;
      continue;
    }
    // Has the user already gotten the reminder for THIS bucket? We use
    // reminder_sent_at: if it exists and the days-remaining at time of
    // last send was the same bucket, skip.
    if (row.reminder_sent_at) {
      const lastSent = new Date(row.reminder_sent_at);
      const daysSinceSent = Math.floor((now.getTime() - lastSent.getTime()) / 86400_000);
      // Days remaining at time of last send ≈ daysRemaining + daysSinceSent
      const lastBucket = bucketFor(daysRemaining + daysSinceSent);
      if (lastBucket === bucket) {
        skipped++;
        continue;
      }
    }

    try {
      await supa.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: profile.email,
          templateName: "scholarship-deadline",
          idempotencyKey: `deadline-${row.user_id}-${row.scholarship_id}-${bucket}`,
          templateData: {
            name: profile.full_name?.split(" ")[0] || undefined,
            scholarshipName: sch.scholarship_name,
            deadlineDate: formatDate(sch.application_deadline!),
            daysRemaining,
            status: row.status ? STATUS_LABELS[row.status] || row.status : undefined,
            amount: formatAmount(sch.award_amount_text, sch.coverage_type, sch.estimated_total_value_usd),
            scholarshipUrl: sch.official_url || undefined,
            trackerUrl: `${SITE}/discover`,
          },
        },
      });

      // Mark sent so the next bucket doesn't trigger today
      await supa
        .from("application_tracker")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("user_id", row.user_id)
        .eq("scholarship_id", row.scholarship_id);

      sentToUser.add(row.user_id);
      sent++;
    } catch (e) {
      errors.push(`${row.user_id}/${row.scholarship_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({
      checked: candidates.length,
      sent,
      skipped,
      errors_count: errors.length,
      first_errors: errors.slice(0, 5),
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
