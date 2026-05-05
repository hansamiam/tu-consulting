// extract-brief-data
//
// Second-pass extraction over the rendered TopUni AI brief. The first
// pass (topuni-ai-pathway) generates the brief as freeform markdown; this
// pass takes the markdown + retrieved scholarship/university context and
// emits typed JSON for the three premium-only sections so the frontend
// can render charts above the narrative.
//
// Sections extracted:
//   • careerRoi     — salary bands, employment rates, employers, trajectory
//   • combinedFunding — 2–3 plausible funding stacks with $ totals + feasibility
//   • visaPathway    — per-country visa difficulty, post-study work, PR years
//
// Schema lives in src/types/briefStructured.ts on the frontend; the JSON
// the LLM emits MUST match that shape. We instruct the model to emit ONLY
// JSON (no markdown fence, no preamble); parse with try/catch; on parse
// failure, return null sections — the frontend already falls through to
// markdown rendering, so a failure here is non-fatal.
//
// Why not stream: the brief itself streams. This pass is post-stream and
// the JSON has to be complete to render charts. Non-streaming response
// is simpler and the pass takes ~3-5 seconds with a flash-tier model.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody {
  /** The full markdown brief from topuni-ai-pathway. */
  briefMarkdown: string;
  /** Profile snapshot — needed to ground numbers in the right field/country. */
  profile: {
    fullName?: string;
    nationality?: string;
    major?: string;
    field?: string;
    targetCountries?: string[];
    gpa?: string | number | null;
    ielts?: string | number | null;
  };
  /** Up to ~30 scholarship rows that were retrieved alongside the brief.
   *  The LLM uses these for grounded $ amounts in combinedFunding scenarios. */
  retrievedScholarships?: Array<{
    scholarship_name: string;
    coverage_type?: string | null;
    award_amount_text?: string | null;
    estimated_total_value_usd?: number | null;
    host_country?: string | null;
  }>;
  /** Up to ~15 university rows that were retrieved. Used for grounding
   *  Career ROI on real names + tuition + acceptance rates. */
  retrievedUniversities?: Array<{
    university_name: string;
    country?: string | null;
    tuition_usd_per_year?: number | null;
  }>;
  language?: "en" | "ru";
}

const SCHEMA_DESCRIPTION = `{
  "careerRoi": {
    "universities": [
      {
        "name": "string — university name from the brief shortlist",
        "starting_salary_min_usd": "number — realistic low end of starting salary in USD for this student's field",
        "starting_salary_max_usd": "number — realistic high end",
        "employment_rate_6mo_pct": "number 0-100 — % employed within 6 months of graduation",
        "notable_employers": "array of up to 4 employer name strings",
        "five_year_trajectory": "string — one sentence on where alumni are 5-10 years later"
      }
    ]
  } | null,
  "combinedFunding": {
    "scenarios": [
      {
        "name": "string — scenario label, e.g. 'Aggressive full-ride stack'",
        "components": [
          { "name": "string — scholarship/aid name", "amount_usd": "number — USD value" }
        ],
        "total_usd": "number — sum of components",
        "feasibility": "primary | secondary | aspirational",
        "strategy": "string — one sentence on how to execute"
      }
    ]
  } | null,
  "visaPathway": {
    "countries": [
      {
        "country": "string",
        "student_visa_difficulty": "integer 1-5 — 1 trivially easy, 5 very hard, for this student's nationality",
        "post_study_work_months": "number — duration of post-study work permit in months, 0 if not available",
        "pr_pathway_years": "number | null — typical years to permanent residency, null if no path",
        "key_challenges": "array of up to 3 specific challenge strings"
      }
    ]
  } | null
}`;

function buildExtractionPrompt(body: ReqBody): string {
  const { briefMarkdown, profile, retrievedScholarships = [], retrievedUniversities = [] } = body;
  const target = (profile.targetCountries ?? []).join(", ") || "(unspecified)";
  const field = (profile.major || profile.field || "").trim() || "(unspecified)";

  // Compact context block — top 12 scholarships with $ values, top 8 universities.
  const scholarshipLines = retrievedScholarships.slice(0, 12).map(s => {
    const v = s.estimated_total_value_usd ? `~$${s.estimated_total_value_usd}` : (s.award_amount_text || s.coverage_type || "—");
    return `- ${s.scholarship_name} (${s.host_country || "?"}): ${v}`;
  }).join("\n");

  const uniLines = retrievedUniversities.slice(0, 8).map(u => {
    const tuition = u.tuition_usd_per_year ? `$${u.tuition_usd_per_year}/yr tuition` : "tuition unlisted";
    return `- ${u.university_name} (${u.country || "?"}): ${tuition}`;
  }).join("\n");

  return `You are a data extractor. You will be given a freeform admissions strategy brief plus retrieved database context. Your job is to produce a JSON object that captures three structured sub-sections of the brief: careerRoi, combinedFunding, visaPathway.

CRITICAL RULES:
1. Output ONLY valid JSON. No markdown fences. No preamble. No commentary.
2. Match the schema exactly. Do not add fields. Do not omit required fields.
3. Set a top-level section to null if the brief did not contain that section or if you cannot ground the values in the brief + retrieved context.
4. For numeric fields, infer realistic values for the student's field (${field}) and target countries (${target}). Salaries should be USD. If the brief or context strongly disagrees with your inference, prefer the brief.
5. Pull university and scholarship names verbatim from the brief or retrieved context — do not invent.
6. For combinedFunding scenarios, use scholarships from the retrieved list. Each component's amount_usd should be the estimated_total_value_usd if available; otherwise infer from coverage_type (full_ride ≈ $50k for a 1-yr master's, full_ride for 4-yr UG ≈ $200k, tuition_only ≈ $30k, stipend ≈ $20k).
7. Return null arrays/objects if you have no data to put in them — do not pad with stubs.

SCHEMA:
${SCHEMA_DESCRIPTION}

STUDENT PROFILE:
- Field: ${field}
- Nationality: ${profile.nationality || "(unspecified)"}
- Target countries: ${target}
- GPA: ${profile.gpa ?? "—"}
- IELTS: ${profile.ielts ?? "—"}

RETRIEVED SCHOLARSHIPS (top 12 by relevance):
${scholarshipLines || "(none)"}

RETRIEVED UNIVERSITIES (top 8 by relevance):
${uniLines || "(none)"}

THE BRIEF MARKDOWN (extract structured data from this):
---
${briefMarkdown.slice(0, 18000)}
---

Now output ONLY the JSON object. Begin with { and end with }. No other text.`;
}

/* Strip common LLM JSON wrappers — sometimes the model emits a code fence
   despite instructions, sometimes a leading explanation. We aggressively
   isolate the first {...} block. */
function isolateJson(raw: string): string {
  let s = raw.trim();
  // Strip leading ```json or ``` fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  s = s.trim();
  // Find first { and last } and slice. Defensive against any leading
  // commentary the model might emit.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return s;
  return s.slice(first, last + 1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit per IP. Each call extracts structured data via the LLM
  // for a brief — invoked when the user generates / re-generates.
  // 8/min covers iterative use, abuse capped.
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (SUPABASE_URL && ANON_KEY) {
    const supaRL = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const ip = clientIp(req);
    const ok = await checkRateLimit(supaRL, { key: `extract-brief:${ip}`, perMinute: 8 });
    if (!ok) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let body: ReqBody;
  try {
    body = await req.json() as ReqBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.briefMarkdown || body.briefMarkdown.length < 200) {
    return new Response(JSON.stringify({ error: "briefMarkdown too short or missing" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const prompt = buildExtractionPrompt(body);

  try {
    const resp = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: "You are a precise data extractor. You output only valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      stream: false,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[extract-brief-data] gateway error", resp.status, errText.slice(0, 400));
      return new Response(JSON.stringify({
        // Soft-fail: return empty payload so the frontend keeps showing the markdown narrative.
        careerRoi: null, combinedFunding: null, visaPathway: null,
        _error: `gateway ${resp.status}`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    // Anthropic returns { content: [{ text: "..." }] }; OpenAI/Lovable
    // returns { choices: [{ message: { content: "..." } }] }. Pull either.
    const raw =
      data?.choices?.[0]?.message?.content
      ?? (Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? "").join("") : "")
      ?? "";

    if (!raw) {
      return new Response(JSON.stringify({
        careerRoi: null, combinedFunding: null, visaPathway: null,
        _error: "empty completion",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(isolateJson(raw));
    } catch (e) {
      console.warn("[extract-brief-data] JSON parse failed", (e as Error).message, raw.slice(0, 400));
      return new Response(JSON.stringify({
        careerRoi: null, combinedFunding: null, visaPathway: null,
        _error: "parse failed",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Defensive shape check — keep only the three top-level keys we care about.
    const p = parsed as Record<string, unknown>;
    const out = {
      careerRoi: p.careerRoi ?? null,
      combinedFunding: p.combinedFunding ?? null,
      visaPathway: p.visaPathway ?? null,
    };

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Cache 30 min server-side — the brief is keyed by profileHash on
        // the client so the same profile won't hit us repeatedly. CDN
        // caching on POST isn't standard but Supabase respects it for
        // repeat callers within a deployment.
        "Cache-Control": "private, max-age=1800",
      },
    });
  } catch (e) {
    console.error("[extract-brief-data] unhandled", e);
    return new Response(JSON.stringify({
      careerRoi: null, combinedFunding: null, visaPathway: null,
      _error: e instanceof Error ? e.message : "unknown",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
