// topuni-chat
//
// Streaming chat endpoint for the AI Counselor. Now context-aware: if
// the caller is authenticated, we pull live data from the user's
// state — application_tracker entries (with scholarship deadlines &
// status), action-plan task completion, and the cached pathway brief —
// and inject it into the system prompt as STUDENT'S CURRENT CASE.
//
// The counselor stops being a generic chatbot and becomes "an advisor
// who knows your case". Asks like "what should I focus on this week"
// or "how am I doing on Chevening" now get specific answers tied to
// the student's actual saved scholarships, deadlines, and tasks.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABELS: Record<string, string> = {
  researching: "Researching",
  drafting: "Drafting application",
  submitted: "Submitted — awaiting decision",
  decision: "Awaiting decision",
  rejected: "Rejected",
  accepted: "Accepted",
};

/* Tees an SSE stream: passes every chunk through to the client AND
   accumulates the assistant text content as it arrives so we can
   persist the final message to the DB after [DONE]. */
function teeAndCapture(
  upstream: ReadableStream<Uint8Array>,
  onComplete: (assistantContent: string) => Promise<void> | void,
): ReadableStream<Uint8Array> {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let textBuffer = "";
  let assistantContent = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Pass-through to the client immediately
          controller.enqueue(value);
          // Accumulate for our own parse
          textBuffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, nl);
            textBuffer = textBuffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const c = parsed?.choices?.[0]?.delta?.content as string | undefined;
              if (c) assistantContent += c;
            } catch { /* partial chunk; ignore */ }
          }
        }
      } catch (e) {
        console.error("[topuni-chat] tee error", e);
      } finally {
        try { await onComplete(assistantContent); } catch (e) { console.error("[topuni-chat] persist hook", e); }
        controller.close();
      }
      // Suppress unused-warning for encoder (kept for future SSE injection)
      void encoder;
    },
  });
}

interface TrackerEntry {
  scholarship_id: string;
  status: string | null;
  notes: string | null;
  shortlisted: boolean;
  hidden: boolean;
  scholarship: {
    scholarship_name: string;
    host_country: string | null;
    coverage_type: string | null;
    award_amount_text: string | null;
    application_deadline: string | null;
    official_url: string | null;
  } | null;
}

async function buildLiveCaseContext(
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
  authHeader: string,
): Promise<{ context: string; userId: string | null }> {
  // Resolve user_id from JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u } = await userClient.auth.getUser();
  const userId = u.user?.id ?? null;
  if (!userId) return { context: "", userId: null };

  // Use service-role to bypass RLS pain on the join (RLS would still
  // restrict; we filter explicitly by user_id below).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Tracker entries — only rows where the user has done SOMETHING
  //    (status set, notes non-empty, shortlisted, or hidden=true). We
  //    drop hidden ones from the prompt — student doesn't want them
  //    surfaced — but keep their count for context.
  const { data: tracker } = await admin
    .from("application_tracker")
    .select(`
      scholarship_id, status, notes, shortlisted, hidden,
      scholarship:scholarship_id (
        scholarship_name, host_country, coverage_type, award_amount_text,
        application_deadline, official_url
      )
    `)
    .eq("user_id", userId)
    .returns<TrackerEntry[]>();

  const visible = (tracker ?? []).filter(
    (t) => !t.hidden && (t.status || (t.notes && t.notes.trim()) || t.shortlisted),
  );

  // Sort: status set first (active applications), then by deadline urgency
  const now = Date.now();
  const daysFor = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - now) / 86400_000);
  };
  visible.sort((a, b) => {
    const aActive = !!a.status;
    const bActive = !!b.status;
    if (aActive !== bActive) return aActive ? -1 : 1;
    const ad = daysFor(a.scholarship?.application_deadline);
    const bd = daysFor(b.scholarship?.application_deadline);
    if (ad === null && bd === null) return 0;
    if (ad === null) return 1;
    if (bd === null) return -1;
    return ad - bd;
  });

  // 2. Completed action-plan tasks — count + sample
  const { data: tasks } = await admin
    .from("student_tasks")
    .select("task_text")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(8);

  // 3. Cached pathway report — preview only (the client also passes
  //    reportSummary; this is the server-of-truth fallback)
  const { data: pathway } = await admin
    .from("pathway_reports")
    .select("content, generated_at, language")
    .eq("user_id", userId)
    .maybeSingle();

  // 4. Cached profile (canonical, in case the client lost it)
  const { data: profile } = await admin
    .from("student_profiles")
    .select(
      "full_name, nationality, grade_level, gpa, ielts, sat, target_countries, " +
      "major, field_of_study, budget, scholarship_needed, timeline",
    )
    .eq("user_id", userId)
    .maybeSingle();

  // 5. Uploaded documents — transcripts, drafts, references — that the
  //    student has marked use_in_counselor=true and that finished
  //    parsing successfully. The extracted_text is what the LLM reads.
  const { data: docs } = await admin
    .from("student_documents")
    .select("kind, title, filename, extracted_text, uploaded_at")
    .eq("user_id", userId)
    .eq("use_in_counselor", true)
    .eq("parse_status", "ready")
    .not("extracted_text", "is", null)
    .order("uploaded_at", { ascending: false })
    .limit(6);

  // ─── Format ────────────────────────────────────────────────────
  const lines: string[] = [];

  if (profile) {
    lines.push("STUDENT PROFILE (canonical, from their account):");
    lines.push(`- Name: ${profile.full_name ?? "—"}`);
    lines.push(`- Grade level: ${profile.grade_level ?? "—"}`);
    lines.push(`- GPA: ${profile.gpa ?? "—"}, IELTS: ${profile.ielts ?? "—"}, SAT: ${profile.sat ?? "—"}`);
    lines.push(`- Major / field: ${profile.major ?? profile.field_of_study ?? "—"}`);
    lines.push(`- Target countries: ${(profile.target_countries ?? []).join(", ") || "—"}`);
    lines.push(`- Budget: ${profile.budget ?? "—"}; Needs scholarship: ${profile.scholarship_needed ? "yes" : "no/not specified"}`);
    lines.push(`- Timeline: ${profile.timeline ?? "—"}`);
    if (profile.nationality) lines.push(`- Nationality: ${profile.nationality}`);
    lines.push("");
  }

  /* ─── Per-tracked-scholarship checklist progress ───────────────────
     For the most-urgent visible tracked scholarships, pull the cached
     application checklist + the user's completed_checklist_ids from
     the tracker row. Lets the counselor answer "what's left on
     Chevening?" / "what should I focus on this week?" with grounded
     specifics instead of generic advice. */
  type ChecklistItemLite = { id: string; category: string; title: string; critical?: boolean };
  const topVisible = visible.slice(0, 6);
  const topIds = topVisible.map(v => v.scholarship_id).filter(Boolean) as string[];
  let checklistByScholarship = new Map<string, ChecklistItemLite[]>();
  let completedByScholarship = new Map<string, Set<string>>();
  if (topIds.length > 0) {
    const [{ data: cls }, { data: progress }] = await Promise.all([
      admin
        .from("scholarship_checklists")
        .select("scholarship_id, items")
        .in("scholarship_id", topIds),
      admin
        .from("application_tracker")
        .select("scholarship_id, completed_checklist_ids")
        .eq("user_id", userId)
        .in("scholarship_id", topIds),
    ]);
    if (Array.isArray(cls)) {
      for (const row of cls) {
        const items = (row.items as ChecklistItemLite[]) || [];
        checklistByScholarship.set(row.scholarship_id, items);
      }
    }
    if (Array.isArray(progress)) {
      for (const row of progress) {
        completedByScholarship.set(
          row.scholarship_id,
          new Set((row.completed_checklist_ids as string[]) ?? []),
        );
      }
    }
  }

  if (visible.length > 0) {
    lines.push(`STUDENT'S CURRENT APPLICATIONS (${visible.length} tracked, most urgent first):`);
    for (const t of visible.slice(0, 12)) {
      const sch = t.scholarship;
      if (!sch) continue;
      const days = daysFor(sch.application_deadline);
      const dlText =
        days === null
          ? sch.application_deadline ? `deadline ${sch.application_deadline}` : "deadline varies/rolling"
          : days <= 0
            ? `DEADLINE PASSED (${sch.application_deadline})`
            : days <= 7
              ? `DEADLINE IN ${days} DAYS — URGENT`
              : days <= 30
                ? `deadline in ${days} days`
                : `deadline in ${Math.round(days / 30)} months (${sch.application_deadline})`;
      const statusText = t.status ? STATUS_LABELS[t.status] || t.status : t.shortlisted ? "Shortlisted (no status set)" : "—";
      const noteText = t.notes && t.notes.trim() ? `; note: ${t.notes.slice(0, 200)}` : "";
      // Append checklist progress signal if we have it.
      const items = checklistByScholarship.get(t.scholarship_id);
      const completed = completedByScholarship.get(t.scholarship_id) ?? new Set();
      let checklistSummary = "";
      if (items && items.length > 0) {
        const total = items.length;
        const done = items.filter(it => completed.has(it.id)).length;
        const blocking = items.filter(it => it.critical && !completed.has(it.id));
        const blockingPreview = blocking.slice(0, 3).map(it => it.title).join("; ");
        checklistSummary = `; checklist ${done}/${total}` + (
          blocking.length > 0
            ? ` — ${blocking.length} blocking item(s) left: ${blockingPreview}${blocking.length > 3 ? "…" : ""}`
            : ""
        );
      }
      lines.push(
        `- ${sch.scholarship_name} (${sch.host_country ?? "—"}, ${sch.coverage_type ?? "—"}) — status: ${statusText}; ${dlText}${noteText}${checklistSummary}`,
      );
    }
    if (visible.length > 12) lines.push(`  …and ${visible.length - 12} more saved.`);
    lines.push("");
  }

  if (tasks && tasks.length > 0) {
    lines.push(`COMPLETED ACTION-PLAN TASKS (${tasks.length} most recent):`);
    for (const tk of tasks) {
      const txt = (tk.task_text ?? "").slice(0, 140);
      if (txt) lines.push(`- ${txt}`);
    }
    lines.push("");
  }

  if (pathway?.content) {
    lines.push(
      `STUDENT'S STRATEGY BRIEF (cached, ${pathway.language || "en"}, last generated ${pathway.generated_at}):`,
    );
    lines.push(pathway.content.slice(0, 6000));
    lines.push("");
  }

  // Uploaded documents — capped per-doc + total to keep prompt size sane
  if (docs && docs.length > 0) {
    lines.push(`STUDENT'S UPLOADED DOCUMENTS (${docs.length} active):`);
    let totalDocChars = 0;
    const PER_DOC_CAP = 4500;
    const TOTAL_CAP = 18_000;
    for (const d of docs) {
      const text = (d.extracted_text || "").slice(0, PER_DOC_CAP);
      if (totalDocChars + text.length > TOTAL_CAP) break;
      const label = d.title || d.filename;
      lines.push(`--- DOCUMENT: ${label} (${d.kind}) ---`);
      lines.push(text);
      lines.push(`--- END DOCUMENT ---`);
      totalDocChars += text.length;
    }
    lines.push("");
  }

  return { context: lines.join("\n"), userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language, profile, reportSummary, sessionId } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // AI gateway env validated lazily in chatCompletions — see _shared/ai-gateway.ts

    /* Live-case context — only fires for authed users. Anon callers
       continue to get the static profile + reportSummary the client
       passes (offline-first behaviour). */
    let liveContext = "";
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && SUPABASE_URL && ANON_KEY && SERVICE_ROLE) {
      try {
        const r = await buildLiveCaseContext(SUPABASE_URL, ANON_KEY, SERVICE_ROLE, authHeader);
        liveContext = r.context;
        userId = r.userId;
      } catch (e) {
        console.warn("[topuni-chat] live context fetch failed", e);
      }
    }

    /* Fallback: profile + reportSummary the client passes (anon path). */
    const hasProfile = profile && profile.fullName && profile.fullName !== "Student";
    const fallbackProfileBlock = !liveContext && hasProfile ? `
STUDENT PROFILE (use this — do not ask the student to repeat it):
- Name: ${profile.fullName}
- Grade level: ${profile.gradeLevel || "not provided"}
- GPA: ${profile.gpa || "not provided"}
- IELTS: ${profile.ielts || "not provided"}
- SAT: ${profile.sat || "not provided"}
- Major / field of study: ${profile.major || "not provided"}
- Target countries: ${(profile.targetCountries || []).join(", ") || "not provided"}
- Budget: ${profile.budget || "not provided"}
- Scholarship needed: ${profile.scholarshipNeeded || "not provided"}
- Timeline: ${profile.timeline || "not provided"}
${profile.nationality ? `- Nationality: ${profile.nationality}` : ""}
` : "";

    const fallbackReportBlock = (!liveContext && typeof reportSummary === "string" && reportSummary.length > 50)
      ? `\nSTUDENT'S CURRENT STRATEGY BRIEF (excerpt):\n${reportSummary.slice(0, 4000)}\n`
      : "";

    const contextHeader = liveContext ? `
=== STUDENT'S CURRENT CASE (live from their account) ===
${liveContext}
=== END CASE ===
` : `${fallbackProfileBlock}${fallbackReportBlock}`;

    const systemPrompt = `You are TopUni AI — a thoughtful university admissions counselor for ambitious students applying internationally from anywhere in the world.

You work for TopUni Consulting, a firm led by founders who went through Yale, Cambridge (Schwarzman Scholars), and Harvard themselves.
${contextHeader}
Your expertise:
- University selection strategy worldwide
- IELTS, TOEFL, SAT, ACT, GRE, GMAT preparation
- Scholarship identification and application strategy
- Personal statement and essay strategy
- Visa, immigration, and post-study work pathways
- Budget planning and funding stack design
- Career outcomes and program ROI

How to use the case data above:
${liveContext ? `- The student is logged in. You have their actual saved scholarships, real-time deadlines, status (researching/drafting/submitted), completed action-plan tasks, AND any documents they've uploaded (transcripts, essay drafts, references, CVs, test score reports).
- When they ask "what should I focus on this week" — read the URGENT (≤7 days) and ≤30 day rows, look at status (researching means no draft yet; drafting means they need feedback; submitted means they wait), and prioritise concretely.
- When they ask about a specific scholarship — find it in the list, cite its actual deadline and status.
- If they're asking about a scholarship NOT in their tracker, treat it as exploratory ("you haven't saved this one yet — want to add it?").
- When they reference a transcript, essay, or document, USE the actual text in the UPLOADED DOCUMENTS block. Cite specific courses, GPAs, paragraphs, recommender names, scores. Quote the document back when useful.
- If they upload an essay draft, give specific paragraph-level feedback citing actual sentences. Don't refer them to the /essay page; do the work in chat.
- Reference completed tasks when celebrating progress; reference uncompleted parts of the brief when nudging.
- Cite the brief verbatim when it has relevant guidance.` : `- The student may be on the Strategy tab without an account. Use the static profile / brief above when present.
- Encourage them to save scholarships, complete the action plan, AND upload their transcript / essay drafts so you can give sharper, case-aware advice next time.`}

Guidelines:
- Sound like a sharp, senior advisor — direct, specific, never generic.
- Cite their actual GPA, scores, target countries, and saved scholarships. Do not ask them to repeat what's already above.
- Avoid the words "stretch," "long shot," "real shot," "safety school," "reach school," "target school," "playbook." Talk in terms of "strong fits," "aligned options," and "worth keeping on the radar."
- Be honest. Don't sugarcoat weaknesses, but lead with what to do about them.
- IMPORTANT: The user's interface language is "${language || "en"}". If "ru", respond in Russian by default. Otherwise English. Match the student's language if they write in another.
- Keep responses tight — 2-4 paragraphs unless they explicitly ask for depth. Use markdown lists when listing concrete actions.
- If you don't know something specific (current deadlines, fee changes), say so and tell them how to verify.`;

    const response = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* If we have a userId AND a sessionId, persist this turn's user
       message and then tee the streaming response so we can capture
       the assistant's full reply and write that too. Anon callers and
       no-session calls bypass this — the existing localStorage-only
       behaviour stays. */
    if (userId && sessionId && SUPABASE_URL && SERVICE_ROLE && messages?.length) {
      const lastUser = messages[messages.length - 1];
      if (lastUser?.role === "user" && typeof lastUser.content === "string") {
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        // Verify the session belongs to this user (RLS would block but
        // we want a clean error rather than silent drop)
        const { data: sess } = await admin
          .from("counselor_sessions")
          .select("session_id, user_id, message_count")
          .eq("session_id", sessionId)
          .maybeSingle<{ session_id: string; user_id: string; message_count: number }>();
        if (sess && sess.user_id === userId) {
          await admin.from("counselor_messages").insert({
            session_id: sessionId,
            user_id: userId,
            role: "user",
            content: lastUser.content,
          });
          // Auto-title from first user message if not yet set
          if (sess.message_count === 0) {
            const title = lastUser.content.slice(0, 80).trim();
            await admin
              .from("counselor_sessions")
              .update({ title })
              .eq("session_id", sessionId);
          }

          // Tee the streamed response: pass through to the client AND
          // collect the assistant content into a buffer; insert when [DONE].
          const teedStream = teeAndCapture(
            response.body!,
            async (assistantContent) => {
              if (!assistantContent || assistantContent.length < 1) return;
              try {
                await admin.from("counselor_messages").insert({
                  session_id: sessionId,
                  user_id: userId,
                  role: "assistant",
                  content: assistantContent,
                });
              } catch (e) {
                console.warn("[topuni-chat] persist assistant failed", e);
              }
            },
          );

          return new Response(teedStream, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream",
              "X-TopUni-Case-Loaded": "1",
              "X-TopUni-Session-Id": sessionId,
            },
          });
        }
      }
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        // Tell the client whether we found case data, so the UI can
        // surface "Counselor knows your case" indicators.
        "X-TopUni-Case-Loaded": userId ? "1" : "0",
      },
    });
  } catch (e) {
    console.error("topuni-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
