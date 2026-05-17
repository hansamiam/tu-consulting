// enrich-university
//
// Fills null fields on universities + programs + admission_requirements +
// applications via a single grounded LLM call per university. Strict
// confidence gating: only writes values where the model rates ≥ 0.75
// confidence. Records source + confidence + inferred_at in
// enrichment_metadata so admins can see which values are AI-inferred and
// might need verification.
//
// Verified values (anything written without `enrichment_metadata.<field>.source
// === 'ai'`) override AI values automatically — we never overwrite human-
// vetted data.
//
// Single university per call (so a stuck row doesn't block others). Use the
// enrich-universities-cron dispatcher for batch fan-out with rate limiting.
//
// Auth: admin or service role only — invoked by the cron dispatcher or
// from the admin UI's "Enrich data" button.

import { chatCompletions } from "../_shared/ai-gateway.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const MIN_CONFIDENCE = 0.75;
const COST_ESTIMATE_USD = 0.0015;

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

interface NumericInference {
  value: number | null;
  confidence: number; // 0-1
  /** AI's brief justification (telemetry only). Bounded length. */
  justification?: string;
}

interface EnrichmentOutput {
  global_ranking?: NumericInference;          // 1-1500ish, integer
  tuition_usd_per_year?: NumericInference;    // for international students
  cost_of_living_index?: NumericInference;    // city, NY=100 baseline
  programs?: Array<{
    program_name: string;
    degree_level: "bachelor" | "master" | "phd";
    field_of_study: string;
    ielts_score_min?: NumericInference;       // 0-9
    sat_score_min?: NumericInference;         // 400-1600
    gpa_min?: NumericInference;               // typically 0-4
    acceptance_rate?: NumericInference;       // 0-100 percent
    visa_difficulty_score?: NumericInference; // 1-10
  }>;
}

/* Schema-as-prose: less brittle than JSON-schema for our model tier. */
const SCHEMA_DOC = `{
  "global_ranking":          { "value": "integer 1-1500 or null", "confidence": "0-1 float", "justification": "string ≤120 chars" },
  "tuition_usd_per_year":    { "value": "integer USD or null", "confidence": "0-1 float", "justification": "..." },
  "cost_of_living_index":    { "value": "float (NYC=100) or null", "confidence": "...", "justification": "..." },
  "programs": [
    {
      "program_name":           "string — pulled verbatim from the existing programs list",
      "degree_level":           "bachelor | master | phd",
      "field_of_study":         "string",
      "ielts_score_min":        { "value": "0-9 or null", "confidence": "0-1", "justification": "..." },
      "sat_score_min":          { "value": "400-1600 or null", "confidence": "0-1", "justification": "..." },
      "gpa_min":                { "value": "0-scale or null", "confidence": "0-1", "justification": "..." },
      "acceptance_rate":        { "value": "0-100 percent or null", "confidence": "0-1", "justification": "..." },
      "visa_difficulty_score":  { "value": "1-10 or null", "confidence": "0-1", "justification": "..." }
    }
  ]
}`;

function isolateJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("{");
  const last  = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return s;
  return s.slice(first, last + 1);
}

/** Returns true if the existing field can be safely overwritten by an AI
 *  inference. Rule: overwrite only when the field is null OR the existing
 *  value is itself AI-inferred (we let a fresher AI inference replace an
 *  older one). Never overwrites a human-verified value. */
function canOverwrite(
  currentValue: unknown,
  metadataForField: any,
): boolean {
  if (currentValue === null || currentValue === undefined) return true;
  // If we have metadata and it's NOT marked as AI, treat as verified.
  if (metadataForField && metadataForField.source && metadataForField.source !== "ai") {
    return false;
  }
  // Existing value with no metadata → assume verified by manual entry,
  // don't clobber.
  if (!metadataForField) return false;
  // Existing AI value → safe to refresh.
  return metadataForField.source === "ai";
}

/** Clamp a numeric inference to the field's reasonable bounds. */
function clamp(v: number | null | undefined, min: number, max: number): number | null {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  if (v < min || v > max) return null; // out of bounds → drop, don't silently rescale
  return v;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  let body: { university_id?: string };
  try { body = await req.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  if (!body.university_id) return json(400, { error: "university_id required" });

  const supa = createServiceClient();

  // Pull the university + its programs in one round-trip.
  const { data: university, error: uErr } = await supa
    .from("universities")
    .select(`
      university_id, university_name, country, city, language_of_instruction,
      global_ranking, tuition_usd_per_year, cost_of_living_index,
      enrichment_metadata,
      programs (
        program_id, program_name, degree_level, field_of_study,
        admission_requirements ( requirement_id, ielts_score_min, sat_score_min, gpa_min, enrichment_metadata ),
        applications ( application_id, acceptance_rate, visa_difficulty_score, enrichment_metadata )
      )
    `)
    .eq("university_id", body.university_id)
    .maybeSingle();

  if (uErr || !university) return json(404, { error: "University not found" });

  const programs = (university.programs as any[]) || [];
  const programLines = programs.map((p, i) =>
    `${i + 1}. ${p.program_name} (${p.degree_level}, ${p.field_of_study})`
  ).join("\n");

  const prompt = `Estimate verifiable admissions data for the university below. Output ONLY valid JSON. No markdown fences, no preamble.

CRITICAL RULES:
1. Confidence is your honest estimate that a careful researcher would find this value within ±10%. Be conservative. If unsure or no signal exists, use confidence 0 and value null.
2. ALL numbers are for INTERNATIONAL STUDENTS where applicable (tuition, acceptance rate). Domestic-only data should be marked low-confidence.
3. Use commonly-cited public data: QS / THE rankings, official .edu admissions pages, US News, NSE Korea, etc. Do not invent numbers.
4. For each program in the list, fill the per-program fields. Pull program_name, degree_level, field_of_study VERBATIM from the input list.
5. acceptance_rate is 0-100 (a percent). visa_difficulty_score is 1 (easy) to 10 (very hard).
6. Skip programs that have no public admissions data — return them with all numeric values null + confidence 0.

SCHEMA:
${SCHEMA_DOC}

UNIVERSITY:
${university.university_name} — ${university.city}, ${university.country}

PROGRAMS (${programs.length}):
${programLines || "(no programs registered)"}

Output ONLY the JSON object. Begin with { and end with }.`;

  let parsed: EnrichmentOutput;
  try {
    const resp = await chatCompletions({
      tier: "pro",
      messages: [
        { role: "system", content: "You are a precise admissions data researcher. You output only valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      stream: false,
      reasoning: { effort: "medium" },
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[enrich-university] gateway error", resp.status, t.slice(0, 300));
      return json(502, { error: "Generation failed" });
    }
    const data = await resp.json();
    const raw = (
      data?.choices?.[0]?.message?.content
      ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
      ?? ""
    ) as string;
    if (!raw) return json(502, { error: "Empty completion" });
    parsed = JSON.parse(isolateJson(raw)) as EnrichmentOutput;
  } catch (e) {
    console.warn("[enrich-university] parse failed", (e as Error).message);
    return json(502, { error: "Parse failed" });
  }

  // ─── Apply university-level updates ─────────────────────────────────
  const now = new Date().toISOString();
  const uniMeta = (university.enrichment_metadata ?? {}) as Record<string, any>;
  const newMeta = { ...uniMeta };
  const uniPatch: Record<string, unknown> = {};

  const tryApply = (fieldName: string, inference: NumericInference | undefined, clamper: (v: number | null) => number | null) => {
    if (!inference || typeof inference.confidence !== "number" || inference.confidence < MIN_CONFIDENCE) return;
    const clamped = clamper(inference.value ?? null);
    if (clamped === null) return;
    const current = (university as Record<string, unknown>)[fieldName];
    if (!canOverwrite(current, uniMeta[fieldName])) return;
    uniPatch[fieldName] = clamped;
    newMeta[fieldName] = {
      source: "ai",
      confidence: Math.round(inference.confidence * 100) / 100,
      inferred_at: now,
      justification: typeof inference.justification === "string"
        ? inference.justification.slice(0, 120)
        : undefined,
    };
  };

  tryApply("global_ranking",       parsed.global_ranking,       v => clamp(v != null ? Math.round(v) : null, 1, 1500));
  tryApply("tuition_usd_per_year", parsed.tuition_usd_per_year, v => clamp(v != null ? Math.round(v) : null, 0, 200_000));
  tryApply("cost_of_living_index", parsed.cost_of_living_index, v => clamp(v, 10, 300));

  let updatesUniversity = 0;
  if (Object.keys(uniPatch).length > 0) {
    uniPatch.enrichment_metadata = newMeta;
    uniPatch.enriched_at = now;
    await supa.from("universities").update(uniPatch as never).eq("university_id", university.university_id);
    updatesUniversity = Object.keys(uniPatch).length - 2; // exclude metadata + enriched_at
  } else {
    // Even if we wrote no values, mark the row as scanned so the cron
    // doesn't re-pick it within the staleness window.
    await supa.from("universities")
      .update({ enriched_at: now })
      .eq("university_id", university.university_id);
  }

  // ─── Apply program-level updates (admission_requirements + applications) ─
  let updatesAdmissions = 0;
  let updatesApplications = 0;
  for (const prog of (parsed.programs ?? [])) {
    // Match the AI's program back to a real program_id by name + level + field.
    // The AI was instructed to pull names verbatim, but tolerate small drift.
    const match = programs.find(p =>
      p.program_name?.toLowerCase().trim() === (prog.program_name || "").toLowerCase().trim()
      && p.degree_level === prog.degree_level
      && p.field_of_study?.toLowerCase().trim() === (prog.field_of_study || "").toLowerCase().trim()
    ) || programs.find(p => p.program_name?.toLowerCase().trim() === (prog.program_name || "").toLowerCase().trim());
    if (!match) continue;

    // ── admission_requirements ──
    const adm = (match.admission_requirements as any[])?.[0];
    if (adm) {
      const admMeta = (adm.enrichment_metadata ?? {}) as Record<string, any>;
      const newAdmMeta = { ...admMeta };
      const admPatch: Record<string, unknown> = {};

      const applyAdm = (field: string, inference: NumericInference | undefined, clamper: (v: number | null) => number | null) => {
        if (!inference || typeof inference.confidence !== "number" || inference.confidence < MIN_CONFIDENCE) return;
        const clamped = clamper(inference.value ?? null);
        if (clamped === null) return;
        const current = adm[field];
        if (!canOverwrite(current, admMeta[field])) return;
        admPatch[field] = clamped;
        newAdmMeta[field] = {
          source: "ai",
          confidence: Math.round(inference.confidence * 100) / 100,
          inferred_at: now,
          justification: typeof inference.justification === "string"
            ? inference.justification.slice(0, 120)
            : undefined,
        };
      };

      applyAdm("ielts_score_min", prog.ielts_score_min, v => clamp(v, 0, 9));
      applyAdm("sat_score_min",   prog.sat_score_min,   v => clamp(v != null ? Math.round(v) : null, 400, 1600));
      applyAdm("gpa_min",         prog.gpa_min,         v => clamp(v, 0, 4.5));

      if (Object.keys(admPatch).length > 0) {
        admPatch.enrichment_metadata = newAdmMeta;
        admPatch.enriched_at = now;
        await supa.from("admission_requirements")
          .update(admPatch as never)
          .eq("requirement_id", adm.requirement_id);
        updatesAdmissions += Object.keys(admPatch).length - 2;
      }
    }

    // ── applications ──
    const app = (match.applications as any[])?.[0];
    if (app) {
      const appMeta = (app.enrichment_metadata ?? {}) as Record<string, any>;
      const newAppMeta = { ...appMeta };
      const appPatch: Record<string, unknown> = {};

      const applyApp = (field: string, inference: NumericInference | undefined, clamper: (v: number | null) => number | null) => {
        if (!inference || typeof inference.confidence !== "number" || inference.confidence < MIN_CONFIDENCE) return;
        const clamped = clamper(inference.value ?? null);
        if (clamped === null) return;
        const current = app[field];
        if (!canOverwrite(current, appMeta[field])) return;
        appPatch[field] = clamped;
        newAppMeta[field] = {
          source: "ai",
          confidence: Math.round(inference.confidence * 100) / 100,
          inferred_at: now,
          justification: typeof inference.justification === "string"
            ? inference.justification.slice(0, 120)
            : undefined,
        };
      };

      applyApp("acceptance_rate",        prog.acceptance_rate,        v => clamp(v, 0, 100));
      applyApp("visa_difficulty_score",  prog.visa_difficulty_score,  v => clamp(v != null ? Math.round(v) : null, 1, 10));

      if (Object.keys(appPatch).length > 0) {
        appPatch.enrichment_metadata = newAppMeta;
        appPatch.enriched_at = now;
        await supa.from("applications")
          .update(appPatch as never)
          .eq("application_id", app.application_id);
        updatesApplications += Object.keys(appPatch).length - 2;
      }
    }
  }

  return json(200, {
    ok: true,
    university_id: university.university_id,
    fields_updated: {
      university: updatesUniversity,
      admission_requirements: updatesAdmissions,
      applications: updatesApplications,
    },
    cost_estimate_usd: COST_ESTIMATE_USD,
  });
});
