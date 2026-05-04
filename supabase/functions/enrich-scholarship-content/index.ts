// enrich-scholarship-content
//
// Fills the SOFT descriptive fields on a scholarship row that are
// commonly null after a basic scrape but heavily used by the brief +
// counselor for grounding:
//
//   · why_this_fits           — 1-2 sentence "why a strong candidate
//                                 should look at this" elevator pitch
//   · ideal_candidate_profile — 1-2 sentence sketch of the typical
//                                 successful applicant
//   · how_to_win              — 1-2 sentence strategic-application advice
//   · what_to_prepare_first   — single-sentence first concrete step
//   · best_for_tags           — 3-5 short audience tags
//
// These are SOFT fields — descriptive, not factual. They are generated
// by the AI based on the scholarship's name + provider + coverage +
// fields + level. Lower hallucination risk than numeric facts; high
// grounding value.
//
// Hard rule: only writes fields that are CURRENTLY NULL/empty. Never
// overwrites an existing value (whether human-curated or previously
// AI-filled). Idempotent: repeat invocations are no-ops.
//
// Used by:
//   · /admin/scholarships-verification "Fill missing content" button
//   · enrich-scholarships-content-cron daily batch backfill
//
// Auth: admin or service-role only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COST_ESTIMATE_USD = 0.0008;

interface EnrichmentOutput {
  why_this_fits?: string;
  ideal_candidate_profile?: string;
  how_to_win?: string;
  what_to_prepare_first?: string;
  best_for_tags?: string[];
}

const SCHEMA_DOC = `{
  "why_this_fits": "string — 1-2 sentences naming who this is a strong fit for. Specific (not 'great students') — refer to field, level, geography",
  "ideal_candidate_profile": "string — 1-2 sentences sketching the typical successful applicant",
  "how_to_win": "string — 1-2 sentences of strategic application advice specific to this program",
  "what_to_prepare_first": "string — single sentence: the first concrete document or action to start with",
  "best_for_tags": "array of 3-5 short kebab-case tags like ['leadership','public-policy','mid-career','africa-focus']"
}`;

function isolateJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Missing Supabase env" });

  let body: { scholarship_id?: string };
  try { body = await req.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }
  if (!body.scholarship_id) return json(400, { error: "scholarship_id required" });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: row, error: loadErr } = await supa
    .from("scholarships")
    .select(
      "scholarship_id, scholarship_name, provider_name, host_country, " +
      "coverage_type, award_amount_text, target_degree_level, target_fields, " +
      "eligibility_requirements, citizenship_requirements, " +
      "why_this_fits, ideal_candidate_profile, how_to_win, what_to_prepare_first, best_for_tags"
    )
    .eq("scholarship_id", body.scholarship_id)
    .maybeSingle();

  if (loadErr || !row) return json(404, { error: "Scholarship not found" });

  // Identify which soft fields are missing — those are the only ones we'll
  // attempt to fill. If everything is populated we no-op cleanly.
  const missing: string[] = [];
  if (!row.why_this_fits)             missing.push("why_this_fits");
  if (!row.ideal_candidate_profile)   missing.push("ideal_candidate_profile");
  if (!row.how_to_win)                missing.push("how_to_win");
  if (!row.what_to_prepare_first)     missing.push("what_to_prepare_first");
  if (!Array.isArray(row.best_for_tags) || row.best_for_tags.length === 0) missing.push("best_for_tags");

  if (missing.length === 0) {
    return json(200, { ok: true, scholarship_id: row.scholarship_id, status: "already_full", filled: [] });
  }

  const facts = [
    `Name: ${row.scholarship_name}`,
    `Provider: ${row.provider_name ?? "—"}`,
    `Host country: ${row.host_country ?? "—"}`,
    `Coverage: ${row.coverage_type}${row.award_amount_text ? ` (${row.award_amount_text})` : ""}`,
    `Levels: ${(row.target_degree_level ?? []).join(", ") || "—"}`,
    `Fields: ${(row.target_fields ?? []).join(", ") || "—"}`,
    `Eligibility prose: ${row.eligibility_requirements ?? "—"}`,
    `Citizenship: ${row.citizenship_requirements ?? "—"}`,
  ].join("\n");

  const prompt = `You are filling SOFT descriptive fields for a scholarship in TopUni's verified database. The user-facing brief and counselor surface these to give grounding context. Output ONLY a JSON object matching the schema. No markdown fences. No preamble.

CRITICAL RULES:
1. Use ONLY publicly known facts about the scholarship's general structure (which audience it targets, what it values, application timing patterns). Do NOT invent specific deadlines, dollar amounts, or unique program features beyond what's in the FACTS block below.
2. Avoid superlatives ("the best", "world-class"). Be concrete.
3. why_this_fits should NAME the audience ("policy professionals returning to a master's", not "ambitious students").
4. how_to_win should give a real angle (e.g. "lead with a tightly defined social impact thesis you can show evidence on", not "write a strong essay").
5. what_to_prepare_first should be the single first concrete deliverable.
6. Avoid the words "stretch," "long shot," "real shot," "safety school," "playbook."
7. Output language: English.

SCHEMA:
${SCHEMA_DOC}

FACTS:
${facts}

MISSING fields you must fill (skip the others):
${missing.join(", ")}

Output the JSON now.`;

  let parsed: EnrichmentOutput;
  try {
    const resp = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: "You are a precise admissions strategist. Output only valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      stream: false,
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[enrich-scholarship-content] gateway error", resp.status, t.slice(0, 300));
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
    console.warn("[enrich-scholarship-content] parse failed", (e as Error).message);
    return json(502, { error: "Parse failed" });
  }

  // Build the patch — only set fields that were missing AND that the AI returned.
  const patch: Record<string, unknown> = {};
  const filled: string[] = [];

  if (missing.includes("why_this_fits") && typeof parsed.why_this_fits === "string" && parsed.why_this_fits.length > 20) {
    patch.why_this_fits = parsed.why_this_fits.slice(0, 400);
    filled.push("why_this_fits");
  }
  if (missing.includes("ideal_candidate_profile") && typeof parsed.ideal_candidate_profile === "string" && parsed.ideal_candidate_profile.length > 20) {
    patch.ideal_candidate_profile = parsed.ideal_candidate_profile.slice(0, 400);
    filled.push("ideal_candidate_profile");
  }
  if (missing.includes("how_to_win") && typeof parsed.how_to_win === "string" && parsed.how_to_win.length > 20) {
    patch.how_to_win = parsed.how_to_win.slice(0, 400);
    filled.push("how_to_win");
  }
  if (missing.includes("what_to_prepare_first") && typeof parsed.what_to_prepare_first === "string" && parsed.what_to_prepare_first.length > 10) {
    patch.what_to_prepare_first = parsed.what_to_prepare_first.slice(0, 240);
    filled.push("what_to_prepare_first");
  }
  if (missing.includes("best_for_tags") && Array.isArray(parsed.best_for_tags)) {
    const tags = parsed.best_for_tags
      .filter((t: unknown): t is string => typeof t === "string" && t.length > 2 && t.length < 30)
      .slice(0, 6);
    if (tags.length >= 2) {
      patch.best_for_tags = tags;
      filled.push("best_for_tags");
    }
  }

  if (filled.length === 0) {
    return json(200, { ok: false, scholarship_id: row.scholarship_id, status: "no_valid_output", filled: [] });
  }

  // Clear the embedding so embed-scholarships re-runs and the new soft text
  // becomes part of the search corpus.
  patch.embedding = null;
  patch.embedded_at = null;

  await supa.from("scholarships").update(patch).eq("scholarship_id", row.scholarship_id);

  return json(200, {
    ok: true,
    scholarship_id: row.scholarship_id,
    status: "filled",
    filled,
    cost_estimate_usd: COST_ESTIMATE_USD,
  });
});
