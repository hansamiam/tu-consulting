// weekly-nudge-cron
//
// Sundays at 10:00 UTC. For every authed user with active applications
// who hasn't been nudged in the last 6 days and hasn't opted out, this
// function:
//   1. Pulls their tracker state + completed action-plan tasks
//   2. Asks the AI gateway to write a tight weekly check-in (3-4 paras
//      with concrete week-ahead priorities citing actual scholarships
//      from the user's tracker)
//   3. Sends via send-transactional-email with the weekly-nudge template
//   4. Stamps last_nudge_sent_at + writes an audit row to nudge_log
//
// Idempotent: re-runs within the 6-day window skip already-nudged
// users. Per-user errors logged but don't abort the run.

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
  major: string | null;
  field_of_study: string | null;
  target_countries: string[] | null;
  gpa: number | null;
  ielts: number | null;
  last_nudge_sent_at: string | null;
}

interface TrackerJoined {
  scholarship_id: string;
  status: string | null;
  notes: string | null;
  shortlisted: boolean;
  hidden: boolean;
  status_changed_at: string | null;
  scholarship: {
    scholarship_name: string;
    host_country: string | null;
    coverage_type: string | null;
    application_deadline: string | null;
    award_amount_text: string | null;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  researching: "Researching",
  drafting: "Drafting",
  submitted: "Submitted",
  decision: "Awaiting decision",
};

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000);
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
}

/* Build the case-summary the LLM uses to write the nudge. Same shape
   as topuni-chat's live-context block but tighter (one-shot prompt,
   no continuation budget). */
function buildCaseBlock(profile: ProfileRow, tracker: TrackerJoined[], completedTaskCount: number): {
  block: string;
  stats: { tracked: number; urgent: number; pending: number };
} {
  const visible = tracker.filter((t) => !t.hidden && (t.status || t.shortlisted));
  visible.sort((a, b) => {
    const ad = daysUntil(a.scholarship?.application_deadline);
    const bd = daysUntil(b.scholarship?.application_deadline);
    if (ad === null && bd === null) return 0;
    if (ad === null) return 1;
    if (bd === null) return -1;
    return ad - bd;
  });

  const lines: string[] = [];
  lines.push(`PROFILE: ${profile.full_name ?? "Student"}; major: ${profile.major ?? profile.field_of_study ?? "—"}; targets: ${(profile.target_countries ?? []).join(", ") || "—"}; GPA: ${profile.gpa ?? "—"}; IELTS: ${profile.ielts ?? "—"}.`);
  lines.push("");
  lines.push("CURRENT APPLICATIONS (most urgent first):");
  for (const t of visible.slice(0, 12)) {
    const sch = t.scholarship;
    if (!sch) continue;
    const days = daysUntil(sch.application_deadline);
    const stale = daysSince(t.status_changed_at);
    const status = t.status ? STATUS_LABEL[t.status] || t.status : "Shortlisted only";
    const dl = days === null ? (sch.application_deadline ? "rolling" : "varies") : days <= 0 ? "CLOSED" : `${days}d to deadline`;
    const staleNote = stale !== null && stale >= 14 && t.status ? ` · status unchanged for ${stale} days` : "";
    lines.push(`- ${sch.scholarship_name} (${sch.host_country ?? "—"}) — ${status}; ${dl}${staleNote}${t.notes ? `; note: "${t.notes.slice(0, 100)}"` : ""}`);
  }
  const urgent = visible.filter((t) => {
    const d = daysUntil(t.scholarship?.application_deadline);
    return d !== null && d > 0 && d <= 30;
  }).length;
  const pending = visible.filter((t) => !t.status).length;
  if (completedTaskCount > 0) lines.push(`\nCOMPLETED ACTION-PLAN TASKS in past month: ${completedTaskCount}`);

  return { block: lines.join("\n"), stats: { tracked: visible.length, urgent, pending } };
}

const NUDGE_SYSTEM_PROMPT = `You are TopUni AI — an admissions coach writing the student a weekly check-in email.

Tone: senior advisor who knows the student's case, not a generic motivational email. Direct. Specific. Cite their actual saved scholarships by name. Quote their notes back to them when useful.

Output format (markdown, plain — NO ## headings, NO emoji):
1. ONE bold lead line — the week's single most important call. Wrap in **double asterisks**.
2. Two short paragraphs of context for that lead. Cite specific scholarships by name and current status. Mention staleness if a status hasn't moved in 14+ days.
3. A "**Two more priorities:**" header followed by 2 bullet points (- prefix), each one specific scholarship + concrete this-week action.
4. ONE closing sentence on their strongest signal — what they should believe about themselves this week.

Hard rules:
- Total length: 120-200 words. NEVER more.
- Cite exact scholarship names from the data; never invent options not listed.
- Never use "stretch", "long shot", "real shot", "safety school", "reach school", "target school", "playbook".
- Avoid hollow encouragement ("you've got this", "good luck"). Talk in evidence.
- Open with the lead — no preamble, no "Hi {name}" (the email template handles greeting).`;

async function generateNudge(caseBlock: string, lovableApiKey: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: NUDGE_SYSTEM_PROMPT },
        { role: "user", content: `Write the week's check-in for this student:\n\n${caseBlock}` },
      ],
      stream: false,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content as string | undefined;
  if (!content || content.length < 80) throw new Error("AI returned empty/short content");
  return content.trim();
}

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
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE || !LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "Required env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 6-day cooldown so within-week re-runs don't double-send
  const cooldown = new Date(Date.now() - 6 * 86400_000).toISOString();

  const { data: profiles, error: profileErr } = await supa
    .from("student_profiles")
    .select("user_id, full_name, email, major, field_of_study, target_countries, gpa, ielts, last_nudge_sent_at")
    .eq("nudge_opt_out", false)
    .or(`last_nudge_sent_at.is.null,last_nudge_sent_at.lt.${cooldown}`)
    .returns<ProfileRow[]>();

  if (profileErr) {
    return new Response(JSON.stringify({ error: profileErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const profile of profiles ?? []) {
    if (!profile.email) {
      skipped++;
      continue;
    }

    const userStartedAt = Date.now();
    try {
      const { data: tracker } = await supa
        .from("application_tracker")
        .select(`
          scholarship_id, status, notes, shortlisted, hidden, status_changed_at,
          scholarship:scholarship_id (
            scholarship_name, host_country, coverage_type,
            application_deadline, award_amount_text
          )
        `)
        .eq("user_id", profile.user_id)
        .returns<TrackerJoined[]>();

      // Skip: nothing to nudge about
      const visible = (tracker ?? []).filter(
        (t) => !t.hidden && (t.status || t.shortlisted),
      );
      if (visible.length === 0) {
        skipped++;
        await supa.from("nudge_log").insert({
          user_id: profile.user_id,
          email_status: "skipped",
          email_error: "no active applications",
          tracked_count: 0,
        });
        continue;
      }

      // Completed-task count in past month
      const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { count: taskCount } = await supa
        .from("student_tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id)
        .gte("completed_at", monthAgo);

      const { block, stats } = buildCaseBlock(profile, tracker ?? [], taskCount ?? 0);

      const aiBody = await generateNudge(block, LOVABLE_API_KEY);

      // Send via the existing transactional email pipeline
      const firstName = profile.full_name?.split(" ")[0]?.trim();
      const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
        body: {
          to: profile.email,
          template: "weekly-nudge",
          data: {
            name: firstName,
            aiBody,
            trackedCount: stats.tracked,
            urgentDeadlines: stats.urgent,
            statusPending: stats.pending,
            unsubscribeUrl: `${SITE}/account?action=pause-nudges`,
          },
        },
      });
      if (sendErr) throw new Error(`send-transactional-email: ${sendErr.message}`);

      // Stamp last_nudge_sent_at + audit log
      await Promise.all([
        supa
          .from("student_profiles")
          .update({ last_nudge_sent_at: new Date().toISOString() })
          .eq("user_id", profile.user_id),
        supa.from("nudge_log").insert({
          user_id: profile.user_id,
          email_subject: firstName
            ? (stats.urgent >= 1 ? `${firstName}, ${stats.urgent} ${stats.urgent === 1 ? "deadline" : "deadlines"} this month` : `${firstName}'s 3 things this week`)
            : `Your week ahead`,
          ai_body_preview: aiBody.slice(0, 600),
          tracked_count: stats.tracked,
          urgent_deadlines: stats.urgent,
          status_pending: stats.pending,
          email_status: "sent",
          duration_ms: Date.now() - userStartedAt,
        }),
      ]);

      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failed++;
      errors.push(`${profile.user_id}: ${msg}`);
      try {
        await supa.from("nudge_log").insert({
          user_id: profile.user_id,
          email_status: "failed",
          email_error: msg.slice(0, 1000),
          duration_ms: Date.now() - userStartedAt,
        });
      } catch { /* ignore */ }
    }
  }

  return new Response(
    JSON.stringify({
      candidates: profiles?.length ?? 0,
      sent,
      skipped,
      failed,
      first_errors: errors.slice(0, 5),
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
