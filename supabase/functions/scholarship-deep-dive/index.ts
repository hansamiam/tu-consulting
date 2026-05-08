// scholarship-deep-dive
//
// Generates and caches a personalized analysis of a single scholarship for
// a single student profile. Replaces the generic, identical-for-everyone
// why_this_fits / how_to_win text with a tailored deep-dive: how the
// student's profile maps to the program's audience and strategy specific
// to their background. (Time-boxed action plans + odds-quoting language
// retired — they were fluff without enough profile signal to be honest.)
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
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import { EDITORIAL_RULES_TIGHT } from "../_shared/editorial-rules.ts";
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

// Bumped 5 — added trust calibration (thin-row caveats), audience gate
// (target_demographics restrict-or-target tags), and partner_universities
// + provenance notes context. Cached v4 rows can over-claim thresholds
// from thin rows — regenerate so they pick up the verify-on-official-site
// caveat. Also fixed a bug where the validator required `thirty_day` even
// though the prompt instructed the LLM to skip it (every faithful v4
// response was getting rejected and never cached).
const SCHEMA_VERSION = 5;
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
    "bucket": "primary",
    "rationale": "ignored — kept in schema for back-compat; the client no longer renders this",
    "typical_admit_profile": "string — one line on what the typical successful applicant looks like (background, level, what they've already done)"
  }
}`;

// Note: the schema's 'odds.bucket' and 'odds.rationale' fields are
// retained in the type for back-compat with cached rows but the client
// no longer renders them — see ScholarshipDeepDive.tsx for the round-6
// tone rework. The 'thirty_day' field was also removed from generation.
// Tell the LLM to skip both.
const STRIP_FIELDS_NOTE = `
SKIP these fields entirely — output them as empty / placeholder values:
  · odds.bucket: always emit "primary" (the client ignores it)
  · odds.rationale: emit empty string ""
  · thirty_day: do NOT include this key in your output at all
Generate only: match.overall_score, match.breakdown, strategy.headline,
strategy.points, strategy.avoid, odds.typical_admit_profile.`;

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

  // ─── Rate limit by IP ──────────────────────────────────────────────────
  // Each cache miss costs ~$0.005 of AI spend. Without a cap an anon
  // visitor (or a script) can burn budget in a loop hitting different
  // scholarship_ids — the cache absorbs repeat-same-row traffic but
  // not breadth-of-row probing. 12/min ≈ one open every 5 seconds,
  // plenty for legitimate use.
  const ip = clientIp(req);
  const rateLimitOk = await checkRateLimit(supa, { key: `deep-dive:${ip}`, perMinute: 12 });
  if (!rateLimitOk) {
    return json(429, { error: "Rate limit exceeded. Please slow down." });
  }

  const profileHash = await computeProfileHash(body.profile);

  // ─── Load scholarship FIRST so we have updated_at for the cache check ──
  // Re-ordered so the cache freshness compare can use the row's updated_at
  // cursor — bumped by every scholarship UPDATE (verify cron, enrich cron,
  // self-clean, admin edits).
  const { data: scholarship, error: schErr } = await supa
    .from("scholarships")
    .select(
      "scholarship_name, provider_name, host_country, coverage_type, " +
      "award_amount_text, estimated_total_value_usd, target_degree_level, " +
      "target_fields, application_deadline, deadline_type, " +
      "min_gpa, gpa_scale, min_ielts, min_toefl, min_sat, " +
      "citizenship_requirements, eligible_countries, eligibility_requirements, " +
      "target_demographics, partner_universities, notes, " +
      "selectivity_level, effort_level, ideal_candidate_profile, " +
      "weak_candidate_warning, why_this_fits, how_to_win, what_to_prepare_first, " +
      "essay_required, recommendation_letters_required, interview_required, " +
      "confidence, data_completeness_score, " +
      "updated_at"
    )
    .eq("scholarship_id", body.scholarshipId)
    .maybeSingle();

  if (schErr || !scholarship) {
    return json(404, { error: "Scholarship not found" });
  }

  // ─── Cache hit? ─────────────────────────────────────────────────────────
  // Two conditions for a hit:
  //   1. schema_version matches (output shape is current)
  //   2. cached generated_at >= scholarship.updated_at (the underlying row
  //      hasn't drifted since the analysis was generated). When the verify
  //      cron self-cleans a name, or the enrich cron fills how_to_win, or
  //      an admin tweaks min_gpa, the cached analysis is stale and we
  //      regenerate.
  const { data: cached } = await supa
    .from("scholarship_deep_dives")
    .select("content, schema_version, generated_at")
    .eq("scholarship_id", body.scholarshipId)
    .eq("profile_hash", profileHash)
    .maybeSingle();

  if (cached && cached.schema_version === SCHEMA_VERSION) {
    const cachedAt = new Date(cached.generated_at).getTime();
    const rowUpdatedAt = scholarship.updated_at ? new Date(scholarship.updated_at).getTime() : 0;
    if (cachedAt >= rowUpdatedAt) {
      return json(200, { ...(cached.content as DeepDiveOutput), _cached: true, _generated_at: cached.generated_at });
    }
    // else: drift detected → fall through to regenerate.
  }

  const lang = body.language === "ru" ? "Russian" : "English";
  const p = body.profile;
  // Treat empty strings the same as null/undefined. The wizard saves
  // skipped fields as "" rather than dropping the key, so naïve `?? "—"`
  // would render `IELTS: ` (no value) and the LLM would treat that as a
  // real datum. `pf` collapses falsy strings to a single placeholder.
  const pf = (v: unknown, fallback = "—"): string => {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s.length > 0 ? s : fallback;
  };
  const profileLines = [
    `Nationality: ${pf(p.nationality, "(unspecified)")}`,
    `Field/major: ${pf(p.major || p.field, "(unspecified)")}`,
    `Grade level: ${pf(p.gradeLevel, "(unspecified)")}`,
    `Target countries: ${(p.targetCountries || []).filter(Boolean).join(", ") || "(unspecified)"}`,
    `GPA: ${pf(p.gpa)}${pf(p.gpaScale, "") ? ` / ${pf(p.gpaScale)}` : ""}`,
    `IELTS: ${pf(p.ielts)}`,
    `TOEFL: ${pf(p.toefl)}`,
    `SAT: ${pf(p.sat)}`,
  ].join("\n");

  // Trust signal — drives whether the LLM should treat scraped thresholds
  // as gospel. confidence < 0.75 OR data_completeness_score < 6 means the
  // row is thin, so quoting min_gpa as a hard gate would over-claim. Tell
  // the LLM to caveat ("the listing notes a minimum GPA, but verify on the
  // official site") rather than asserting it as a rule.
  const conf = typeof scholarship.confidence === "number" ? scholarship.confidence : null;
  const comp = typeof scholarship.data_completeness_score === "number" ? scholarship.data_completeness_score : null;
  const lowTrust = (conf !== null && conf < 0.75) || (comp !== null && comp < 6);

  const partners = Array.isArray(scholarship.partner_universities) ? scholarship.partner_universities : [];
  const audience = Array.isArray(scholarship.target_demographics) ? scholarship.target_demographics : [];

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
    `Audience tags (program restricts to / specifically targets): ${audience.length > 0 ? audience.join(", ") : "(none)"}`,
    `Partner universities${partners.length > 0 ? ` (${partners.length})` : ""}: ${partners.slice(0, 12).join(" · ") || "(none listed)"}`,
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
    `Provenance notes: ${scholarship.notes || "(none)"}`,
    `Source-row confidence: ${conf !== null ? conf.toFixed(2) : "unknown"} · completeness: ${comp !== null ? comp : "unknown"}/12${lowTrust ? " — TREAT AS THIN ROW" : ""}`,
  ].join("\n");

  const trustClause = lowTrust
    ? `\nSOURCE TRUST — THIN ROW: this scholarship row was extracted with low confidence (${conf !== null ? conf.toFixed(2) : "?"}) or low completeness (${comp ?? "?"}/12). Do NOT quote min_gpa / min_ielts / min_toefl / min_sat as hard gates if those numbers are present — the underlying page may not actually publish them. In match.breakdown, when comparing to a threshold from a thin row, append "— per our extraction, verify on the official site". Lean on what's clearly known (host country, provider, coverage, target fields/levels) and be honest about gaps. Never invent thresholds the row doesn't have.`
    : "";

  const audienceClause = audience.length > 0
    ? `\nAUDIENCE GATE: this program is explicitly restricted to / targets: ${audience.join(", ")}. If the student does not match the gating tag (e.g. program targets "women" and the profile suggests otherwise), surface that as a "miss" in match.breakdown — do NOT pretend it's open to the student.`
    : "";

  const prompt = `You are a Yale/Cambridge/Harvard-trained admissions strategist briefing a specific student on a specific scholarship. The output renders on the student's Discover DetailSheet inside a "My plan" tab — they read it to decide "should I spend 20 hours on this application?" Output ONLY valid JSON matching the schema. No markdown fences. No preamble.

CRITICAL RULES:
1. Be specific and quantitative. Cite the student's actual numbers.
2. If the scholarship has a min_gpa / min_ielts / etc. and the student is missing or below it, mark that breakdown line as "miss" or "near" honestly. Do not soften.
3. odds.bucket = "primary" if the student clearly meets thresholds AND fits the typical admit profile; "competitive" if they're in range but fighting for a slot; "aspirational" if they're below thresholds or far from the typical admit profile.
4. Output language: ${lang}.${trustClause}${audienceClause}

QUALITY BAR — these are the rules generic AI breaks. We don't:
${EDITORIAL_RULES_TIGHT}
- The user-facing aspirational label is "Aim high" — never write that you think a scholarship is out of reach; honest gap-analysis is the value.
- BANNED platitudes: "write a strong essay", "showcase your strengths", "be authentic", "highlight your achievements", "tell your story", "stand out from the crowd". A counsellor would never say these.
- BANNED filler verbs in strategy.points / strategy.avoid: "explore", "refine", "leverage", "maximize" — when used generically. "Leverage your robotics team experience" is fine. "Leverage your strengths" is not.
- strategy.headline must be a real positioning angle — a thesis shape, a recommender pattern, a story type. Example GOOD: "Lead with the measurable impact of your social-enterprise project — show 6 months of traction, not aspirations." Example BAD: "Showcase your leadership and academic excellence."
- strategy.points each must be a CONCRETE TACTICAL MOVE specific to this student's file. Example GOOD: "Cite your 3.8 GPA + IELTS 7.5 in the eligibility paragraph; the typical admit lands 3.7+/7.0+ so you exceed both thresholds." Example BAD: "Write a compelling personal statement that highlights your strengths."
- strategy.avoid must name SPECIFIC failure patterns observed for this program type. Example GOOD: "Don't lead with your Goldman internship — the typical admit pool has 5+ similar profiles, it won't differentiate." Example BAD: "Don't be generic in your essays."
- match.breakdown must be specific. Example GOOD label/detail: "GPA threshold" / "Yours 3.7/4.0 vs required 3.5 — meets". Example BAD: "Academic profile" / "Your academic record is strong."

SCHEMA:
${SCHEMA_DOC}

${STRIP_FIELDS_NOTE}

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
    // Soft validation — match/strategy/odds are required; thirty_day was
    // intentionally retired (the prompt instructs the LLM to skip it),
    // so we MUST NOT require it here or every faithful response gets
    // rejected and we end up caching only outputs from LLMs that ignored
    // the strip-fields instruction. Also gate on the meaty sub-fields so
    // a degenerate `{strategy: {}}` doesn't sneak through.
    if (
      !parsed?.match?.breakdown?.length
      || !parsed?.strategy?.headline
      || !Array.isArray(parsed?.strategy?.points) || parsed.strategy.points.length === 0
      || !parsed?.odds?.typical_admit_profile
    ) {
      throw new Error("Schema mismatch: missing required sub-field");
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
