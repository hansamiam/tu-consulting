// generate-scholarship-checklist
//
// Builds and caches a structured "what you need to apply" checklist per
// scholarship. Universal — same items for every applicant — so the cache
// is keyed on scholarship_id alone (no profile_hash). Cached forever
// until SCHEMA_VERSION bumps OR the scholarship's last_verified_date
// advances past the checklist's generated_at (the source data changed
// → regenerate).
//
// Cache hit returns instantly. Cache miss generates via flash-tier AI
// using the scholarship row's already-extracted fields as grounding so
// items reference real numbers (e.g. "IELTS 7.0 minimum (6.5 per band)"
// instead of a generic "submit IELTS").
//
// No-auth: this endpoint is read-mostly and idempotent. Anyone (anon or
// authed) can request a checklist for any public scholarship.

import { chatCompletions } from "../_shared/ai-gateway.ts";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import type { Json } from "../_shared/database.types.ts";

const SCHEMA_VERSION = 1;
const COST_ESTIMATE_USD = 0.0006;

interface ChecklistItem {
  id: string;                 // Stable slug — used by application_tracker.completed_checklist_ids
  category: "documents" | "tests" | "essays" | "recommendations" | "portal" | "logistics";
  title: string;              // The action sentence shown to the user
  detail?: string;            // Optional one-line clarification
  critical?: boolean;         // True = blocking; UI highlights uncritical items differently
  est_minutes?: number;       // Rough effort estimate
}

interface ReqBody {
  scholarshipId: string;
  /** Optional language override; defaults to English. */
  language?: "en" | "ru";
}

const SCHEMA_DOC = `[
  {
    "id":          "string — kebab-case stable slug, unique within the array",
    "category":    "documents | tests | essays | recommendations | portal | logistics",
    "title":       "string — concrete one-sentence action verb-led",
    "detail":      "string optional — one-line clarification with specific numbers when available",
    "critical":    "boolean — true if blocking (no application without it)",
    "est_minutes": "integer optional — rough effort estimate in minutes"
  }
]`;

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

function isolateJsonArray(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("[");
  const last  = s.lastIndexOf("]");
  if (first === -1 || last === -1 || last <= first) return s;
  return s.slice(first, last + 1);
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "POST only" });

  let body: ReqBody;
  try { body = await req.json() as ReqBody; }
  catch { return json(400, { error: "Invalid JSON body" }); }

  if (!body.scholarshipId) return json(400, { error: "scholarshipId required" });

  const supa = createServiceClient();

  // Load the scholarship row + the cached checklist together (single round-trip).
  const [{ data: scholarship }, { data: cached }] = await Promise.all([
    supa
      .from("scholarships")
      .select(
        `scholarship_id, scholarship_name, provider_name, host_country, coverage_type, official_url, application_deadline, min_gpa, gpa_scale, min_ielts, min_toefl, min_sat, essay_required, recommendation_letters_required, interview_required, citizenship_requirements, eligibility_requirements, language_requirements, application_fee_text, what_to_prepare_first, last_verified_date`
      )
      .eq("scholarship_id", body.scholarshipId)
      .maybeSingle(),
    supa
      .from("scholarship_checklists")
      .select("items, schema_version, generated_at")
      .eq("scholarship_id", body.scholarshipId)
      .maybeSingle(),
  ]);

  if (!scholarship) return json(404, { error: "Scholarship not found" });

  // Cache validity: same schema version AND the scholarship hasn't been
  // re-verified since the checklist was generated.
  const cacheValid = cached
    && cached.schema_version === SCHEMA_VERSION
    && (!scholarship.last_verified_date
        || new Date(scholarship.last_verified_date) <= new Date(cached.generated_at));

  if (cacheValid) {
    return json(200, { items: cached.items as unknown as ChecklistItem[], _cached: true, _generated_at: cached.generated_at });
  }

  // ─── Generate ────────────────────────────────────────────────────────
  const lang = body.language === "ru" ? "Russian" : "English";
  const fields = [
    `Name: ${scholarship.scholarship_name}`,
    `Provider: ${scholarship.provider_name ?? "—"}`,
    `Host country: ${scholarship.host_country ?? "—"}`,
    `Coverage: ${scholarship.coverage_type}`,
    `Official URL: ${scholarship.official_url ?? "(none)"}`,
    `Deadline: ${scholarship.application_deadline ?? "rolling/unknown"}`,
    `Min GPA: ${scholarship.min_gpa ?? "—"}${scholarship.gpa_scale ? ` / ${scholarship.gpa_scale}` : ""}`,
    `Min IELTS: ${scholarship.min_ielts ?? "—"}`,
    `Min TOEFL: ${scholarship.min_toefl ?? "—"}`,
    `Min SAT: ${scholarship.min_sat ?? "—"}`,
    `Essay required: ${scholarship.essay_required ?? "unknown"}`,
    `Recommendation letters: ${scholarship.recommendation_letters_required ?? "unknown"}`,
    `Interview required: ${scholarship.interview_required ?? "unknown"}`,
    `Application fee: ${scholarship.application_fee_text ?? "unknown"}`,
    `Citizenship: ${scholarship.citizenship_requirements ?? "—"}`,
    `Language requirements: ${scholarship.language_requirements ?? "—"}`,
    `Eligibility prose: ${scholarship.eligibility_requirements ?? "—"}`,
    `What to prepare first (heuristic): ${scholarship.what_to_prepare_first ?? "—"}`,
  ].join("\n");

  const prompt = `Build a concrete, actionable application checklist for the scholarship below. Output ONLY a valid JSON array, no markdown fences, no preamble.

CRITICAL RULES:
1. 8-15 items total — every item is something a real applicant must DO before the deadline.
2. Cover all relevant categories: documents, tests, essays, recommendations, portal actions, logistics. Skip categories that don't apply (e.g. no test requirement → no tests items).
3. Each title is a verb-led one-sentence action ("Submit IELTS 7.0 with 6.5 per band", "Draft a 600-word personal statement on leadership", "Pay $90 application fee on the host portal").
4. When the scholarship row has specific numbers (IELTS 7.0, 2 rec letters, 600-word essay), bake those numbers into the title or detail. Otherwise omit the detail rather than guess.
5. Mark critical=true for items that are blocking (no application without them). Mark critical=false for nice-to-haves.
6. Use kebab-case stable ids ("submit-passport-copy", "schedule-ielts", "draft-personal-statement-1").
7. Output language: ${lang}.

JSON SCHEMA (output an array of these):
${SCHEMA_DOC}

SCHOLARSHIP DATA:
${fields}

Begin output with [ and end with ].`;

  let parsed: ChecklistItem[];
  try {
    const resp = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: "You are a precise application strategist. You output only valid JSON arrays matching the requested schema." },
        { role: "user", content: prompt },
      ],
      stream: false,
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[generate-scholarship-checklist] gateway error", resp.status, t.slice(0, 300));
      return json(502, { error: "Generation failed" });
    }
    const data = await resp.json();
    const raw = (
      data?.choices?.[0]?.message?.content
      ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
      ?? ""
    ) as string;
    if (!raw) return json(502, { error: "Empty completion" });
    const isolated = isolateJsonArray(raw);
    const candidate = JSON.parse(isolated);
    if (!Array.isArray(candidate)) throw new Error("Not an array");
    // Soft validation: drop malformed items, keep the rest.
    const validCategories = new Set(["documents", "tests", "essays", "recommendations", "portal", "logistics"]);
    const seenIds = new Set<string>();
    parsed = candidate
      .filter((x: any) =>
        x && typeof x.id === "string" && x.id.length > 0
        && typeof x.title === "string" && x.title.length > 0
        && typeof x.category === "string" && validCategories.has(x.category)
      )
      .map((x: any) => {
        // Ensure id uniqueness — drop later duplicates.
        if (seenIds.has(x.id)) return null;
        seenIds.add(x.id);
        return {
          id: x.id,
          category: x.category as ChecklistItem["category"],
          title: x.title,
          detail: typeof x.detail === "string" ? x.detail : undefined,
          critical: typeof x.critical === "boolean" ? x.critical : undefined,
          est_minutes: typeof x.est_minutes === "number" && x.est_minutes > 0 && x.est_minutes < 600 ? Math.round(x.est_minutes) : undefined,
        } as ChecklistItem;
      })
      .filter((x: ChecklistItem | null): x is ChecklistItem => x !== null);

    if (parsed.length < 4) {
      throw new Error(`Too few items after validation (${parsed.length})`);
    }
  } catch (e) {
    console.warn("[generate-scholarship-checklist] parse failed", (e as Error).message);
    return json(502, { error: "Parse failed", reason: (e as Error).message });
  }

  // Upsert the cache so a re-fire just overwrites with the freshest version.
  // 2026-05-18: log cache-write failure so a sustained RLS misconfig
  // surfaces in edge logs. Same pattern as scholarship-deep-dive.
  const { error: cacheErr } = await supa.from("scholarship_checklists").upsert({
    scholarship_id: body.scholarshipId,
    items: parsed as unknown as Json,
    schema_version: SCHEMA_VERSION,
    cost_estimate_usd: COST_ESTIMATE_USD,
    model_tag: Deno.env.get("AI_PROVIDER") || "lovable",
  }, { onConflict: "scholarship_id" });
  if (cacheErr) {
    console.warn("[generate-scholarship-checklist] cache upsert failed", cacheErr.message);
  }

  return json(200, { items: parsed, _cached: false, _generated_at: new Date().toISOString() });
});
