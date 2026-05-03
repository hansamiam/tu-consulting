import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { chatCompletions, embeddings as gatewayEmbeddings } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import {
  PREMIUM_SECTIONS,
  buildRegenPrompt,
  type SectionSpec,
  type BriefContext,
} from "../_shared/brief-sections.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_MODEL = "text-embedding-3-small";

/* ─── Profile → canonical query string ─────────────────────────────
   Used for embedding. Same shape as match-scholarships' profileToQuery
   so retrievals are stable across surfaces. */
function profileToQuery(profile: any): string {
  const parts: string[] = [];
  const field = (profile.major || profile.field || "").trim();
  if (field) parts.push(`Field of study: ${field}.`);
  if (profile.gradeLevel) parts.push(`Current level: ${profile.gradeLevel}.`);
  const tc = (profile.targetCountries || []).slice(0, 5);
  if (tc.length) parts.push(`Target countries: ${tc.join(", ")}.`);
  if (profile.budget) parts.push(`Budget: ${profile.budget}.`);
  if (profile.scholarshipNeeded === "yes") parts.push(`Needs full scholarship.`);
  if (profile.timeline) parts.push(`Timeline: ${profile.timeline}.`);
  return parts.join(" ").trim() || "international scholarship for higher education";
}

/* Rough degree level inference for the eligibility pre-filter. */
function inferDegreeLevel(profile: any): string | null {
  const g = (profile.gradeLevel || "").toLowerCase();
  if (g.includes("9th") || g.includes("10th") || g.includes("11th") || g.includes("12th") || g.includes("foundation")) return "bachelor";
  if (g.includes("transfer")) return "bachelor";
  if (g.includes("masters") || g.includes("master")) return "master";
  if (g.includes("phd") || g.includes("doctor")) return "phd";
  return null;
}

async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const [v] = await gatewayEmbeddings({ input: text, modelOverride: EMBEDDING_MODEL });
    return Array.isArray(v) && v.length === 1536 ? v : null;
  } catch (e) {
    console.warn("Embedding failed; falling back to country-only retrieval", e);
    return null;
  }
}

/* ─── Multi-pass premium pipeline ─────────────────────────────────────
   Each section is a focused LLM call. We launch them in parallel, then
   stream them to the client in PREMIUM_SECTIONS order. Validators run on
   each completion; failures get ONE retry with a stricter prompt. */

interface SectionResult {
  spec: SectionSpec;
  markdown: string;
  /** Whether the markdown passed validation (after any regen). */
  valid: boolean;
  /** Whether we needed a second attempt to satisfy the validator. */
  regenerated: boolean;
  /** Reason from the FIRST validator if it failed. Telemetry-only. */
  failureReason?: string;
}

/* Generate a single section. Calls the model once; if a validator fails,
   regenerates ONCE with a stricter prompt; falls back to the first attempt
   if both fail (better degraded section than blocking the whole brief). */
async function generateSection(spec: SectionSpec, ctx: BriefContext): Promise<SectionResult> {
  const sysContent = `You are TopUni AI, an expert admissions strategist. You output ONLY the requested markdown section, beginning with the H2 heading exactly as instructed. No preamble, no commentary, no fences.`;

  let firstAttempt = "";
  let firstReason: string | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const prompt = attempt === 1
      ? spec.buildPrompt(ctx)
      : buildRegenPrompt(spec, ctx, firstReason ?? "validation failed");
    try {
      const resp = await chatCompletions({
        tier: "pro",
        messages: [
          { role: "system", content: sysContent },
          { role: "user",   content: prompt },
        ],
        stream: false,
        ...(spec.reasoning ? { reasoning: spec.reasoning } : {}),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        console.warn(`[brief-sections] ${spec.id} attempt ${attempt} HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
        if (attempt === 1) { firstReason = `gateway HTTP ${resp.status}`; continue; }
        // Attempt 2 also failed — keep first attempt if we have it.
        return {
          spec,
          markdown: firstAttempt || `${spec.heading}\n\n*(This section couldn't be generated. We'll try again next time.)*`,
          valid: false,
          regenerated: true,
          failureReason: firstReason,
        };
      }
      const data = await resp.json();
      const text = (
        data?.choices?.[0]?.message?.content
        ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
        ?? ""
      ) as string;
      const trimmed = text.trim();

      const validation = spec.validate?.(trimmed, ctx) ?? { ok: true };
      if (validation.ok) {
        return {
          spec,
          markdown: trimmed,
          valid: true,
          regenerated: attempt > 1,
          failureReason: firstReason,
        };
      }
      // First-attempt failure: stash it and retry with stricter prompt.
      if (attempt === 1) {
        firstAttempt = trimmed;
        firstReason = validation.reason ?? "unspecified";
        continue;
      }
      // Second attempt also failed — keep the better of the two by length.
      const second = trimmed;
      const better = second.length > firstAttempt.length ? second : firstAttempt;
      return { spec, markdown: better, valid: false, regenerated: true, failureReason: firstReason };
    } catch (e) {
      console.warn(`[brief-sections] ${spec.id} attempt ${attempt} threw:`, (e as Error).message);
      if (attempt === 2) {
        return {
          spec,
          markdown: firstAttempt || `${spec.heading}\n\n*(This section couldn't be generated. We'll try again next time.)*`,
          valid: false,
          regenerated: true,
          failureReason: (e as Error).message,
        };
      }
    }
  }
  // Unreachable — both attempts above always return.
  return {
    spec,
    markdown: `${spec.heading}\n\n*(Generation failed.)*`,
    valid: false,
    regenerated: true,
  };
}

/* Stream a list of section promises to the client in defined order using
   the OpenAI-compat SSE format (`data: {"choices":[{"delta":{"content":...}}]}`)
   so the existing frontend parser works unchanged. */
function buildOrderedSectionStream(promises: Array<Promise<SectionResult>>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (text: string) => {
        const chunk = JSON.stringify({ choices: [{ delta: { content: text } }] });
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      };
      try {
        for (let i = 0; i < promises.length; i++) {
          const result = await promises[i];
          // Insert paragraph spacing between sections so the markdown
          // renders with clean separation.
          const prefix = i === 0 ? "" : "\n\n";
          emit(prefix + result.markdown);
          if (!result.valid) {
            console.warn(`[brief-sections] section ${result.spec.id} delivered invalid (reason: ${result.failureReason ?? "?"})`);
          }
          if (result.regenerated) {
            console.log(`[brief-sections] section ${result.spec.id} regenerated`);
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (e) {
        console.error("[brief-sections] stream error:", e);
        emit(`\n\n*(An unexpected error interrupted brief generation. Please regenerate.)*\n`);
      } finally {
        controller.close();
      }
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit: 5 brief generations per minute per IP. A real visitor will
    // never hit this; abuse scripts will. Each blocked request saves ~$0.02
    // of GPT-4o-mini spend.
    const ip = clientIp(req);
    const ok = await checkRateLimit(supabase, { key: `ai-pathway:${ip}`, perMinute: 5 });
    if (!ok) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded — please wait a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { profile, language, reportGrade } = await req.json();
    const grade = reportGrade || "basic";
    // AI gateway env validated lazily inside chatCompletions / gatewayEmbeddings —
    // see _shared/ai-gateway.ts. Provider chosen via AI_PROVIDER env var.

    /* ─── Brief-generation timestamp (retention loop signal) ──────────────
       Stamp last_brief_generated_at on student_profiles for authed users.
       The pro-upgrade-nudge cron uses this column to find users whose
       brief is N days old and queue the conversion email. Fire-and-forget
       so it never blocks the streaming response.
       Service-role client doesn't carry user identity, so we resolve the
       userId via a separate anon client + the inbound JWT. */
    (async () => {
      try {
        const auth = req.headers.get("Authorization");
        if (!auth?.startsWith("Bearer ")) return;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (!anonKey) return;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: auth } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user?.id) return;
        await supabase
          .from("student_profiles")
          .update({ last_brief_generated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      } catch (e) {
        console.warn("brief-generation timestamp update failed:", e);
      }
    })();

    const targetCountries = profile.targetCountries || [];
    const studentGpa = parseFloat(profile.gpa) || null;
    const studentIelts = parseFloat(profile.ielts) || null;

    /* ─── Scholarship retrieval via pgvector RAG ───────────────────
       Replaces the old "fetch all unis + nested scholarships, dump
       30 of them into the prompt" approach. We:
         1. Build a canonical query string from the profile.
         2. Embed it.
         3. Call match_scholarships() with eligibility filters.
         4. Hydrate top 25 full rows in retrieval order.
       Falls back gracefully to a country-filtered SELECT if any
       step fails (cold-start: no embeddings yet, gateway down). */
    const profileQuery = profileToQuery(profile);
    const queryEmbedding = await embedQuery(profileQuery);
    const degreeLevel = inferDegreeLevel(profile);

    let scholarshipRows: any[] = [];
    let retrievalMethod = "fallback_country_filter";

    if (queryEmbedding) {
      const { data: matches, error: matchErr } = await supabase.rpc("match_scholarships", {
        query_embedding: queryEmbedding as unknown as string,
        p_nationality: profile.nationality || null,
        p_min_gpa: studentGpa,
        p_min_ielts: studentIelts,
        p_degree_level: degreeLevel,
        p_max_results: 25,
      });
      if (!matchErr && Array.isArray(matches) && matches.length > 0) {
        const ids = matches.map((m: any) => m.scholarship_id);
        const { data: hydrated } = await supabase
          .from("scholarships")
          .select(
            "scholarship_id, scholarship_name, provider_name, host_country, " +
            "coverage_type, award_amount_text, estimated_total_value_usd, " +
            "target_degree_level, target_fields, application_deadline, " +
            "eligibility_requirements, citizenship_requirements, official_url, " +
            "why_this_fits, strategy_notes"
          )
          .in("scholarship_id", ids);
        // Re-order to match retrieval order; tag each with similarity & eligibility flag.
        const order = new Map(matches.map((m: any, i: number) => [m.scholarship_id, i]));
        const elig = new Map(matches.map((m: any) => [m.scholarship_id, m.passes_eligibility]));
        const sims = new Map(matches.map((m: any) => [m.scholarship_id, m.similarity]));
        scholarshipRows = (hydrated || [])
          .map((r) => ({ ...r, _similarity: sims.get(r.scholarship_id), _eligible: elig.get(r.scholarship_id) }))
          .sort((a, b) => (order.get(a.scholarship_id)! - order.get(b.scholarship_id)!));
        retrievalMethod = "pgvector_rag";
      }
    }

    if (scholarshipRows.length === 0) {
      // Fallback: country-filtered top 25 sorted by deadline urgency
      let q = supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, " +
          "coverage_type, award_amount_text, estimated_total_value_usd, " +
          "target_degree_level, target_fields, application_deadline, " +
          "eligibility_requirements, citizenship_requirements, official_url, " +
          "why_this_fits, strategy_notes"
        );
      if (targetCountries.length > 0) {
        q = q.in("host_country", [...targetCountries, "Global", "Multiple", "European Union"]);
      }
      const { data } = await q
        .order("application_deadline", { ascending: true, nullsFirst: false })
        .limit(25);
      scholarshipRows = data || [];
    }

    /* Universities — kept lighter. Country-filter SELECT with the
       fields the prompt actually uses. The university table is much
       smaller than scholarships, so RAG is overkill here. */
    const { data: universities } = await supabase
      .from("universities")
      .select(`
        university_name, country, city, tuition_usd_per_year,
        language_of_instruction, foundation_year_available, gap_year_accepted,
        programs (
          program_name, degree_level, field_of_study, duration_years,
          admission_requirements ( ielts_score_min, gpa_min, application_deadline ),
          applications ( acceptance_rate, visa_difficulty_score )
        )
      `)
      .in("country", targetCountries.length > 0 ? targetCountries : []);

    const relevantUnis = (universities || []).slice(0, 15);

    /* ─── Prompt context ───────────────────────────────────────────
       Compact, retrieval-driven. Scholarships first (the AI report's
       primary deliverable) then a slimmer universities block. */
    const scholarshipContext = scholarshipRows.map((s: any, i: number) => {
      const fields = (s.target_fields || []).filter(Boolean).join(", ");
      const levels = (s.target_degree_level || []).filter(Boolean).join(", ");
      const elig = String(s.eligibility_requirements || "").slice(0, 240);
      const sim = typeof s._similarity === "number" ? ` (relevance ${(s._similarity * 100).toFixed(0)}%)` : "";
      const eligTag = s._eligible === false ? " [eligibility unclear — review]" : "";
      return `${i + 1}. ${s.scholarship_name}${sim}${eligTag}
   Provider: ${s.provider_name || "—"}; host: ${s.host_country || "—"}
   Coverage: ${s.coverage_type}${s.award_amount_text ? ` — ${s.award_amount_text}` : ""}
   Levels: ${levels || "any"}; fields: ${fields || "any"}
   Deadline: ${s.application_deadline || "varies"}; URL: ${s.official_url || "—"}
   Eligibility: ${elig || "—"}`;
    }).join("\n\n");

    const universityContext = relevantUnis.map((u: any) => {
      const programs = (u.programs || []).slice(0, 4).map((p: any) => {
        const req = p.admission_requirements?.[0];
        const app = p.applications?.[0];
        return `   - ${p.program_name} (${p.degree_level}, ${p.field_of_study}): IELTS ${req?.ielts_score_min ?? "—"}, GPA ${req?.gpa_min ?? "—"}, accept ${app?.acceptance_rate != null ? app.acceptance_rate + "%" : "—"}, deadline ${req?.application_deadline ?? "—"}`;
      }).join("\n");
      return `- ${u.university_name} (${u.city}, ${u.country}) · tuition $${u.tuition_usd_per_year ?? "—"}/yr · foundation ${u.foundation_year_available ? "yes" : "no"}\n${programs}`;
    }).join("\n");

    const dbContext = `=== TOP-${scholarshipRows.length} RETRIEVED SCHOLARSHIPS (method: ${retrievalMethod}) ===
${scholarshipContext || "(none retrieved)"}

=== TARGET UNIVERSITIES (${relevantUnis.length}) ===
${universityContext || "(none in database for the student's target countries)"}`;

    const lang = language === "ru" ? "Russian" : "English";
    
    const basicSections = `Generate the student's pathway report. The output is rendered both on screen AND as a printable PDF the student can email to parents and bring to advising sessions. Use clean markdown — ## for major sections, ### for sub-sections, bullet lists for items.

Required sections, in this exact order:

## Strategic positioning
One paragraph (4-6 sentences). Where this student stands among international applicants this cycle, what their strongest signals are, what their biggest gap is. Be specific and quantitative — cite GPA in context, IELTS band relative to thresholds at the targets they listed, country competitiveness if relevant.

After the paragraph, on its own line, output exactly:

**Your 30-day call:** [one specific, single-sentence strategic action this student should take in the next 30 days]

## Your university shortlist
Pull 6-9 real universities from the database section above. Organize into three buckets, in this exact order, using exactly these labels:

### Strong fits — apply with confidence
3-4 universities where the student's profile aligns well. For each:
- **University name** — one-line "why it fits you specifically"
- Specific program from the database
- Acceptance rate or selectivity context

### Aligned options — competitive but achievable
2-3 universities where it's selective but realistic with a focused application. Same format.

### Worth keeping on the radar
1-2 universities to track for next cycle or with stronger prep. Same format.

Do NOT invent universities. Pull only from the database section above.

## Your funding pathway
3-5 specific scholarships from the database that match this profile. For each:
- **Scholarship name** — award amount and coverage type
- Why this student is a real candidate
- Application timing and deadline if known
Be honest about probability. Mark each as a primary target, secondary option, or stretch.

## Your 90-day action plan
A week-by-week sequence starting from today. Group as:

### Weeks 1–2 — Foundation
2-3 concrete actions

### Weeks 3–6 — Drafting
2-3 concrete actions

### Weeks 7–12 — Submission
2-3 concrete actions

Reference the student's specific scores and target countries. Concrete actions only — no "research more" filler.

## Three essay angles
Three distinct narrative angles this student could lead with. For each, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences on what specifically about this student's profile makes this angle credible — cite real details]
**Anchor it with:** [a specific story, detail, or experience from the student's profile they could build the essay around]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...

## Honest gaps to close
1-3 specific weaknesses in the profile. No softening — the parent reading this should see exactly what to work on. For each gap, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [1-2 sentences citing the specific threshold or context]
**Action this month:** [one specific, single-sentence action they can start now]

### Gap 2: [short headline]
**Priority:** ...
**Why it matters:** ...
**Action this month:** ...

## Final word
One short paragraph (3-4 sentences) of specific encouragement based on this student's strongest signal — what they should believe about their candidacy as they go execute. Do not give generic motivation. Do not say "good luck." Cite something concrete from their profile and tell them why it matters.

Throughout the report:
- Be specific, use real data from the database, name names, cite numbers
- Avoid the words "stretch," "long shot," "real shot," "safety school"
- Avoid generic advice — every sentence should be specific to this student
- Write in a confident, direct voice the student would respect`;

    const premiumSections = `Generate an EXHAUSTIVE, DEEPLY PERSONALIZED report. This is the premium tier — go significantly deeper than a basic report. The output is rendered both on screen AND as a printable PDF the student keeps as a reference document. Use clean markdown.

Required sections, in this exact order:

## Strategic positioning
2-3 paragraphs. Quantitative competitive analysis: GPA percentile context, IELTS band relative to thresholds at target countries, where this profile is strongest, where it is weakest.

After the paragraphs, on its own line, output exactly:

**Your 30-day call:** [one specific, single-sentence strategic action this student should take in the next 30 days]

## Your university shortlist (15-20 universities)
Pull 15-20 real universities from the database. Organize into three buckets:

### Strong fits — apply with confidence
6-8 universities. For each:
- **University name** — fit score (0-100%) with one-line justification
- Specific program(s) with admission requirements (IELTS, GPA cutoff)
- Historical acceptance rate context
- One unique selling point specific to this student

### Aligned options — competitive but achievable
5-7 universities. Same format.

### Worth keeping on the radar
3-5 universities. Same format.

Do NOT invent universities. Pull from the database section only.

## Career ROI breakdown
For each top-3 recommended university (the strongest 3 fits):
- Typical starting salary range in this student's target field
- Employment rate within 6 months of graduation
- Notable employers from each program
- Long-term trajectory (where alumni are 5-10 years later)

## Funding deep-dive
For each shortlist of 4-6 scholarships:
- **Scholarship name** with award amount
- Probability assessment: primary target / secondary / stretch
- Specific application strategy and timeline
- Key documents this student needs to start gathering now

Then add a sub-section:

### Combined funding scenarios
2-3 plausible combinations of scholarships, partial aid, and country-specific need-based programs that could fully fund this student. Estimate total funding for each scenario.

## Visa and post-graduation pathway
For each of the student's top 3 target countries:
- Student visa difficulty (specific to this student's nationality)
- Post-study work visa details and duration
- Path to permanent residency timeline
- Realistic challenges this student should plan for

## Three personalized essay angles
For each, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences citing specific details from this student's profile]
**Anchor it with:** [a specific story, detail, or experience]
**Plays best to:** [which 2-3 target universities this angle plays best to and why]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

## Monthly budget breakdown
For the top 3 recommended cities:
- Rent, food, transport, insurance, books, leisure (realistic ranges)
- Part-time work options and typical earnings if visa allows
- Total monthly cost and how scholarship coverage maps onto it

## Honest gaps to close
2-3 specific weaknesses in the profile. For each, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [2-3 sentences citing specific thresholds or context]
**Action this month:** [one specific action they can start now]
**30-60 day plan:** [the next-step plan after that]

## 90-day action plan
Week-by-week from today, grouped as Weeks 1-2 / 3-6 / 7-12. 3-4 concrete actions per group, with specific deliverables.

## Final word
One short paragraph (3-4 sentences) of specific encouragement based on this student's strongest signal — what they should believe about their candidacy as they go execute. Do not give generic motivation. Do not say "good luck." Cite something concrete from their profile and tell them why it matters.

Throughout:
- Be exceptionally specific. This is the premium tier — every paragraph should feel hand-written for this student.
- Use real data from the database — name universities, programs, scholarships, deadlines.
- Avoid the words "stretch," "long shot," "real shot," "safety school."
- Confident, direct voice. The student should feel respected.`;

    const studentNationality = (profile.nationality || "").trim();
    const audienceLine = studentNationality
      ? `for ambitious students applying internationally (this student is from ${studentNationality})`
      : `for ambitious students applying internationally from anywhere in the world`;

    /* ─── Premium tier: multi-pass pipeline ─────────────────────────────
       Each section is its own focused LLM call, validated, regenerated
       on failure once, then streamed in order. Higher cost (~10 calls
       vs 1) but dramatically more reliable structure + deeper per-
       section content because each prompt is laser-focused. */
    if (grade === "premium") {
      const briefCtx: BriefContext = {
        dbContext,
        profile,
        lang,
        audienceLine,
      };
      // Launch all section calls in parallel — they're independent.
      const sectionPromises = PREMIUM_SECTIONS.map(spec => generateSection(spec, briefCtx));
      const stream = buildOrderedSectionStream(sectionPromises);
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const systemPrompt = `You are TopUni AI — a thoughtful university admissions strategist that produces ${grade === "premium" ? "exhaustive, deeply personalized strategy reports" : "focused, actionable pathway analyses"} ${audienceLine}.

You MUST respond in ${lang}.

You have access to REAL data from our database — both scholarships (retrieved by relevance to this specific student via vector search) and universities. Use only this data when naming options. Cite scholarship names and universities verbatim from the lists below. Do not invent options not present in the data.

${dbContext}

STUDENT PROFILE:
- Name: ${profile.fullName}
- GPA: ${profile.gpa || 'Not provided'}
- IELTS: ${profile.ielts || 'Not taken'}
- SAT: ${profile.sat || 'Not taken'}
- Grade Level: ${profile.gradeLevel}
- Target Countries: ${targetCountries.join(', ') || 'Open'}
- Intended Major: ${profile.major || 'Undecided'}
- Budget: ${profile.budget || 'Not specified'}
- Needs Scholarship: ${profile.scholarshipNeeded || 'Not specified'}
- Timeline: ${profile.timeline || 'Flexible'}
- Priorities: Prestige ${profile.prestige}/5, Scholarship ${profile.scholarship}/5, Career ROI ${profile.careerRoi}/5, Visa Access ${profile.visaAccess}/5, Location ${profile.locationPref}/5${profile.topActivity ? `
- Top activity / achievement: ${profile.topActivity}` : ''}${profile.personalStory ? `
- Personal story (the student's own words): ${profile.personalStory}` : ''}${profile.namedSchools ? `
- Specific schools on their list: ${profile.namedSchools}` : ''}

${(profile.topActivity || profile.personalStory || profile.namedSchools) ? `
CRITICAL: The student supplied personal context above. You MUST use it specifically:
${profile.topActivity ? "- Reference the top activity by name in the essay angles. The 'Anchor it with' field for at least one angle should pull from this activity directly.\n" : ""}${profile.personalStory ? "- The strategic positioning paragraph and at least one essay angle should weave in the personal story. Use their actual phrasing where natural — not generic motivational language.\n" : ""}${profile.namedSchools ? "- Mention the specific schools they named in the shortlist. If a named school isn't in the database, place it in the appropriate bucket with a note that we don't have detailed data on it yet.\n" : ""}` : ''}

${grade === "premium" ? premiumSections : basicSections}`;

    // Premium reports get the stronger model (gateway translates per provider)
    const response = await chatCompletions({
      tier: grade === "premium" ? "pro" : "flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate my personalized university pathway plan.` },
      ],
      stream: true,
      ...(grade === "premium" ? { reasoning: { effort: "high" as const } } : {}),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("topuni-ai-pathway error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
