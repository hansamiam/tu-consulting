// scrape-source
//
// Crawls one scholarship source URL, extracts structured scholarship data
// via GPT-4o-mini, and lands rows in scholarships_staging. High-confidence
// extractions auto-publish to public.scholarships; low-confidence rows wait
// in /admin/queue for human review.
//
// Idempotent: a content_hash check on the fetched markdown means we skip
// the LLM entirely when a source page hasn't changed since last crawl.
//
// Service-role auth required — invoke via the cron dispatcher, never from
// the browser.
//
// Trigger manually with:
//   curl -X POST <fn-url>/functions/v1/scrape-source \
//     -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
//     -H "Content-Type: application/json" \
//     -d '{"source_id": "<uuid>"}'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { firecrawlScrape, FIRECRAWL_COST_PER_SCRAPE_USD } from "../_shared/firecrawl.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import {
  cleanScholarshipName,
  cleanProvider,
  cleanTargetFields,
  cleanHostCountry,
  cleanAwardText,
  cleanEligibleCountries,
  cleanCitizenshipRequirements,
  cleanTargetDemographics,
  extractDemographicsFromCitizenship,
  stripUserRelative,
  inferHostCountryFromNames,
  isKnownAnnualProgram,
} from "../_shared/scholarshipFields.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Auto-publish threshold. Above this, the extraction goes straight into
// scholarships and triggers an embedding refresh. Below, it sits in
// staging for an admin to approve in /admin/queue.
const AUTO_PUBLISH_THRESHOLD = 0.85;

// Rough cost per LLM extraction call. Pro tier (~$0.005) chosen over flash
// (~$0.0015) because: (a) extraction is stamped against accuracy gates that
// auto-publish at confidence ≥0.85, so higher-quality extraction directly
// translates to more rows skipping the staging queue; (b) content-hash
// short-circuits unchanged pages, so cost only fires on real content
// changes — across 130 sources and typical change rates that's ~30-40
// fresh extractions/day for ~$0.15/day. Trade-off favours quality.
const LLM_COST_PER_EXTRACTION_USD = 0.005;

// Cap on markdown length we pass to the LLM (avoid blowing context cost on
// huge listing pages — the first 30k chars almost always cover the visible
// scholarship body, and Firecrawl's onlyMainContent strips chrome already).
const MAX_MARKDOWN_CHARS = 30_000;

// ─── Types matching what the LLM returns ───────────────────────────────────
// Mirrors the `scholarships` table columns. Keep in sync.
type Tier = "very_high" | "high" | "medium" | "low" | "unknown";

interface ExtractedScholarship {
  scholarship_name: string;
  provider_name: string;
  host_country: string;
  official_url: string;
  coverage_type: "full_ride" | "partial" | "tuition_only" | "stipend" | "other";
  award_amount_text?: string;
  estimated_total_value_usd?: number | null;
  duration_text?: string;
  renewable?: boolean | null;
  award_type?: string[];
  target_degree_level?: string[];
  target_fields?: string[];
  target_demographics?: string[];
  min_gpa?: number | null;
  gpa_scale?: number | null;
  min_ielts?: number | null;
  min_toefl?: number | null;
  language_requirements?: string;
  citizenship_requirements?: string;
  eligible_countries?: string[];
  age_limit?: number | null;
  financial_need_required?: boolean | null;
  leadership_required?: boolean | null;
  extracurricular_required?: boolean | null;
  deadline_type?: "rolling" | "annual" | "one-time" | "unknown";
  application_deadline?: string | null; // ISO YYYY-MM-DD
  essay_required?: boolean | null;
  recommendation_letters_required?: number | null;
  interview_required?: boolean | null;
  selectivity_level?: Tier;
  effort_level?: Tier;
  ideal_candidate_profile?: string;
  weak_candidate_warning?: string;
  best_for_tags?: string[];
  why_this_fits?: string;
  how_to_win?: string;
  what_to_prepare_first?: string;
  next_step?: string;
  risk_note?: string;
  eligibility_requirements?: string;
  confidence: number;
  notes?: string;
}

interface LLMExtractionResponse {
  scholarships: ExtractedScholarship[];
}

// ─── LLM prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert scholarship database researcher for international and immigrant students applying to top universities worldwide. Your job is to extract STRUCTURED scholarship data from web page content.

Strict rules:
- Return ONLY valid JSON matching the requested schema. No prose, no markdown fences.
- If the page describes ONE scholarship program, return one entry.
- If the page lists MULTIPLE distinct programs (e.g., DAAD's hub page), return one entry per program — but only if the page itself contains enough detail to fill the required fields. Do not fabricate.
- If the page is a navigational/index page with no actual scholarship details visible, return {"scholarships":[]}.
- NEVER hallucinate amounts, deadlines, or eligibility. If uncertain, omit the field — do not guess.
- Set confidence per scholarship: 0.95+ when most fields are present and verifiable from the text; 0.85+ when core fields (name/provider/country/coverage/eligibility) are clear; 0.7 when partial; <0.7 when extracted from very thin signals.

INCLUSION SCOPE (decide whether to extract a scholarship at all):
- INCLUDE if the program is open to international applicants worldwide, OR explicitly targets immigrants / refugees / displaced students / first-generation students / heritage-community students. This means US-based scholarships specifically for Korean American, Latino/Hispanic, Vietnamese American, Asian American Pacific Islander, African American immigrant, Caribbean diaspora, Middle Eastern American, etc. communities ARE in scope — those students fit our audience.
- INCLUDE if the program targets refugees, asylum seekers, DACA recipients, undocumented students, dreamers, or any cross-border identity.
- EXCLUDE if the program is restricted purely to US citizens / US permanent residents with NO immigrant-identity / heritage / international-applicant pathway. Generic "US high school seniors", "Texas residents", "Boy Scouts of Tennessee" = exclude. These don't serve our audience.
- EXCLUDE the same way for any country-domestic-only scholarship with no immigrant pathway (e.g., a Canadian scholarship purely for Canadian-born citizens).
- When uncertain, LEAN INCLUDE if the program text mentions immigrant identity, country-of-origin heritage, refugee status, or international background as eligibility — those students need this product even if the program is hosted in a single country.

Field semantics:
- coverage_type: "full_ride" = tuition + stipend + travel. "partial" = some funding. "tuition_only" = waiver. "stipend" = monthly allowance only. "other" = anything else.
- target_degree_level: subset of ["bachelor","master","phd","postdoc"]
- eligible_countries: ISO country names. Empty array means "open globally".
- application_deadline: ISO YYYY-MM-DD if a specific date; omit if rolling or unknown.
- deadline_type: DEFAULT to "annual" — almost every fellowship/scholarship runs on a yearly cycle even when this year's date isn't visible on the page. Use "rolling" ONLY when the page explicitly says continuous / no deadline / accepted year-round. Use "one-time" only for a clearly one-shot opportunity (e.g. a 75th-anniversary grant). Use "unknown" only when there's truly no signal. Misclassifying annual programs as "rolling" hides real deadlines from the student.
- ideal_candidate_profile: 1-2 sentences describing who has the best shot.
- weak_candidate_warning: 1 sentence on common red flags / who shouldn't apply.
- best_for_tags: short tags like ["public-policy","developing-countries","mid-career"]
- selectivity_level: "very_high" = <2% acceptance (Rhodes/Schwarzman), "high" = 2-10%, "medium" = 10-30%, "low" = >30%, "unknown" otherwise.
- effort_level: how much work the application takes — essays, recommendations, interviews.

Field hygiene (NON-NEGOTIABLE — these are the rules generic LLMs break):
- scholarship_name: the program's own name ONLY. NEVER append site branding. If the page title is "Schwarzman Scholars | Tsinghua University - Apply Now", the value is "Schwarzman Scholars". Strip every "- Apply", "- Bulletin", "- Home", "- Sign Up", "- Study in X", "| University Name", "(Apply)", and similar suffix.
- provider_name: the institution that funds the scholarship. Use the canonical short form ("MIT" not "The Trustees of the Massachusetts Institute of Technology"; "Stanford University" not "The Board of Trustees of the Leland Stanford Junior University"). Strip "The Trustees of...", "The Board of...", "The Office of...", "The Council of..." prefixes. NEVER write "Various", "Multiple", "Several", "TBD", "N/A" — if you can't pin a single institution down, OMIT the field.
- target_fields: an ARRAY where each entry is exactly ONE field. ["Computer Science", "Engineering"], not ["Computer Science, Engineering"]. Don't comma-list inside one entry.
- award_amount_text: a single concise phrase ("Full tuition + $35,000 stipend") — under 80 chars when possible. Drop trailing parentheticals that don't add unique numerical info ("(renewable upon satisfactory progress)" is junk; "($30,000/year × 4)" is fine).
- host_country: a SINGLE country name. If the program is genuinely multi-country, use exactly "Multiple countries" — never "Multiple (Korea, Japan, etc.)" or "Various (primarily Africa)".
- target_demographics: array of canonical tags from this CONSTRAINED SET ONLY (free text gets rejected): "women", "men", "lgbtq", "first-generation", "low-income", "refugee", "displaced", "indigenous", "underrepresented-stem", "underrepresented-minority", "disability", "military-veteran", "rural", "mature-student". Add a tag ONLY when the program text EXPLICITLY restricts to or specifically targets that group. Do NOT add tags as a vibe — a "leadership" scholarship that mentions women in passing is NOT "women"-targeted. citizenship_requirements is for COUNTRY of citizenship; demographic constraints (gender / identity / income / refugee status) belong here, not there.

Official URL extraction (DATA QUALITY GATE — get this wrong and we publish links to aggregator sites instead of apply pages):
- official_url MUST be the page where students actually apply or read the program's authoritative description — typically the program's own .gov / .edu / foundation site.
- If the page you're reading IS that authoritative page (Source category = "official"), the source URL itself is fine.
- If the page you're reading is an aggregator listing (Source category = "aggregator", or the URL is at scholarshipportal.com / opportunitydesk.org / etc.), DO NOT use the source URL — extract the actual apply URL from the page content (usually a "Visit official page" / "Apply here" link). If no such URL is in the page content, OMIT the field — better an empty official_url than an aggregator link presented as official.

Set confidence honestly. Better to flag low-confidence than to publish noise.`;

const USER_PROMPT_TEMPLATE = (sourceName: string, sourceUrl: string, sourceCategory: string | null, hint: string | null, markdown: string) => `
Source name: ${sourceName}
Source URL: ${sourceUrl}
Source category: ${sourceCategory || "(unknown)"}
Source hint (parser guidance from admin): ${hint || "(none)"}

Page content (markdown, may be truncated):
---
${markdown}
---

Extract every scholarship program described on this page. Return strictly:
{
  "scholarships": [
    {
      "scholarship_name": "...",
      "provider_name": "...",
      "host_country": "...",
      "official_url": "<the apply URL — see rules below>",
      "coverage_type": "full_ride|partial|tuition_only|stipend|other",
      "award_amount_text": "...",
      "estimated_total_value_usd": 50000,
      "duration_text": "...",
      "target_degree_level": ["master","phd"],
      "target_fields": ["..."],
      "target_demographics": ["women","first-generation"],
      "min_gpa": 3.5, "gpa_scale": 4.0,
      "min_ielts": 7.0, "min_toefl": 100,
      "citizenship_requirements": "...",
      "eligible_countries": ["..."],
      "deadline_type": "annual",
      "application_deadline": "2026-11-05",
      "essay_required": true,
      "recommendation_letters_required": 2,
      "interview_required": true,
      "selectivity_level": "very_high",
      "effort_level": "high",
      "ideal_candidate_profile": "...",
      "weak_candidate_warning": "...",
      "best_for_tags": ["public-policy","leadership"],
      "why_this_fits": "...",
      "how_to_win": "...",
      "what_to_prepare_first": "...",
      "next_step": "Visit URL and start the personal statement draft.",
      "eligibility_requirements": "...",
      "confidence": 0.92,
      "notes": "..."
    }
  ]
}
`;

// ─── Helpers ───────────────────────────────────────────────────────────────

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Strip the JSON object out of an LLM response — handles ```json fences and stray prose. */
function extractJson(s: string): unknown {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : s).trim();
  // Try direct parse, else find the first { ... } block
  try { return JSON.parse(candidate); } catch { /* fall through */ }
  const m = candidate.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON object in LLM response");
  return JSON.parse(m[0]);
}

/** Validate a single LLM-returned scholarship; returns null if it fails the
 *  minimum bar. Also CLAMPS obvious nonsense in numeric fields — the LLM can
 *  hallucinate "estimated_total_value_usd: 100000000" or "min_gpa: 7.5 / 4.0"
 *  and we don't want garbage rows propagating into Discover. We clamp
 *  silently rather than reject the row entirely; the rest of the data is
 *  often still useful. */
// Reality bound for a single-recipient scholarship's lifetime value.
// Even Schwarzman / Knight-Hennessy / MIT-tier full rides top out at
// ~$400-600k over 2-4 years. Anything north of $2M is the LLM
// confusing endowment / total budget / aggregate fund with the
// per-recipient award. We REJECT (set to null) rather than clamp;
// clamping silently hid the issue while keeping the wrong-shape number.
const REASONABLE_VALUE_USD_MAX = 2_000_000;
const REASONABLE_VALUE_USD_MIN = 0;
const IELTS_BAND_MIN = 0;
const IELTS_BAND_MAX = 9;
const TOEFL_MIN = 0;
const TOEFL_MAX = 120;
const RECS_MAX = 10;

function clampNumeric(o: Record<string, unknown>): void {
  // Total value: reject negatives AND absurd highs (rather than
  // clamping). A clamped $80M → $2M still misleads the user; null
  // forces the display to fall back to the coverage label, which is
  // always meaningful.
  if (typeof o.estimated_total_value_usd === "number") {
    if (
      Number.isNaN(o.estimated_total_value_usd)
      || o.estimated_total_value_usd < REASONABLE_VALUE_USD_MIN
      || o.estimated_total_value_usd > REASONABLE_VALUE_USD_MAX
    ) {
      o.estimated_total_value_usd = null;
    }
  }
  // GPA must be ≤ scale. If gpa_scale is missing default to 4.0; if min_gpa
  // exceeds the scale, drop both — the LLM mis-extracted.
  const gpa = typeof o.min_gpa === "number" ? o.min_gpa : null;
  const scaleRaw = typeof o.gpa_scale === "number" ? o.gpa_scale : null;
  const scale = scaleRaw ?? 4.0;
  if (gpa !== null) {
    if (gpa < 0 || gpa > scale + 0.01) {
      o.min_gpa = null;
      o.gpa_scale = null;
    } else if (scaleRaw === null) {
      o.gpa_scale = 4.0;
    }
  }
  // IELTS in [0, 9].
  if (typeof o.min_ielts === "number") {
    if (o.min_ielts < IELTS_BAND_MIN || o.min_ielts > IELTS_BAND_MAX) o.min_ielts = null;
  }
  // TOEFL in [0, 120].
  if (typeof o.min_toefl === "number") {
    if (o.min_toefl < TOEFL_MIN || o.min_toefl > TOEFL_MAX) o.min_toefl = null;
  }
  // Recommendation letters in [0, 10].
  if (typeof o.recommendation_letters_required === "number") {
    if (o.recommendation_letters_required < 0 || o.recommendation_letters_required > RECS_MAX) {
      o.recommendation_letters_required = null;
    }
  }
  // age_limit in [0, 100].
  if (typeof o.age_limit === "number") {
    if (o.age_limit < 0 || o.age_limit > 100) o.age_limit = null;
  }
  // Application deadline must parse as a real date AND be within ±5 years
  // of today. Past that horizon it's almost always an LLM artifact.
  if (typeof o.application_deadline === "string") {
    const t = Date.parse(o.application_deadline);
    if (Number.isNaN(t)) {
      o.application_deadline = null;
    } else {
      const ageYears = Math.abs((t - Date.now()) / (365.25 * 86400_000));
      if (ageYears > 5) o.application_deadline = null;
    }
  }
}

function validateExtracted(x: unknown): ExtractedScholarship | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  // Required fields — without these we can't even fingerprint
  if (typeof o.scholarship_name !== "string" || !o.scholarship_name.trim()) return null;
  if (typeof o.provider_name !== "string" || !o.provider_name.trim()) return null;
  if (typeof o.host_country !== "string" || !o.host_country.trim()) return null;
  if (typeof o.confidence !== "number" || o.confidence < 0 || o.confidence > 1) return null;
  // coverage_type required for matching/ranking
  if (typeof o.coverage_type !== "string") return null;

  // Defensive cleanup — apply the same hygiene rules the SYSTEM_PROMPT
  // enforces so LLM slip-ups never reach the DB. The display layer also
  // cleans on render, but cleaning here means the canonical_key, dedup
  // hash, and embeddings all use the canonical form too.
  const cleanedName = cleanScholarshipName((o.scholarship_name as string));
  if (!cleanedName.trim()) return null;
  o.scholarship_name = cleanedName;

  const cleanedProvider = cleanProvider(o.provider_name as string);
  // Provider is required to fingerprint — if the LLM gave us a junk
  // value ("Various"), reject the row entirely. Better to lose one
  // unranked entry than to publish "Various Foundations" as a real
  // scholarship provider.
  if (!cleanedProvider) return null;
  o.provider_name = cleanedProvider;

  // host_country: try LLM-extracted value first; if blank, infer from
  // the program + provider name patterns. Many well-known scholarships
  // (Chevening, DAAD, Fulbright, MEXT, East-West Center) embed their
  // country in the name itself, but the LLM often omits the field
  // because the page body doesn't repeat it.
  let cleanedCountry = cleanHostCountry(o.host_country as string);
  if (!cleanedCountry) {
    const inferred = inferHostCountryFromNames(
      o.scholarship_name as string,
      o.provider_name as string,
    );
    if (inferred) cleanedCountry = inferred;
  }
  if (!cleanedCountry) return null;
  o.host_country = cleanedCountry;

  // deadline_type: LLMs lean toward "rolling" as a "I don't know" tag,
  // which falsely tags annual fellowships as continuous-intake. If the
  // program is one of the well-known annual cycles (Chevening, Rhodes,
  // Fulbright, DAAD, etc.) AND the LLM said "rolling" or omitted the
  // field, override to "annual". Avoids hiding real deadlines from
  // students. (The actual application_deadline date stays whatever the
  // LLM extracted — we're only correcting the cycle type.)
  const dt = (o.deadline_type as string | undefined) ?? null;
  if (dt === null || dt === "rolling" || dt === "unknown") {
    if (isKnownAnnualProgram(o.scholarship_name as string, o.provider_name as string)) {
      o.deadline_type = "annual";
    }
  }

  if (Array.isArray(o.target_fields)) {
    const cleaned = cleanTargetFields(o.target_fields);
    o.target_fields = cleaned.length > 0 ? cleaned : undefined;
  }

  if (Array.isArray(o.eligible_countries)) {
    const cleaned = cleanEligibleCountries(o.eligible_countries);
    o.eligible_countries = cleaned.length > 0 ? cleaned : undefined;
  }

  if (typeof o.award_amount_text === "string") {
    const cleaned = cleanAwardText(o.award_amount_text);
    o.award_amount_text = cleaned ?? undefined;
  }

  // Strip gender-only / category-only values that the LLM mistakenly
  // wrote into citizenship_requirements ("Women", "LGBTQ+", etc.).
  // BEFORE clearing, try to recover an implicit target_demographics tag
  // from the misclassified value so we don't silently lose the signal.
  if (typeof o.citizenship_requirements === "string") {
    const recovered = extractDemographicsFromCitizenship(o.citizenship_requirements);
    if (recovered) {
      const existing = Array.isArray(o.target_demographics) ? o.target_demographics as string[] : [];
      o.target_demographics = Array.from(new Set([...existing, recovered]));
    }
    const cleaned = cleanCitizenshipRequirements(o.citizenship_requirements);
    o.citizenship_requirements = cleaned ?? undefined;
  }

  // Coerce target_demographics to canonical tags (drop anything not in
  // the constrained set so the DB CHECK constraint doesn't reject the
  // whole insert).
  if (Array.isArray(o.target_demographics)) {
    const cleaned = cleanTargetDemographics(o.target_demographics);
    o.target_demographics = cleaned.length > 0 ? cleaned : undefined;
  }

  // Strip user-relative phrasing from soft fields rendered to all visitors.
  for (const f of ["why_this_fits", "how_to_win", "ideal_candidate_profile",
                   "what_to_prepare_first", "strategy_notes", "weak_candidate_warning"] as const) {
    const v = (o as Record<string, unknown>)[f];
    if (typeof v === "string") {
      const cleaned = stripUserRelative(v);
      (o as Record<string, unknown>)[f] = cleaned ?? undefined;
    }
  }

  // Drop / clamp numeric nonsense
  clampNumeric(o);
  return o as unknown as ExtractedScholarship;
}

/** Mirror of public.normalize_scholarship_key — the SQL function in the
 *  20260503050000 migration, updated by 20260505060000 to drop
 *  host_country from the dedup signature. The third arg is kept in
 *  the signature for caller backwards-compat but ignored — same as
 *  the SQL function.
 *  Keep the regex synced with the SQL. */
function normalizeKey(name: string, provider: string, _country: string): string {
  void _country;
  const concat = `${name}|${provider}`.toLowerCase();
  return concat
    // Strip English possessives ("master's" → "master") BEFORE suffix-words
    // so the trailing `s` doesn't survive the non-alnum cleanup.
    .replace(/'s\b/g, "")
    .replace(/\b(scholarships?|fellowships?|programmes?|programs?|awards?|scholars?|grants?|the|of)\b/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Build the embedding source_text the existing embed-scholarships worker expects. */
function buildEmbeddingSourceText(s: ExtractedScholarship): string {
  return [
    s.scholarship_name,
    s.provider_name,
    `Country: ${s.host_country}`,
    s.coverage_type ? `Coverage: ${s.coverage_type}` : "",
    s.award_amount_text ?? "",
    s.target_degree_level?.length ? `Levels: ${s.target_degree_level.join(", ")}` : "",
    s.target_fields?.length ? `Fields: ${s.target_fields.join(", ")}` : "",
    s.eligibility_requirements ?? "",
    s.ideal_candidate_profile ?? "",
    s.best_for_tags?.length ? `Best for: ${s.best_for_tags.join(", ")}` : "",
  ].filter(Boolean).join(" | ");
}

/** Diff existing scholarship row vs new extraction; return null if nothing meaningful changed. */
function diffScholarship(
  existing: Record<string, unknown>,
  next: ExtractedScholarship
): string | null {
  const watched: (keyof ExtractedScholarship)[] = [
    "application_deadline", "award_amount_text", "estimated_total_value_usd",
    "deadline_type", "min_gpa", "min_ielts", "min_toefl",
    "essay_required", "recommendation_letters_required", "interview_required",
    "coverage_type", "duration_text", "renewable",
  ];
  const changes: string[] = [];
  for (const k of watched) {
    const a = existing[k as string];
    const b = (next as Record<string, unknown>)[k];
    if (b === undefined || b === null) continue;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push(`${k}: ${JSON.stringify(a) ?? "null"} → ${JSON.stringify(b)}`);
    }
  }
  return changes.length ? changes.join("; ") : null;
}

// ─── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Supabase env not configured" });

  // Auth: cron (service role) or admin user only.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  let body: { source_id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON body" }); }
  if (!body.source_id) return json(400, { error: "source_id required" });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load source + claim it (set last_crawled_at = now so the dispatcher
  // doesn't double-fire on the same row if a run takes a while).
  const { data: src, error: srcErr } = await supa
    .from("scholarship_sources")
    .select("*")
    .eq("source_id", body.source_id)
    .maybeSingle();
  if (srcErr) return json(500, { error: `Load source: ${srcErr.message}` });
  if (!src) return json(404, { error: "Source not found" });
  if (!src.is_active) return json(200, { skipped: true, reason: "source inactive" });

  await supa.from("scholarship_sources")
    .update({ last_crawled_at: new Date().toISOString() })
    .eq("source_id", src.source_id);

  // Open a run row
  const { data: runRow } = await supa.from("scrape_runs")
    .insert({ source_id: src.source_id, status: "running" })
    .select("run_id")
    .single();
  const runId = runRow?.run_id;

  const startedAt = Date.now();
  const finalize = async (status: string, patch: Record<string, unknown>) => {
    if (!runId) return;
    await supa.from("scrape_runs").update({
      status,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      ...patch,
    }).eq("run_id", runId);
  };
  const logError = async (errClass: string, msg: string, ctx?: Record<string, unknown>, httpStatus?: number) => {
    await supa.from("scrape_errors").insert({
      source_id: src.source_id,
      run_id: runId,
      error_class: errClass,
      error_message: msg,
      http_status: httpStatus,
      context: ctx ?? null,
    });
  };
  const bumpFailure = async () => {
    await supa.from("scholarship_sources")
      .update({ consecutive_failures: (src.consecutive_failures ?? 0) + 1 })
      .eq("source_id", src.source_id);
  };

  // ─── Fetch ────────────────────────────────────────────────────────────────
  let pageMarkdown = "";
  try {
    const result = await firecrawlScrape({ url: src.url, onlyMainContent: true });
    pageMarkdown = result.markdown;
    if (!pageMarkdown.trim()) {
      await logError("fetch_failed", "Empty markdown returned");
      await bumpFailure();
      await finalize("failed", { error_message: "Empty markdown" });
      return json(200, { ok: false, reason: "empty markdown" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logError("fetch_failed", msg);
    await bumpFailure();
    await finalize("failed", { error_message: msg });
    return json(200, { ok: false, reason: "fetch failed", error: msg });
  }

  // ─── Content-hash short-circuit ──────────────────────────────────────────
  const contentHash = await sha256Hex(pageMarkdown);
  if (src.last_content_hash === contentHash) {
    await supa.from("scholarship_sources")
      .update({ last_success_at: new Date().toISOString(), consecutive_failures: 0 })
      .eq("source_id", src.source_id);
    await finalize("content_unchanged", {
      cost_estimate_usd: FIRECRAWL_COST_PER_SCRAPE_USD,
    });
    return json(200, { ok: true, status: "content_unchanged" });
  }

  // ─── LLM extraction ──────────────────────────────────────────────────────
  const truncated = pageMarkdown.slice(0, MAX_MARKDOWN_CHARS);
  let extracted: ExtractedScholarship[] = [];
  try {
    const resp = await chatCompletions({
      // Pro tier — see LLM_COST_PER_EXTRACTION_USD comment. Higher
      // extraction fidelity → more rows clear the 0.85 confidence gate
      // for auto-publish, fewer rows pile up in staging. Auto-published
      // rows feed the verified database directly; staged rows wait for
      // admin review. The cost diff is paid once per content-changed
      // crawl, not per request — content-hash short-circuit makes the
      // amortized cost negligible at steady state.
      tier: "pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT_TEMPLATE(src.name, src.url, src.category, src.parser_hint, truncated) },
      ],
    });
    if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content as string | undefined;
    if (!text) throw new Error("LLM returned empty content");
    const parsed = extractJson(text) as LLMExtractionResponse;
    const candidates = Array.isArray(parsed?.scholarships) ? parsed.scholarships : [];
    extracted = candidates.map(validateExtracted).filter((x): x is ExtractedScholarship => !!x);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logError("llm_failed", msg);
    await bumpFailure();
    await finalize("failed", { error_message: msg });
    return json(200, { ok: false, reason: "LLM extraction failed", error: msg });
  }

  if (extracted.length === 0) {
    // Page had no scholarships (or LLM said "[]"). Still a valid run — record success.
    await supa.from("scholarship_sources").update({
      last_success_at: new Date().toISOString(),
      last_content_hash: contentHash,
      consecutive_failures: 0,
    }).eq("source_id", src.source_id);
    await finalize("success", {
      scholarships_found: 0,
      cost_estimate_usd: FIRECRAWL_COST_PER_SCRAPE_USD + LLM_COST_PER_EXTRACTION_USD,
    });
    return json(200, { ok: true, found: 0 });
  }

  // ─── Intra-run dedup ──────────────────────────────────────────────────
  // Some listing pages confuse the LLM into emitting the same program twice.
  // Collapse on canonical key, keeping the highest-confidence variant.
  const intraRunSeen = new Map<string, ExtractedScholarship>();
  for (const s of extracted) {
    const key = normalizeKey(s.scholarship_name, s.provider_name, s.host_country);
    const prior = intraRunSeen.get(key);
    if (!prior || s.confidence > prior.confidence) intraRunSeen.set(key, s);
  }
  const intraRunDedup = Array.from(intraRunSeen.values());
  if (intraRunDedup.length < extracted.length) {
    console.log(`[scrape-source] intra-run dedup: ${extracted.length} → ${intraRunDedup.length}`);
  }

  // ─── Per-scholarship: dedup + diff + stage / publish ─────────────────────
  let newCount = 0, updatedCount = 0, autoPublished = 0, needsReview = 0;

  for (const s of intraRunDedup) {
    const fingerprint = await sha256Hex(
      `${s.scholarship_name.toLowerCase().trim()}|${s.provider_name.toLowerCase().trim()}|${s.host_country.toLowerCase().trim()}`
    );

    // Fuzzy dedup against the existing DB via canonical_key — handles
    // common name drift ("Chevening Scholarships" vs "Chevening Scholarship
    // 2026") that exact-match would treat as separate rows. Falls back to
    // the strict name+provider lookup if canonical_key isn't populated yet
    // (defensive: pre-migration data, fresh deploy lag).
    const ck = normalizeKey(s.scholarship_name, s.provider_name, s.host_country);
    const SCHOLARSHIP_COLS =
      "scholarship_id, scholarship_name, provider_name, application_deadline, award_amount_text, estimated_total_value_usd, deadline_type, min_gpa, min_ielts, min_toefl, essay_required, recommendation_letters_required, interview_required, coverage_type, duration_text, renewable";

    let existing: Record<string, unknown> | null = null;
    if (ck) {
      const { data } = await supa
        .from("scholarships")
        .select(SCHOLARSHIP_COLS)
        .eq("canonical_key", ck)
        .order("last_verified_date", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      existing = data ?? null;
    }
    if (!existing) {
      // Fallback to exact match on name+provider — covers pre-migration
      // rows where canonical_key is NULL.
      const { data } = await supa
        .from("scholarships")
        .select(SCHOLARSHIP_COLS)
        .eq("scholarship_name", s.scholarship_name)
        .eq("provider_name", s.provider_name)
        .maybeSingle();
      existing = data ?? null;
    }

    const existingId: string | null = (existing?.scholarship_id as string) ?? null;
    const diffSummary = existing ? diffScholarship(existing, s) : null;
    // Skip the noise: existing match with no changes → nothing to do
    if (existing && !diffSummary) continue;

    const isAutoPublish = s.confidence >= AUTO_PUBLISH_THRESHOLD;
    const stagingStatus = isAutoPublish ? "auto_published" : "pending";

    // Resolve fingerprint conflict on the partial-unique index (pending only)
    // by superseding the existing pending row before inserting.
    if (!isAutoPublish) {
      await supa.from("scholarships_staging")
        .update({ status: "superseded" })
        .eq("fingerprint", fingerprint)
        .eq("status", "pending");
    }

    await supa.from("scholarships_staging").insert({
      source_id: src.source_id,
      run_id: runId,
      scholarship_id: existingId,
      fingerprint,
      raw_text: truncated.slice(0, 2000),
      parsed_data: s as unknown as Record<string, unknown>,
      confidence: s.confidence,
      diff_summary: diffSummary,
      status: stagingStatus,
    });

    if (isAutoPublish) {
      autoPublished++;
      // Official URL fallback: only fall back to src.url when the source
      // is the official program page itself. For aggregator sources
      // (scholarshipportal.com, opportunitydesk.org, etc.) the source URL
      // is a third-party listing — publishing it as the official URL
      // misrepresents it and can mislead students. The DB trigger
      // is_aggregator_url() also flags it, but better to never publish
      // it as official in the first place. Null here is fine —
      // verification cron will pick it up and the UI shows a "no
      // official link yet" state instead of a misleading link.
      const isAggregatorSource = src.category === "aggregator";
      const fallbackOfficial = isAggregatorSource ? null : src.url;
      const upsertPayload: Record<string, unknown> = {
        scholarship_name:                s.scholarship_name,
        provider_name:                   s.provider_name,
        host_country:                    s.host_country,
        official_url:                    s.official_url || fallbackOfficial,
        coverage_type:                   s.coverage_type,
        award_amount_text:               s.award_amount_text ?? null,
        estimated_total_value_usd:       s.estimated_total_value_usd ?? null,
        duration_text:                   s.duration_text ?? null,
        renewable:                       s.renewable ?? null,
        award_type:                      s.award_type ?? null,
        target_degree_level:             s.target_degree_level ?? null,
        target_fields:                   s.target_fields ?? null,
        min_gpa:                         s.min_gpa ?? null,
        gpa_scale:                       s.gpa_scale ?? null,
        min_ielts:                       s.min_ielts ?? null,
        min_toefl:                       s.min_toefl ?? null,
        language_requirements:           s.language_requirements ?? null,
        citizenship_requirements:        s.citizenship_requirements ?? null,
        eligible_countries:              s.eligible_countries ?? null,
        age_limit:                       s.age_limit ?? null,
        financial_need_required:         s.financial_need_required ?? null,
        leadership_required:             s.leadership_required ?? null,
        extracurricular_required:        s.extracurricular_required ?? null,
        deadline_type:                   s.deadline_type ?? null,
        application_deadline:            s.application_deadline ?? null,
        essay_required:                  s.essay_required ?? null,
        recommendation_letters_required: s.recommendation_letters_required ?? null,
        interview_required:              s.interview_required ?? null,
        selectivity_level:               s.selectivity_level ?? null,
        effort_level:                    s.effort_level ?? null,
        ideal_candidate_profile:         s.ideal_candidate_profile ?? null,
        weak_candidate_warning:          s.weak_candidate_warning ?? null,
        best_for_tags:                   s.best_for_tags ?? null,
        target_demographics:             (s as any).target_demographics ?? null,
        why_this_fits:                   s.why_this_fits ?? null,
        how_to_win:                      s.how_to_win ?? null,
        what_to_prepare_first:           s.what_to_prepare_first ?? null,
        next_step:                       s.next_step ?? null,
        risk_note:                       s.risk_note ?? null,
        eligibility_requirements:        s.eligibility_requirements ?? null,
        verified:                        false,
        last_verified_date:              new Date().toISOString().slice(0, 10),
        // First-class verification metadata (see DATA_PIPELINE_AUDIT.md):
        // source_url is the page we extracted FROM (may differ from the
        // scholarship's apply-here URL); last_verified_at is timestamp-
        // precision so the URL-health cron can update it without losing
        // time-of-day info; verification_status starts at 'pending' until
        // a human marks it 'verified' (or the auto-verify cron upgrades it).
        source_url:                      src.url,
        last_verified_at:                new Date().toISOString(),
        verification_status:             "pending",
        // Embedding: clear so embed-scholarships re-embeds on next cron tick
        embedding:                       null,
        embedding_source_text:           buildEmbeddingSourceText(s),
        embedded_at:                     null,
      };

      if (existingId) {
        updatedCount++;
        await supa.from("scholarships").update(upsertPayload).eq("scholarship_id", existingId);
      } else {
        // The 20260505060000 migration added a UNIQUE index on canonical_key.
        // Use upsert with onConflict so concurrent scrapes that race past our
        // SELECT-then-INSERT don't blow up on the constraint. The trigger
        // computes canonical_key on insert, so we don't need to pass it.
        const { error: insertErr } = await supa
          .from("scholarships")
          .upsert(upsertPayload, { onConflict: "canonical_key", ignoreDuplicates: false });
        if (insertErr) {
          console.warn("[scrape-source] insert/upsert failed", insertErr.message, "name=", s.scholarship_name);
          continue;
        }
        newCount++;
      }
    } else {
      needsReview++;
    }
  }

  // ─── Persist source success state ────────────────────────────────────────
  await supa.from("scholarship_sources").update({
    last_success_at: new Date().toISOString(),
    last_content_hash: contentHash,
    consecutive_failures: 0,
  }).eq("source_id", src.source_id);

  await finalize("success", {
    // We persist the post-intra-dedup count so admin metrics reflect
    // unique scholarships landed, not raw LLM emissions.
    scholarships_found: intraRunDedup.length,
    scholarships_new: newCount,
    scholarships_updated: updatedCount,
    auto_published: autoPublished,
    needs_review: needsReview,
    cost_estimate_usd: FIRECRAWL_COST_PER_SCRAPE_USD + LLM_COST_PER_EXTRACTION_USD,
  });

  return json(200, {
    ok: true,
    found: intraRunDedup.length,
    raw_extracted: extracted.length,
    new: newCount,
    updated: updatedCount,
    auto_published: autoPublished,
    needs_review: needsReview,
  });
});
