// scholarship-deep-dive
//
// Generates and caches a personalized analysis of a single scholarship for
// a single student profile. Replaces the generic, identical-for-everyone
// why_this_fits / how_to_win text with a tailored deep-dive: match-score
// breakdown vs the student's stats, strategy specific to their background,
// realistic odds bucket, and a 30-day plan.
//
// Cache: scholarship_deep_dives keyed on (scholarship_id, profile_hash).
// Profile-deterministic — same profile + same scholarship returns the
// cached row instantly. profile_hash is computed in this function so two
// visitors with effectively-identical profiles share the cache.
//
// Anon callers welcome: profile is passed in via the request body. The
// row is written with user_id=NULL when no JWT is present, NULL-or-the-
// user-id otherwise.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import {
  cleanScholarshipName,
  cleanProvider,
  cleanHostCountry,
  cleanAwardText,
} from "../_shared/scholarshipFields.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA_VERSION = 3;
const COST_ESTIMATE_USD = 0.005;

interface InboundProfile {
  fullName?: string;
  nationality?: string;
  major?: string;
  field?: string;
  gradeLevel?: string;
  targetCountries?: string[];
  gpa?: string | number | null;
  gpaScale?: string | number | null;
  ielts?: string | number | null;
  toefl?: string | number | null;
  sat?: string | number | null;
}

interface ReqBody {
  scholarshipId: string;
  profile: InboundProfile;
  language?: "en" | "ru";
}

// Output schema — must match the frontend's ScholarshipDeepDive component.
// Keep in sync with src/types/scholarshipDeepDive.ts.
interface DeepDiveOutput {
  match: {
    overall_score: number; // 0-100
    breakdown: Array<{
      label: string;
      status: "met" | "near" | "miss" | "unknown";
      detail: string;
    }>;
  };
  strategy: {
    headline: string;
    points: string[];      // 3-5
    avoid: string[];       // 0-2
  };
  odds: {
    bucket: "primary" | "competitive" | "aspirational";
    rationale: string;
    typical_admit_profile: string;
  };
  thirty_day: {
    items: Array<{ week: 1 | 2 | 3 | 4; action: string }>;
  };
}

const SCHEMA_DOC = `{
  "match": {
    "overall_score": "integer 0-100 — your honest read on profile-vs-requirement fit",
    "breakdown": [
      { "label": "string — e.g. 'GPA threshold'", "status": "met | near | miss | unknown", "detail": "string — concrete comparison, e.g. 'Yours 3.7/4.0 vs required 3.5'" }
    ]
  },
  "strategy": {
    "headline": "string — the single positioning angle this student should lead with for THIS scholarship",
    "points": ["string array, 3-5 — concrete tactical moves specific to the student's background"],
    "avoid": ["string array, 0-2 — things NOT to do given this student's profile"]
  },
  "odds": {
    "bucket": "primary | competitive | aspirational",
    "rationale": "string — 1-2 sentences citing the specific student-vs-typical-admit gap or alignment",
    "typical_admit_profile": "string — one line on what the typical successful applicant looks like"
  },
  "thirty_day": {
    "items": [
      { "week": "integer 1-4", "action": "string — concrete deliverable for that week" }
    ]
  }
}`;

/* Stable hash over the profile fields that meaningfully affect analysis.
   Skip cosmetic fields (fullName) so two students with same numbers share
   cache. */
async function computeProfileHash(p: InboundProfile): Promise<string> {
  const canonical = JSON.stringify({
    nationality: (p.nationality || "").toLowerCase().trim(),
    major: ((p.major || p.field) || "").toLowerCase().trim(),
    grade: (p.gradeLevel || "").toLowerCase().trim(),
    targets: (p.targetCountries || []).map(c => c.toLowerCase().trim()).sort().join(","),
    gpa: p.gpa ? String(p.gpa).trim() : "",
    gpaScale: p.gpaScale ? String(p.gpaScale).trim() : "",
    ielts: p.ielts ? String(p.ielts).trim() : "",
    toefl: p.toefl ? String(p.toefl).trim() : "",
    sat: p.sat ? String(p.sat).trim() : "",
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function isolateJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return s;
  return s.slice(first, last + 1);
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Missing Supabase env" });

  let body: ReqBody;
  try { body = await req.json() as ReqBody; }
  catch { return json(400, { error: "Invalid JSON body" }); }

  if (!body.scholarshipId || !body.profile) {
    return json(400, { error: "scholarshipId and profile required" });
  }

  // Resolve user_id from JWT if present (anon callers leave it null).
  let userId: string | null = null;
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (anonKey) {
        const userClient = createClient(SUPABASE_URL, anonKey, {
          global: { headers: { Authorization: auth } },
        });
        const { data } = await userClient.auth.getUser();
        userId = data?.user?.id ?? null;
      }
    } catch { /* anon callers are fine */ }
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const profileHash = await computeProfileHash(body.profile);

  // ─── Cache hit? ─────────────────────────────────────────────────────────
  const { data: cached } = await supa
    .from("scholarship_deep_dives")
    .select("content, schema_version, generated_at")
    .eq("scholarship_id", body.scholarshipId)
    .eq("profile_hash", profileHash)
    .maybeSingle();

  if (cached && cached.schema_version === SCHEMA_VERSION) {
    return json(200, { ...(cached.content as DeepDiveOutput), _cached: true, _generated_at: cached.generated_at });
  }

  // ─── Generate ───────────────────────────────────────────────────────────
  // Load the scholarship row — we need ground-truth fields for the prompt.
  const { data: scholarship, error: schErr } = await supa
    .from("scholarships")
    .select(
      "scholarship_name, provider_name, host_country, coverage_type, " +
      "award_amount_text, estimated_total_value_usd, target_degree_level, " +
      "target_fields, application_deadline, deadline_type, " +
      "min_gpa, gpa_scale, min_ielts, min_toefl, min_sat, " +
      "citizenship_requirements, eligible_countries, eligibility_requirements, " +
      "selectivity_level, effort_level, ideal_candidate_profile, " +
      "weak_candidate_warning, why_this_fits, how_to_win, what_to_prepare_first, " +
      "essay_required, recommendation_letters_required, interview_required"
    )
    .eq("scholarship_id", body.scholarshipId)
    .maybeSingle();

  if (schErr || !scholarship) {
    return json(404, { error: "Scholarship not found" });
  }

  const lang = body.language === "ru" ? "Russian" : "English";
  const p = body.profile;
  const profileLines = [
    `Nationality: ${p.nationality || "(unspecified)"}`,
    `Field/major: ${p.major || p.field || "(unspecified)"}`,
    `Grade level: ${p.gradeLevel || "(unspecified)"}`,
    `Target countries: ${(p.targetCountries || []).join(", ") || "(unspecified)"}`,
    `GPA: ${p.gpa ?? "—"}${p.gpaScale ? ` / ${p.gpaScale}` : ""}`,
    `IELTS: ${p.ielts ?? "—"}`,
    `TOEFL: ${p.toefl ?? "—"}`,
    `SAT: ${p.sat ?? "—"}`,
  ].join("\n");

  const scholarshipLines = [
    `Name: ${cleanScholarshipName(scholarship.scholarship_name) || scholarship.scholarship_name}`,
    `Provider: ${cleanProvider(scholarship.provider_name) ?? scholarship.provider_name ?? "—"}`,
    `Host country: ${cleanHostCountry(scholarship.host_country) ?? "—"}`,
    `Coverage: ${scholarship.coverage_type}${(() => {
      const a = cleanAwardText(scholarship.award_amount_text);
      return a ? ` — ${a}` : "";
    })()}`,
    `Estimated total value: ${scholarship.estimated_total_value_usd ? `$${scholarship.estimated_total_value_usd}` : "unspecified"}`,
    `Levels: ${(scholarship.target_degree_level || []).join(", ") || "any"}`,
    `Fields: ${(scholarship.target_fields || []).join(", ") || "any"}`,
    `Deadline: ${scholarship.application_deadline || "rolling/unknown"} (${scholarship.deadline_type || "—"})`,
    `Min GPA: ${scholarship.min_gpa ?? "—"}${scholarship.gpa_scale ? ` / ${scholarship.gpa_scale}` : ""}`,
    `Min IELTS: ${scholarship.min_ielts ?? "—"}`,
    `Min TOEFL: ${scholarship.min_toefl ?? "—"}`,
    `Min SAT: ${scholarship.min_sat ?? "—"}`,
    `Citizenship: ${scholarship.citizenship_requirements || "—"}`,
    `Eligible countries: ${(scholarship.eligible_countries || []).join(", ") || "(open)"}`,
    `Selectivity: ${scholarship.selectivity_level || "unknown"}`,
    `Effort level: ${scholarship.effort_level || "unknown"}`,
    `Essay required: ${scholarship.essay_required ?? "unknown"}`,
    `Rec letters: ${scholarship.recommendation_letters_required ?? "unknown"}`,
    `Interview: ${scholarship.interview_required ?? "unknown"}`,
    `Static "why this fits" copy: ${scholarship.why_this_fits || "(none)"}`,
    `Static "how to win it" copy: ${scholarship.how_to_win || "(none)"}`,
    `Ideal candidate (heuristic): ${scholarship.ideal_candidate_profile || "(none)"}`,
    `Weak candidate warning: ${scholarship.weak_candidate_warning || "(none)"}`,
    `Eligibility prose: ${scholarship.eligibility_requirements || "(none)"}`,
  ].join("\n");

  const prompt = `You are a Yale/Cambridge/Harvard-trained admissions strategist briefing a specific student on a specific scholarship. The output renders on the student's Discover DetailSheet inside a "My plan" tab — they read it to decide "should I spend 20 hours on this application?" Output ONLY valid JSON matching the schema. No markdown fences. No preamble.

CRITICAL RULES:
1. Be specific and quantitative. Cite the student's actual numbers.
2. If the scholarship has a min_gpa / min_ielts / etc. and the student is missing or below it, mark that breakdown line as "miss" or "near" honestly. Do not soften.
3. odds.bucket = "primary" if the student clearly meets thresholds AND fits the typical admit profile; "competitive" if they're in range but fighting for a slot; "aspirational" if they're below thresholds or far from the typical admit profile.
4. thirty_day.items must include exactly 4 entries, one per week, with concrete deliverables — "draft personal statement v1" not "work on essay".
5. Output language: ${lang}.

QUALITY BAR — these are the rules generic AI breaks. We don't:
- BANNED admissions clichés: "stretch", "long shot", "real shot", "safety school", "reach school", "target school", "playbook", "journey", "potential" (as in "your potential"). The user-facing aspirational label is "Aim high" — never write that you think a scholarship is out of reach; honest gap-analysis is the value.
- BANNED platitudes: "write a strong essay", "showcase your strengths", "be authentic", "highlight your achievements", "tell your story", "stand out from the crowd". A counsellor would never say these.
- BANNED filler verbs in strategy.points / strategy.avoid: "explore", "refine", "leverage", "maximize" — when used generically. "Leverage your robotics team experience" is fine. "Leverage your strengths" is not.
- strategy.headline must be a real positioning angle — a thesis shape, a recommender pattern, a story type. Example GOOD: "Lead with the measurable impact of your social-enterprise project — show 6 months of traction, not aspirations." Example BAD: "Showcase your leadership and academic excellence."
- strategy.points each must be a CONCRETE TACTICAL MOVE specific to this student's file. Example GOOD: "Cite your 3.8 GPA + IELTS 7.5 in the eligibility paragraph; the typical admit lands 3.7+/7.0+ so you exceed both thresholds." Example BAD: "Write a compelling personal statement that highlights your strengths."
- strategy.avoid must name SPECIFIC failure patterns observed for this program type. Example GOOD: "Don't lead with your Goldman internship — the typical admit pool has 5+ similar profiles, it won't differentiate." Example BAD: "Don't be generic in your essays."
- odds.rationale must cite the SPECIFIC student-vs-typical-admit gap or alignment. Example GOOD: "Your 3.6 GPA is 0.2 below the typical admit's 3.8 — competitive but you'll need essays to bridge that." Example BAD: "Your profile is competitive for this program."
- match.breakdown must be specific. Example GOOD label/detail: "GPA threshold" / "Yours 3.7/4.0 vs required 3.5 — meets". Example BAD: "Academic profile" / "Your academic record is strong."
- thirty_day.items each must name a concrete deliverable. Example GOOD: "Week 2: Order Cambridge prospectus + identify 2 recommenders who can speak to your robotics work specifically." Example BAD: "Week 2: Research the program."

SCHEMA:
${SCHEMA_DOC}

STUDENT PROFILE:
${profileLines}

SCHOLARSHIP:
${scholarshipLines}

Now output ONLY the JSON. Begin with { and end with }.`;

  let parsed: DeepDiveOutput;
  try {
    // Pro tier — this output is cached server-side per (scholarship_id ×
    // profile_hash), so each combination is generated ONCE and read
    // forever. The flash-tier was producing competent-but-generic output
    // (the "showcase your strengths" / "leverage your background" school
    // of advice). Pro tier with the tightened prompt above produces
    // counsellor-grade specifics — citing the exact GPA gap, naming the
    // typical admit gap, prescribing a real positioning angle. The cost
    // diff (~$0.005 vs ~$0.0008) is paid once per row and is the entire
    // value prop of the My Plan tab.
    const resp = await chatCompletions({
      tier: "pro",
      messages: [
        { role: "system", content: "You are a Yale/Cambridge/Harvard-trained admissions strategist briefing a real student on a specific scholarship. Output only valid JSON matching the requested schema. The student decides whether to spend 20 hours on this application based on what you write — generic content WASTES their time. Always be specific to their numbers and this program." },
        { role: "user", content: prompt },
      ],
      stream: false,
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[scholarship-deep-dive] gateway error", resp.status, t.slice(0, 300));
      return json(502, { error: "Generation failed" });
    }
    const data = await resp.json();
    const raw =
      data?.choices?.[0]?.message?.content
      ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
      ?? "";
    if (!raw) return json(502, { error: "Empty completion" });
    parsed = JSON.parse(isolateJson(raw)) as DeepDiveOutput;
    // Soft validation — if any required top-level key is missing, fail loudly
    if (!parsed?.match || !parsed?.strategy || !parsed?.odds || !parsed?.thirty_day) {
      throw new Error("Schema mismatch: missing top-level section");
    }
  } catch (e) {
    console.warn("[scholarship-deep-dive] parse failed", (e as Error).message);
    return json(502, { error: "Parse failed" });
  }

  // Cache the result. Upsert so a re-fire (e.g. cache eviction) just overwrites.
  await supa.from("scholarship_deep_dives").upsert({
    scholarship_id: body.scholarshipId,
    profile_hash: profileHash,
    user_id: userId,
    content: parsed,
    schema_version: SCHEMA_VERSION,
    cost_estimate_usd: COST_ESTIMATE_USD,
    model_tag: Deno.env.get("AI_PROVIDER") || "lovable",
  }, { onConflict: "scholarship_id,profile_hash" });

  return json(200, { ...parsed, _cached: false, _generated_at: new Date().toISOString() });
});
