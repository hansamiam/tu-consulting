// scholarship-deep-dive (v6 — dual-card insight)
//
// Membership-gated per-scholarship insight, two stacked cards:
//
//   B1 — "How to win this scholarship"
//        Always renders for paying members. Cached per (scholarship ×
//        nationality_bucket). Standard tier grounds the LLM in Path A
//        backfilled strategy fields + a live Firecrawl of the official
//        URL. Premium tier (hand-curated list in scholarship-premium-
//        tier.ts) additionally grounds in 2-3 Tavily search results.
//
//   B2 — "Why this fits you"
//        Renders only if the member has a meaningful profile. Cached per
//        (scholarship × profile_hash). Grounds in Path A fields + the
//        student's intake. No web grounding (the student-anchored layer
//        is about their specifics, not about more facts).
//
// Output format LOCKED: { the_read: string, bullets: string[] (3-4),
// sources_used: string[] }. Cousin-voice punchline + scan-density.
//
// Accuracy is the #1 ship-blocking constraint: every concrete claim
// must come from passed-in context. Hedge with "likely" / "often" /
// "worth confirming" when source-uncertain. Post-gen scanBannedVocab
// runs cultural-context-aware; on hit, retry once then fall back to
// Path A-derived copy.
//
// Fail mode: never empty modal. On any failure, return a fallback
// card derived from the scholarship row's Path A fields with a
// banner cue rendered by the frontend modal.

import { chatCompletions } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";
import {
  EDITORIAL_RULES_TIGHT,
  resolveCulturalContext,
  scanBannedVocab,
} from "../_shared/editorial-rules.ts";
import { firecrawlScrape } from "../_shared/firecrawl.ts";
import {
  cleanScholarshipName,
  cleanProvider,
  cleanHostCountry,
  cleanAwardText,
} from "../_shared/scholarshipFields.ts";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";
import { extractLlmJson } from "../_shared/llm-json.ts";
import { bucketFor, type NationalityBucket } from "../_shared/nationality-bucket.ts";
import { isPremium } from "../_shared/scholarship-premium-tier.ts";
import type { Json } from "../_shared/database.types.ts";

const SCHEMA_VERSION = 6;
const STANDARD_COST_USD = 0.0018;
const PREMIUM_COST_USD = 0.006;
const CACHE_TTL_DAYS = 90;
const FIRECRAWL_TIMEOUT_MS = 8_000;
const TAVILY_TIMEOUT_MS = 6_000;
const MAX_BULLETS = 4;
const MIN_BULLETS = 3;
const THE_READ_MAX = 220;
const BULLET_MAX = 180;

const B1_PROFILE_HASH_SENTINEL = "b1-generic";
const B2_NATIONALITY_BUCKET_SENTINEL: NationalityBucket = "all";

type CardType = "how_to_win" | "why_fits";

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
  archetype?: string | null;
}

interface ReqBody {
  scholarshipId: string;
  card?: "how_to_win" | "why_fits" | "both";
  nationality?: string;
  profile?: InboundProfile;
  language?: "en" | "ru";
}

interface CardOutput {
  the_read: string;
  bullets: string[];
  sources_used: string[];
  _cached?: boolean;
  _generated_at?: string;
  _tier?: "standard" | "premium";
  _fallback?: boolean;
}

interface DeepDiveResponse {
  how_to_win?: CardOutput;
  why_fits?: CardOutput | null;
}

interface ScholarshipRow {
  scholarship_id: string;
  scholarship_name: string | null;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string | null;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  application_deadline: string | null;
  deadline_type: string | null;
  min_gpa: number | null;
  gpa_scale: number | null;
  min_ielts: number | null;
  min_toefl: number | null;
  min_sat: number | null;
  citizenship_requirements: string | null;
  eligible_countries: string[] | null;
  eligibility_requirements: string | null;
  target_demographics: string[] | null;
  partner_universities: string[] | null;
  selectivity_level: string | null;
  effort_level: string | null;
  ideal_candidate_profile: string | null;
  weak_candidate_warning: string | null;
  why_this_fits: string | null;
  how_to_win: string | null;
  what_to_prepare_first: string | null;
  essay_required: boolean | null;
  recommendation_letters_required: number | null;
  interview_required: boolean | null;
  strategy_notes: string | null;
  common_rejection_reasons: string | null;
  risk_note: string | null;
  official_url: string | null;
  confidence: number | null;
  data_completeness_score: number | null;
  updated_at: string | null;
}

const SCHOLARSHIP_SELECT_COLUMNS = `
  scholarship_id, scholarship_name, provider_name, host_country, coverage_type,
  award_amount_text, estimated_total_value_usd, target_degree_level, target_fields,
  application_deadline, deadline_type, min_gpa, gpa_scale, min_ielts, min_toefl, min_sat,
  citizenship_requirements, eligible_countries, eligibility_requirements,
  target_demographics, partner_universities, selectivity_level, effort_level,
  ideal_candidate_profile, weak_candidate_warning, why_this_fits, how_to_win,
  what_to_prepare_first, essay_required, recommendation_letters_required,
  interview_required, strategy_notes, common_rejection_reasons, risk_note,
  official_url, confidence, data_completeness_score, updated_at
`;

const json = (status: number, body: unknown) => respondJson(status, body, corsHeaders);

/* ─── Helpers ────────────────────────────────────────────────────────── */

async function computeProfileHash(p: InboundProfile): Promise<string> {
  const canonical = JSON.stringify({
    nationality: (p.nationality || "").toLowerCase().trim(),
    major: ((p.major || p.field) || "").toLowerCase().trim(),
    grade: (p.gradeLevel || "").toLowerCase().trim(),
    targets: (p.targetCountries || []).map((c) => c.toLowerCase().trim()).sort().join(","),
    gpa: p.gpa ? String(p.gpa).trim() : "",
    gpaScale: p.gpaScale ? String(p.gpaScale).trim() : "",
    ielts: p.ielts ? String(p.ielts).trim() : "",
    toefl: p.toefl ? String(p.toefl).trim() : "",
    sat: p.sat ? String(p.sat).trim() : "",
    archetype: (p.archetype || "").toLowerCase().trim(),
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function isMeaningfulProfile(p?: InboundProfile): boolean {
  if (!p) return false;
  const hasIdentity = !!(p.nationality || p.major || p.field || p.gradeLevel);
  const hasNumbers = !!(p.gpa || p.ielts || p.toefl || p.sat);
  const hasTargets = !!(p.targetCountries && p.targetCountries.length > 0);
  return hasIdentity || hasNumbers || hasTargets;
}

async function fetchOfficialPageText(url: string | null): Promise<string> {
  if (!url) return "";
  try {
    const r = await firecrawlScrape({
      url,
      onlyMainContent: true,
      timeout: FIRECRAWL_TIMEOUT_MS,
    });
    return (r.markdown ?? "").slice(0, 6_000);
  } catch (e) {
    console.warn("[deep-dive] firecrawl failed", url, (e as Error).message);
    return "";
  }
}

interface TavilyResult {
  url: string;
  title: string;
  content: string;
}

async function fetchTavilyArticles(query: string): Promise<TavilyResult[]> {
  const apiKey = Deno.env.get("TAVILY_API_KEY");
  if (!apiKey) {
    console.warn("[deep-dive] TAVILY_API_KEY not set — falling back to standard tier");
    return [];
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TAVILY_TIMEOUT_MS);
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 3,
        include_answer: false,
        include_raw_content: false,
        exclude_domains: ["wikipedia.org", "scholarshipdb.net", "scholarship-positions.com"],
      }),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      console.warn("[deep-dive] tavily HTTP", resp.status, (await resp.text()).slice(0, 200));
      return [];
    }
    const data = await resp.json();
    if (!Array.isArray(data?.results)) return [];
    return (data.results as Array<Record<string, unknown>>)
      .filter((r): r is { url: string; title: string; content: string } => {
        if (!r || typeof r !== "object") return false;
        return typeof r.url === "string" && typeof r.content === "string";
      })
      .slice(0, 3)
      .map((r) => ({ url: r.url, title: r.title ?? "", content: r.content.slice(0, 2_000) }));
  } catch (e) {
    console.warn("[deep-dive] tavily failed", (e as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function buildScholarshipContext(s: ScholarshipRow): string {
  const conf = typeof s.confidence === "number" ? s.confidence : null;
  const comp = typeof s.data_completeness_score === "number" ? s.data_completeness_score : null;
  const lowTrust = (conf !== null && conf < 0.75) || (comp !== null && comp < 6);
  const partners = Array.isArray(s.partner_universities) ? s.partner_universities : [];
  const audience = Array.isArray(s.target_demographics) ? s.target_demographics : [];
  const awardText = cleanAwardText(s.award_amount_text);

  return [
    `Name: ${cleanScholarshipName(s.scholarship_name ?? "") || s.scholarship_name || "—"}`,
    `Provider: ${cleanProvider(s.provider_name ?? "") ?? s.provider_name ?? "—"}`,
    `Host country: ${cleanHostCountry(s.host_country ?? "") ?? "—"}`,
    `Coverage: ${s.coverage_type ?? "—"}${awardText ? ` — ${awardText}` : ""}`,
    `Estimated total value: ${s.estimated_total_value_usd ? `$${s.estimated_total_value_usd}` : "unspecified"}`,
    `Levels: ${(s.target_degree_level || []).join(", ") || "any"}`,
    `Fields: ${(s.target_fields || []).join(", ") || "any"}`,
    `Deadline: ${s.application_deadline ?? "rolling/unknown"} (${s.deadline_type ?? "—"})`,
    `Min GPA: ${s.min_gpa ?? "—"}${s.gpa_scale ? ` / ${s.gpa_scale}` : ""}`,
    `Min IELTS / TOEFL / SAT: ${s.min_ielts ?? "—"} / ${s.min_toefl ?? "—"} / ${s.min_sat ?? "—"}`,
    `Citizenship: ${s.citizenship_requirements || "—"}`,
    `Eligible countries: ${(s.eligible_countries || []).join(", ") || "(open)"}`,
    `Audience tags (program restricts to / targets): ${audience.length > 0 ? audience.join(", ") : "(none)"}`,
    `Partner universities (top): ${partners.slice(0, 10).join(" · ") || "(none listed)"}`,
    `Essay required: ${s.essay_required ?? "unknown"} · Rec letters: ${s.recommendation_letters_required ?? "unknown"} · Interview: ${s.interview_required ?? "unknown"}`,
    `Selectivity: ${s.selectivity_level || "unknown"} · Effort: ${s.effort_level || "unknown"}`,
    `Source-row confidence: ${conf !== null ? conf.toFixed(2) : "?"} · completeness: ${comp ?? "?"}/12${lowTrust ? " — THIN ROW: caveat thresholds" : ""}`,
  ].join("\n");
}

function buildPathAContext(s: ScholarshipRow): string {
  return [
    `how_to_win: ${s.how_to_win ?? "(none)"}`,
    `common_rejection_reasons: ${s.common_rejection_reasons ?? "(none)"}`,
    `strategy_notes: ${s.strategy_notes ?? "(none)"}`,
    `risk_note: ${s.risk_note ?? "(none)"}`,
    `what_to_prepare_first: ${s.what_to_prepare_first ?? "(none)"}`,
    `weak_candidate_warning: ${s.weak_candidate_warning ?? "(none)"}`,
    `ideal_candidate_profile: ${s.ideal_candidate_profile ?? "(none)"}`,
    `eligibility_requirements: ${s.eligibility_requirements ?? "(none)"}`,
  ].join("\n");
}

function buildProfileContext(p: InboundProfile): string {
  const pf = (v: unknown, fallback = "(unspecified)"): string => {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s.length > 0 ? s : fallback;
  };
  return [
    `Nationality: ${pf(p.nationality)}`,
    `Field/major: ${pf(p.major || p.field)}`,
    `Grade level: ${pf(p.gradeLevel)}`,
    `Target countries: ${(p.targetCountries || []).filter(Boolean).join(", ") || "(unspecified)"}`,
    `GPA: ${pf(p.gpa, "—")}${p.gpaScale ? ` / ${pf(p.gpaScale, "")}` : ""}`,
    `IELTS / TOEFL / SAT: ${pf(p.ielts, "—")} / ${pf(p.toefl, "—")} / ${pf(p.sat, "—")}`,
    p.archetype ? `Archetype: ${p.archetype}` : "",
  ].filter(Boolean).join("\n");
}

// Bucket → representative full-name nationality for resolveCulturalContext.
// resolveCulturalContext only accepts full names (PR #72 removed the ISO-2
// path because intake stores names, not codes). The B1 generation flow
// only has the cache bucket — we pick a representative name to drive
// the cultural-context branch.
const BUCKET_REPRESENTATIVE: Record<NationalityBucket, string | null> = {
  central_asia: "Kazakhstan",
  mena: null,     // resolveCulturalContext doesn't have an MENA branch yet
  se_asia: null,
  us_latam: null,
  other: null,
  all: null,
};

function culturalNote(nationality?: string | null): string {
  const ctx = resolveCulturalContext(nationality);
  if (ctx === "central_asia") {
    return "Cultural lens: reader is from the CIS region. Never use 'pre-med' (not a CIS frame — locally-salient piles are IT/CS, engineering, finance/economics, IR). When framing first-to-go-abroad, use 'first to leave home' / 'first to step out' — NOT 'first-gen college' (school completion is high in CIS).";
  }
  return "Cultural lens: reader's cultural context is general / unmapped. Avoid US-coaching defaults.";
}

const OUTPUT_SHAPE_INSTRUCTION = `
OUTPUT FORMAT (LOCKED — output ONLY this JSON, no fences, no preamble):
{
  "the_read": "ONE cousin-voice sentence — the strategist's lead — at most ${THE_READ_MAX} characters",
  "bullets": ["${MIN_BULLETS}-${MAX_BULLETS} punchy supporting points, each at most ${BULLET_MAX} characters"],
  "sources_used": ["list of which CONTEXT blocks you actually drew from, e.g. 'official_url', 'how_to_win', 'tavily_result_1'"]
}
`.trim();

const ANTI_HALLUCINATION_RULES = `
ANTI-HALLUCINATION RULES (highest priority — accuracy beats polish):
- Every concrete claim (thresholds, deadlines, dollar amounts, quotas,
  exemptions, recommender counts, interview rounds, essay topics) MUST
  be present verbatim in the CONTEXT below.
- If a specific fact is not in CONTEXT, hedge: "likely", "often",
  "worth confirming on the official page". NEVER assert.
- Never invent program features, partnerships, or selection criteria.
- Never claim "X% acceptance rate" or any percentage unless that
  exact figure is in CONTEXT.
- If a thin-row caveat appears in CONTEXT, append "— worth confirming
  on the official page" to threshold claims.
`.trim();

function promptForB1(args: {
  scholarship: ScholarshipRow;
  pathA: string;
  bucket: NationalityBucket;
  officialText: string;
  tavilyResults: TavilyResult[];
  language: string;
  retryReason?: string;
}): string {
  const tavilyBlock = args.tavilyResults.length > 0
    ? `\n\nTHIRD-PARTY GUIDANCE (Tavily search — treat as ONE signal; always defer to the official page for facts):\n${
      args.tavilyResults.map((r, i) => `--- tavily_result_${i + 1}: ${r.url}\n${r.content}`).join("\n\n")
    }`
    : "";
  const officialBlock = args.officialText
    ? `\n\nOFFICIAL PAGE EXCERPT (Firecrawled live; canonical source for facts):\n${args.officialText}`
    : "\n\nOFFICIAL PAGE: unavailable (Firecrawl failed). Be especially conservative — hedge ALL thresholds and dates.";
  const retryHeader = args.retryReason
    ? `\n\nNOTE — RETRY: prior attempt contained banned vocabulary (${args.retryReason}). Re-draft WITHOUT those words. Plain English.`
    : "";
  const culturalLens = culturalNote(BUCKET_REPRESENTATIVE[args.bucket]);

  return `You are writing the "How to win this scholarship" insight card for a paying Top Uni member. The reader is an international student from the ${args.bucket.replace("_", " ")} region considering whether to spend 20+ hours on this application.

${culturalLens}

VOICE:
${EDITORIAL_RULES_TIGHT}

${ANTI_HALLUCINATION_RULES}

${OUTPUT_SHAPE_INSTRUCTION}

WHAT MAKES A GOOD CARD:
- the_read: ONE punchy lead — a strategist's read on what wins this
  scholarship specifically. Not generic ("write a strong essay").
  Specific ("STEM-olympiad placements read as harder signal than IELTS
  for this program").
- bullets: ${MIN_BULLETS}-${MAX_BULLETS} concrete moves OR concrete things to
  understand. Each bullet must teach something the reader couldn't
  guess. Cite specific thresholds, quotas, exemptions, or doc
  requirements ONLY when CONTEXT supports them. Suggestion mood,
  not bare imperatives.

Output language: ${args.language}.${retryHeader}

SCHOLARSHIP CONTEXT:
${buildScholarshipContext(args.scholarship)}

EXISTING PATH A STRATEGY FIELDS (curated summary — be sharper / more
concrete than these, do NOT repeat verbatim):
${args.pathA}${officialBlock}${tavilyBlock}

Now output ONLY the JSON. Begin with { and end with }.`;
}

function promptForB2(args: {
  scholarship: ScholarshipRow;
  pathA: string;
  profile: InboundProfile;
  language: string;
  retryReason?: string;
}): string {
  const retryHeader = args.retryReason
    ? `\n\nNOTE — RETRY: prior attempt contained banned vocabulary (${args.retryReason}). Re-draft WITHOUT those words. Plain English.`
    : "";

  return `You are writing the "Why this fits you" insight card for a SPECIFIC paying Top Uni member. They want to know whether this scholarship genuinely fits THEIR profile — not the average reader's profile.

${culturalNote(args.profile.nationality)}

VOICE:
${EDITORIAL_RULES_TIGHT}

${ANTI_HALLUCINATION_RULES}
ADDITIONAL — STUDENT FACTS:
- Every concrete claim about THE STUDENT must come from their INTAKE
  below. Never invent GPA, IELTS, country, major, year-of-study.
- Never combine a student field with a scholarship field to manufacture
  a fact. BAD: "Your IELTS 7.0 clears their 7.5 threshold" if the
  scholarship doesn't actually say 7.5 anywhere. GOOD: "Your IELTS 7.0
  matches what their published guidance leans toward."

${OUTPUT_SHAPE_INSTRUCTION}

WHAT MAKES A GOOD CARD:
- the_read: ONE cousin-voice sentence that PUTS THE STUDENT IN THE FIT
  PICTURE. Use their numbers or identity markers when present.
  Example GOOD: "Your Almaty-to-Budapest math-olympiad track is
  literally the arc this scholarship was built for."
  Example BAD: "This scholarship is a great match for your profile."
- bullets: ${MIN_BULLETS}-${MAX_BULLETS} specific anchors. Cite intake fields
  by exact value. Where SCHOLARSHIP CONTEXT supports a fit-claim
  (target degree level / country / field match), make it. Where it
  doesn't, say so honestly ("their published guidance doesn't list a
  GPA floor — yours is 8.7").

Output language: ${args.language}.${retryHeader}

STUDENT INTAKE:
${buildProfileContext(args.profile)}

SCHOLARSHIP CONTEXT:
${buildScholarshipContext(args.scholarship)}

EXISTING PATH A STRATEGY FIELDS (general curation — anchor, don't
repeat):
${args.pathA}

Now output ONLY the JSON. Begin with { and end with }.`;
}

function validateCardOutput(parsed: unknown): { the_read: string; bullets: string[]; sources_used: string[] } {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Parsed output is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const the_read = typeof obj.the_read === "string" ? obj.the_read.trim() : "";
  if (!the_read) throw new Error("Missing or empty the_read");
  if (the_read.length > THE_READ_MAX) {
    throw new Error(`the_read exceeds ${THE_READ_MAX} chars (${the_read.length})`);
  }
  const rawBullets = Array.isArray(obj.bullets) ? obj.bullets : [];
  const bullets = rawBullets
    .map((b) => (typeof b === "string" ? b.trim() : ""))
    .filter(Boolean);
  if (bullets.length < MIN_BULLETS) {
    throw new Error(`Too few bullets (${bullets.length} < ${MIN_BULLETS})`);
  }
  const trimmed = bullets.slice(0, MAX_BULLETS);
  for (const b of trimmed) {
    if (b.length > BULLET_MAX) {
      throw new Error(`Bullet exceeds ${BULLET_MAX} chars: "${b.slice(0, 60)}..."`);
    }
  }
  const rawSources = Array.isArray(obj.sources_used) ? obj.sources_used : [];
  const sources_used = rawSources
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return { the_read, bullets: trimmed, sources_used };
}

async function generateAndValidate(args: {
  prompt: string;
  tier: "flash" | "pro";
  culturalContext: string;
}): Promise<
  | { ok: true; card: { the_read: string; bullets: string[]; sources_used: string[] } }
  | { ok: false; reason: string; hits?: Array<{ match: string; label: string }> }
> {
  let raw = "";
  try {
    const resp = await chatCompletions({
      tier: args.tier,
      messages: [
        {
          role: "system",
          content:
            "You write supporting copy for the Top Uni scholarship Discover surface. Output ONLY the requested JSON shape — no markdown fences, no preamble. Every fact in your output must be present in the CONTEXT blocks. Hedge when uncertain; never invent.",
        },
        { role: "user", content: args.prompt },
      ],
      stream: false,
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { ok: false, reason: `gateway HTTP ${resp.status}: ${t.slice(0, 200)}` };
    }
    const data = await resp.json();
    raw =
      data?.choices?.[0]?.message?.content ??
      (Array.isArray(data?.content)
        ? data.content.map((c: { text?: string }) => c?.text ?? "").join("")
        : "") ??
      "";
    if (!raw) return { ok: false, reason: "empty completion" };
  } catch (e) {
    return { ok: false, reason: `network: ${(e as Error).message}` };
  }

  let parsed: unknown;
  try {
    parsed = extractLlmJson(raw);
  } catch (e) {
    return { ok: false, reason: `JSON parse: ${(e as Error).message}` };
  }

  let card;
  try {
    card = validateCardOutput(parsed);
  } catch (e) {
    return { ok: false, reason: `validation: ${(e as Error).message}` };
  }

  const combined = card.the_read + " " + card.bullets.join(" ");
  const hits = scanBannedVocab(combined, args.culturalContext);
  if (hits.length > 0) {
    return { ok: false, reason: "banned_vocab", hits };
  }
  return { ok: true, card };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function firstSentence(s: string): string {
  const m = s.match(/[^.!?]+[.!?]/);
  return (m ? m[0] : s).trim();
}

function deriveFallback(s: ScholarshipRow, card: CardType): CardOutput {
  const name = cleanScholarshipName(s.scholarship_name ?? "") || s.scholarship_name || "this scholarship";
  if (card === "how_to_win") {
    const seed = s.how_to_win || s.strategy_notes || s.ideal_candidate_profile;
    const the_read = seed
      ? truncate(`Here's the strategist's read on ${name}: ${firstSentence(seed)}`, THE_READ_MAX)
      : truncate(`Here's what we know about ${name} — the deeper take is still loading.`, THE_READ_MAX);
    const bullets = [
      s.how_to_win ? truncate(`How to win: ${oneLine(s.how_to_win)}`, BULLET_MAX) : "",
      s.strategy_notes ? truncate(`Strategist's note: ${oneLine(s.strategy_notes)}`, BULLET_MAX) : "",
      s.common_rejection_reasons ? truncate(`Common rejection patterns: ${oneLine(s.common_rejection_reasons)}`, BULLET_MAX) : "",
      s.risk_note ? truncate(`Honest risk: ${oneLine(s.risk_note)}`, BULLET_MAX) : "",
    ].filter(Boolean);
    return {
      the_read,
      bullets: bullets.length >= MIN_BULLETS ? bullets.slice(0, MAX_BULLETS) : padFallbackBullets(bullets, s),
      sources_used: ["path_a_fallback"],
      _fallback: true,
    };
  }
  return {
    the_read: truncate(`The personalized read on how ${name} fits you is still loading — refresh in a moment.`, THE_READ_MAX),
    bullets: [
      "We pull in your intake and the scholarship's official guidance to compose this.",
      "The strategist's general read above is independent of your profile and ready to use.",
      "Refresh the page in a few seconds — the personalized view caches after first generation.",
    ],
    sources_used: ["path_a_fallback"],
    _fallback: true,
  };
}

function padFallbackBullets(have: string[], s: ScholarshipRow): string[] {
  const result = [...have];
  const candidates = [
    s.what_to_prepare_first ? `Start with: ${oneLine(s.what_to_prepare_first)}` : "",
    s.weak_candidate_warning ? `Watch out for: ${oneLine(s.weak_candidate_warning)}` : "",
    s.eligibility_requirements ? `Eligibility shape: ${oneLine(s.eligibility_requirements)}` : "",
  ].filter(Boolean);
  while (result.length < MIN_BULLETS && candidates.length > 0) {
    result.push(truncate(candidates.shift() as string, BULLET_MAX));
  }
  if (result.length < MIN_BULLETS) {
    result.push("More details are on the scholarship's official page — the deeper take will load shortly.");
  }
  return result.slice(0, MAX_BULLETS);
}

/* ─── Membership check ──────────────────────────────────────────────── */

interface MembershipState {
  userId: string;
  tier: "free" | "pro" | "founding";
  isMember: boolean;
}

async function resolveMembership(req: Request): Promise<MembershipState | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const userClient = createUserClient(auth);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return null;
    const svc = createServiceClient();
    const { data: sub } = await svc
      .from("subscriptions")
      .select("tier, status")
      .eq("user_id", userId)
      .maybeSingle();
    const tier = (sub?.tier ?? "free") as "free" | "pro" | "founding";
    const status = sub?.status ?? "inactive";
    const isMember = (tier === "pro" || tier === "founding") && status === "active";
    return { userId, tier, isMember };
  } catch (e) {
    console.warn("[deep-dive] membership resolve failed", (e as Error).message);
    return null;
  }
}

/* ─── Cache helpers ─────────────────────────────────────────────────── */

interface CacheReadResult {
  card: CardOutput | null;
  stale: boolean;
}

async function readCache(
  supa: ReturnType<typeof createServiceClient>,
  args: {
    scholarshipId: string;
    cardType: CardType;
    nationalityBucket: NationalityBucket;
    profileHash: string;
    scholarshipUpdatedAt: string | null;
  },
): Promise<CacheReadResult> {
  // v6 columns aren't in the generated Database types yet (PR 1's
  // migration ships in this PR series). Cast through `any` on the
  // builder to allow the equality filters; runtime is correct.
  const builder = supa.from("scholarship_deep_dives").select(
    "content, schema_version, generated_at, expires_at",
  ) as unknown as {
    eq: (col: string, v: unknown) => typeof builder;
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
  };
  const { data } = await builder
    .eq("scholarship_id", args.scholarshipId)
    .eq("card_type", args.cardType)
    .eq("nationality_bucket", args.nationalityBucket)
    .eq("profile_hash", args.profileHash)
    .maybeSingle();
  if (!data || data.schema_version !== SCHEMA_VERSION) {
    return { card: null, stale: false };
  }
  const generatedAt = new Date(data.generated_at as string).getTime();
  const rowUpdated = args.scholarshipUpdatedAt ? new Date(args.scholarshipUpdatedAt).getTime() : 0;
  if (generatedAt < rowUpdated) return { card: null, stale: true };
  const expiresAt = data.expires_at ? new Date(data.expires_at as string).getTime() : Infinity;
  if (Date.now() > expiresAt) return { card: null, stale: true };
  return {
    card: {
      ...(data.content as unknown as CardOutput),
      _cached: true,
      _generated_at: data.generated_at as string,
    },
    stale: false,
  };
}

async function writeCache(
  supa: ReturnType<typeof createServiceClient>,
  args: {
    scholarshipId: string;
    cardType: CardType;
    nationalityBucket: NationalityBucket;
    profileHash: string;
    userId: string | null;
    card: { the_read: string; bullets: string[]; sources_used: string[] };
    tier: "standard" | "premium";
    cost: number;
    expiresAtOverride?: string;
    bannedHits?: Array<{ match: string; label: string }>;
    modelTag?: string;
  },
): Promise<void> {
  const expiresAt = args.expiresAtOverride
    ?? new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const row: Record<string, unknown> = {
    scholarship_id: args.scholarshipId,
    profile_hash: args.profileHash,
    user_id: args.userId,
    content: args.card as unknown as Json,
    schema_version: SCHEMA_VERSION,
    cost_estimate_usd: args.cost,
    model_tag: args.modelTag ?? Deno.env.get("AI_PROVIDER") ?? "lovable",
    card_type: args.cardType,
    nationality_bucket: args.nationalityBucket,
    tier: args.tier,
    banned_vocab_hits: args.bannedHits ? (args.bannedHits as unknown as Json) : null,
    expires_at: expiresAt,
  };
  const { error } = await (supa.from("scholarship_deep_dives") as unknown as {
    upsert: (r: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
  }).upsert(row, {
    onConflict: "scholarship_id,card_type,nationality_bucket,profile_hash",
  });
  if (error) {
    console.warn("[deep-dive] cache upsert failed", error.message);
  }
}

/* ─── Card orchestration ────────────────────────────────────────────── */

async function ensureCardB1(args: {
  supa: ReturnType<typeof createServiceClient>;
  scholarship: ScholarshipRow;
  bucket: NationalityBucket;
  language: string;
  userId: string | null;
}): Promise<CardOutput> {
  const { supa, scholarship, bucket, language, userId } = args;
  const cached = await readCache(supa, {
    scholarshipId: scholarship.scholarship_id,
    cardType: "how_to_win",
    nationalityBucket: bucket,
    profileHash: B1_PROFILE_HASH_SENTINEL,
    scholarshipUpdatedAt: scholarship.updated_at,
  });
  if (cached.card) return cached.card;

  const tier: "standard" | "premium" = isPremium(scholarship) ? "premium" : "standard";
  const [officialText, tavilyResults] = await Promise.all([
    fetchOfficialPageText(scholarship.official_url),
    tier === "premium"
      ? fetchTavilyArticles(
        `how to win ${cleanScholarshipName(scholarship.scholarship_name ?? "") || scholarship.scholarship_name || ""} scholarship application tips`,
      )
      : Promise.resolve([] as TavilyResult[]),
  ]);

  const pathA = buildPathAContext(scholarship);
  const culturalContext = resolveCulturalContext(BUCKET_REPRESENTATIVE[bucket]);

  const firstPrompt = promptForB1({
    scholarship,
    pathA,
    bucket,
    officialText,
    tavilyResults,
    language,
  });
  let result = await generateAndValidate({
    prompt: firstPrompt,
    tier: tier === "premium" ? "pro" : "flash",
    culturalContext,
  });

  if (!result.ok && result.reason === "banned_vocab" && result.hits) {
    const retryResult = await generateAndValidate({
      prompt: promptForB1({
        scholarship,
        pathA,
        bucket,
        officialText,
        tavilyResults,
        language,
        retryReason: result.hits.map((h) => h.match).join(", "),
      }),
      tier: tier === "premium" ? "pro" : "flash",
      culturalContext,
    });
    if (retryResult.ok) result = retryResult;
  }

  if (!result.ok) {
    console.warn("[deep-dive] B1 falling back:", result.reason);
    const fallback = deriveFallback(scholarship, "how_to_win");
    // 1-day TTL so the next click retries the LLM soon — but bounded.
    await writeCache(supa, {
      scholarshipId: scholarship.scholarship_id,
      cardType: "how_to_win",
      nationalityBucket: bucket,
      profileHash: B1_PROFILE_HASH_SENTINEL,
      userId,
      card: fallback,
      tier,
      cost: 0,
      expiresAtOverride: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      bannedHits: "hits" in result ? result.hits : undefined,
      modelTag: "fallback",
    });
    return { ...fallback, _tier: tier };
  }

  await writeCache(supa, {
    scholarshipId: scholarship.scholarship_id,
    cardType: "how_to_win",
    nationalityBucket: bucket,
    profileHash: B1_PROFILE_HASH_SENTINEL,
    userId,
    card: result.card,
    tier,
    cost: tier === "premium" ? PREMIUM_COST_USD : STANDARD_COST_USD,
  });
  return {
    ...result.card,
    _cached: false,
    _generated_at: new Date().toISOString(),
    _tier: tier,
  };
}

async function ensureCardB2(args: {
  supa: ReturnType<typeof createServiceClient>;
  scholarship: ScholarshipRow;
  profile: InboundProfile;
  profileHash: string;
  language: string;
  userId: string | null;
}): Promise<CardOutput> {
  const { supa, scholarship, profile, profileHash, language, userId } = args;
  const cached = await readCache(supa, {
    scholarshipId: scholarship.scholarship_id,
    cardType: "why_fits",
    nationalityBucket: B2_NATIONALITY_BUCKET_SENTINEL,
    profileHash,
    scholarshipUpdatedAt: scholarship.updated_at,
  });
  if (cached.card) return cached.card;

  const pathA = buildPathAContext(scholarship);
  const culturalContext = resolveCulturalContext(profile.nationality);

  let result = await generateAndValidate({
    prompt: promptForB2({ scholarship, pathA, profile, language }),
    tier: "flash",
    culturalContext,
  });

  if (!result.ok && result.reason === "banned_vocab" && result.hits) {
    const retryResult = await generateAndValidate({
      prompt: promptForB2({
        scholarship,
        pathA,
        profile,
        language,
        retryReason: result.hits.map((h) => h.match).join(", "),
      }),
      tier: "flash",
      culturalContext,
    });
    if (retryResult.ok) result = retryResult;
  }

  if (!result.ok) {
    console.warn("[deep-dive] B2 falling back:", result.reason);
    return { ...deriveFallback(scholarship, "why_fits"), _tier: "standard" };
  }

  await writeCache(supa, {
    scholarshipId: scholarship.scholarship_id,
    cardType: "why_fits",
    nationalityBucket: B2_NATIONALITY_BUCKET_SENTINEL,
    profileHash,
    userId,
    card: result.card,
    tier: "standard",
    cost: STANDARD_COST_USD,
  });
  return {
    ...result.card,
    _cached: false,
    _generated_at: new Date().toISOString(),
    _tier: "standard",
  };
}

/* ─── Main handler ──────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "POST only" });

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  if (!body.scholarshipId) {
    return json(400, { error: "scholarshipId required" });
  }

  // Auth + membership gate. v6 is members-only by spec.
  const membership = await resolveMembership(req);
  if (!membership) return json(401, { error: "Sign in to access deep-dive insights" });
  if (!membership.isMember) {
    return json(402, {
      error: "Membership required",
      needs_membership: true,
      tier: membership.tier,
    });
  }

  const supa = createServiceClient();

  // Rate limit per IP — bounds runaway loops even on paid accounts.
  const ip = clientIp(req);
  const rateLimitOk = await checkRateLimit(supa, { key: `deep-dive:${ip}`, perMinute: 20 });
  if (!rateLimitOk) {
    return json(429, { error: "Slow down — try again in a moment." });
  }

  const { data: scholarship, error: schErr } = await supa
    .from("scholarships")
    .select(SCHOLARSHIP_SELECT_COLUMNS)
    .eq("scholarship_id", body.scholarshipId)
    .maybeSingle();
  if (schErr || !scholarship) return json(404, { error: "Scholarship not found" });

  const cardMode = body.card ?? "both";
  const language = body.language === "ru" ? "Russian" : "English";
  const nationality = body.nationality ?? body.profile?.nationality ?? "";
  const bucket = bucketFor(nationality);
  const wantB1 = cardMode === "how_to_win" || cardMode === "both";
  const wantB2 = cardMode === "why_fits" || cardMode === "both";
  const hasProfile = isMeaningfulProfile(body.profile);
  const profileHash = hasProfile ? await computeProfileHash(body.profile!) : "";

  const response: DeepDiveResponse = {};
  const tasks: Array<Promise<void>> = [];

  if (wantB1) {
    tasks.push(
      ensureCardB1({
        supa,
        scholarship: scholarship as unknown as ScholarshipRow,
        bucket,
        language,
        userId: membership.userId,
      })
        .then((card) => { response.how_to_win = card; })
        .catch((e) => {
          console.error("[deep-dive] B1 uncaught", (e as Error).message);
          response.how_to_win = {
            ...deriveFallback(scholarship as unknown as ScholarshipRow, "how_to_win"),
            _tier: "standard",
          };
        }),
    );
  }
  if (wantB2) {
    if (!hasProfile) {
      response.why_fits = null;
    } else {
      tasks.push(
        ensureCardB2({
          supa,
          scholarship: scholarship as unknown as ScholarshipRow,
          profile: body.profile!,
          profileHash,
          language,
          userId: membership.userId,
        })
          .then((card) => { response.why_fits = card; })
          .catch((e) => {
            console.error("[deep-dive] B2 uncaught", (e as Error).message);
            response.why_fits = {
              ...deriveFallback(scholarship as unknown as ScholarshipRow, "why_fits"),
              _tier: "standard",
            };
          }),
      );
    }
  }

  await Promise.all(tasks);
  return json(200, response);
});
