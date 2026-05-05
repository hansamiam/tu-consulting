// verify-scholarship
//
// Self-healing verification pass. Takes a scholarship_id, re-fetches its
// `source_url`, re-extracts the structured fields via the AI gateway with
// the same schema scrape-source uses, then DIFFs against the stored row.
//
// Outcomes:
//   · Source URL unreachable               → verification_status='broken'
//   · Re-extracted matches stored          → verification_status='verified',
//                                             last_verified_at=now()
//   · Re-extracted differs (deadline/value/
//     coverage/etc.)                       → log diff to scrape_runs +
//                                             write the new values to a
//                                             scholarships_staging row for
//                                             admin review (don't auto-
//                                             overwrite — operator gates)
//   · LLM confidence too low / parse fail  → verification_status stays as-is,
//                                             last_verified_at NOT advanced
//                                             (so this row is picked up
//                                             again next pass)
//
// Used by:
//   · /admin/scholarships-verification "Re-verify" button (interactive)
//   · verify-scholarship-cron daily self-heal (batch)
//
// Auth: admin OR service-role only. Never anon.

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
} from "../_shared/scholarshipFields.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COST_ESTIMATE_USD = 0.0015 + FIRECRAWL_COST_PER_SCRAPE_USD;
const MAX_MARKDOWN_CHARS = 25_000;
const MIN_CONFIDENCE_TO_TRUST = 0.7;

/* Field-level diff threshold rules. We don't flag micro-changes (case
   diffs, trailing whitespace) — only material drift the user would
   notice. */
const DIFF_FIELDS = [
  "application_deadline",
  "deadline_type",
  "coverage_type",
  "award_amount_text",
  "estimated_total_value_usd",
  "min_gpa",
  "min_ielts",
  "min_toefl",
  "min_sat",
  "essay_required",
  "recommendation_letters_required",
  "interview_required",
] as const;

/* Fields where NULL→value (additive backfill) is silently applied
 * instead of staged for review. These are "we didn't know, now we do"
 * additions rather than contradictions, so writing them directly
 * progressively heals the catalog without admin intervention. Existing-
 * value → different-value transitions on these fields are NOT silently
 * overwritten — they go through the staging diff flow if added to
 * DIFF_FIELDS. We keep DIFF_FIELDS focused on the user-facing surface
 * (deadlines / amounts / requirements); the backfill set covers
 * structured matching inputs that the eligibility predicate uses. */
const BACKFILL_NULL_FIELDS = [
  "eligible_countries",
  "target_fields",
  "target_degree_level",
] as const;

type DiffField = typeof DIFF_FIELDS[number];

interface ExtractedFields {
  scholarship_name?: string;
  provider_name?: string;
  host_country?: string;
  application_deadline?: string | null;
  deadline_type?: string | null;
  coverage_type?: string;
  award_amount_text?: string | null;
  estimated_total_value_usd?: number | null;
  min_gpa?: number | null;
  min_ielts?: number | null;
  min_toefl?: number | null;
  min_sat?: number | null;
  essay_required?: boolean | null;
  recommendation_letters_required?: number | null;
  interview_required?: boolean | null;
  citizenship_requirements?: string | null;
  eligibility_requirements?: string | null;
  // Structured matching inputs — used by the eligibility predicate.
  // Often missing on legacy rows; verify pass progressively backfills.
  target_fields?: string[] | null;
  target_degree_level?: string[] | null;
  eligible_countries?: string[] | null;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an expert scholarship verifier. Given a web page that PREVIOUSLY described a known scholarship, re-extract its structured fields. Return STRICT JSON only — no prose, no fences. If the page no longer describes the scholarship clearly (404, redirected to unrelated content, paywall), set confidence < 0.5 and leave fields as null/empty. NEVER guess; missing data should remain missing.`;

const USER_PROMPT = (knownName: string, knownProvider: string | null, sourceUrl: string, markdown: string) => `
Scholarship being verified:
  · name: ${knownName}
  · provider: ${knownProvider ?? "(unknown)"}
  · source URL: ${sourceUrl}

Re-extract from the page content below. Fields to populate (or leave null):

{
  "scholarship_name": "...",
  "provider_name": "...",
  "host_country": "...",
  "application_deadline": "YYYY-MM-DD or null",
  "deadline_type": "rolling | annual | one-time | unknown",
  "coverage_type": "full_ride | partial | tuition_only | stipend | other",
  "award_amount_text": "...",
  "estimated_total_value_usd": 50000,
  "min_gpa": 3.5,
  "min_ielts": 7.0,
  "min_toefl": 100,
  "min_sat": 1450,
  "essay_required": true,
  "recommendation_letters_required": 2,
  "interview_required": true,
  "citizenship_requirements": "...",
  "eligibility_requirements": "...",
  "target_fields": ["Computer Science"],
  "target_degree_level": ["master","phd"],
  "eligible_countries": ["India","Pakistan"],
  "confidence": 0.92
}

Page content (markdown, may be truncated):
---
${markdown}
---
`;

function extractJson(s: string): unknown {
  let t = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

function diffMaterial(stored: Record<string, unknown>, fresh: ExtractedFields): { field: DiffField; was: unknown; now: unknown }[] {
  const diffs: { field: DiffField; was: unknown; now: unknown }[] = [];
  for (const f of DIFF_FIELDS) {
    const a = stored[f];
    const b = (fresh as Record<string, unknown>)[f];
    if (b === undefined || b === null) continue;
    if (typeof a === "string" && typeof b === "string") {
      if (a.trim().toLowerCase() !== b.trim().toLowerCase()) diffs.push({ field: f, was: a, now: b });
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ field: f, was: a, now: b });
    }
  }
  return diffs;
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

  const { data: stored, error: loadErr } = await supa
    .from("scholarships")
    .select(
      "scholarship_id, scholarship_name, provider_name, host_country, " +
      "application_deadline, deadline_type, coverage_type, award_amount_text, " +
      "estimated_total_value_usd, min_gpa, min_ielts, min_toefl, min_sat, " +
      "essay_required, recommendation_letters_required, interview_required, " +
      "citizenship_requirements, eligibility_requirements, " +
      "target_fields, target_degree_level, eligible_countries, " +
      "source_url, official_url, verification_status, last_verified_at"
    )
    .eq("scholarship_id", body.scholarship_id)
    .maybeSingle();

  if (loadErr || !stored) return json(404, { error: "Scholarship not found" });

  // ─── Progressive self-clean on load ─────────────────────────────
  // Apply the same hygiene cleaners to the stored name + provider.
  // If they differ from the canonical form (because the row was
  // ingested before the cleaners existed, or the LLM slipped through
  // an older prompt), normalize them in-place. The canonical_key
  // trigger fires on UPDATE OF scholarship_name/provider_name and
  // recomputes — so cleaning the name also re-collapses the dedup
  // key. Every verify pass heals more legacy rows.
  const cleanedStoredName = cleanScholarshipName(stored.scholarship_name);
  const cleanedStoredProvider = cleanProvider(stored.provider_name);
  const selfCleanUpdate: Record<string, unknown> = {};
  if (cleanedStoredName && cleanedStoredName !== stored.scholarship_name) {
    selfCleanUpdate.scholarship_name = cleanedStoredName;
  }
  if (cleanedStoredProvider && cleanedStoredProvider !== stored.provider_name) {
    selfCleanUpdate.provider_name = cleanedStoredProvider;
  }
  if (Object.keys(selfCleanUpdate).length > 0) {
    await supa.from("scholarships").update(selfCleanUpdate).eq("scholarship_id", stored.scholarship_id);
    // Reflect locally so downstream LLM prompt + diff comparison use
    // the cleaned values too — otherwise we'd compute a name diff on
    // every pass.
    if (typeof selfCleanUpdate.scholarship_name === "string") stored.scholarship_name = selfCleanUpdate.scholarship_name;
    if (typeof selfCleanUpdate.provider_name === "string") stored.provider_name = selfCleanUpdate.provider_name;
  }

  const targetUrl = stored.source_url || stored.official_url;
  if (!targetUrl) {
    // Nothing to verify against — leave status alone but stamp last_verified_at
    // to push this row to the back of the queue for next cron pass.
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, { ok: true, status: "no_source_url", scholarship_id: stored.scholarship_id });
  }

  // ─── Fetch the source page ──────────────────────────────────────
  let pageMarkdown = "";
  try {
    const result = await firecrawlScrape({ url: targetUrl, onlyMainContent: true });
    pageMarkdown = result.markdown ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Source unreachable → mark broken but only after enough consecutive misses.
    // We let scholarship-url-health-cron own the consecutive-fails counter so
    // a single transient timeout doesn't break a row. Just stamp the attempt.
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, { ok: false, status: "fetch_failed", error: msg });
  }

  if (!pageMarkdown.trim() || pageMarkdown.length < 200) {
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, { ok: false, status: "page_too_thin", scholarship_id: stored.scholarship_id });
  }

  // ─── Re-extract via LLM ──────────────────────────────────────────
  let fresh: ExtractedFields | null = null;
  try {
    const resp = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(stored.scholarship_name, stored.provider_name, targetUrl, pageMarkdown.slice(0, MAX_MARKDOWN_CHARS)) },
      ],
      stream: false,
    });
    if (!resp.ok) throw new Error(`AI HTTP ${resp.status}`);
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content as string | undefined;
    if (!text) throw new Error("Empty completion");
    fresh = extractJson(text) as ExtractedFields;
    if (typeof fresh?.confidence !== "number") throw new Error("Missing confidence");
    // Defensive cleanup — same hygiene applied at scrape ingest. The
    // verify pass goes through the SAME LLM and is just as susceptible
    // to "Various", "Trustees of...", "Apply now" suffixes etc.
    if (fresh.scholarship_name) fresh.scholarship_name = cleanScholarshipName(fresh.scholarship_name);
    if (fresh.provider_name) fresh.provider_name = cleanProvider(fresh.provider_name) ?? undefined;
    if (fresh.host_country) fresh.host_country = cleanHostCountry(fresh.host_country) ?? undefined;
    if (fresh.award_amount_text) fresh.award_amount_text = cleanAwardText(fresh.award_amount_text);
    if (Array.isArray(fresh.target_fields)) {
      const cleaned = cleanTargetFields(fresh.target_fields);
      fresh.target_fields = cleaned.length > 0 ? cleaned : null;
    }
    if (Array.isArray(fresh.eligible_countries)) {
      const cleaned = cleanEligibleCountries(fresh.eligible_countries);
      fresh.eligible_countries = cleaned.length > 0 ? cleaned : null;
    }
  } catch (e) {
    console.warn("[verify-scholarship] re-extract failed", (e as Error).message);
    return json(200, { ok: false, status: "extract_failed", error: (e as Error).message });
  }

  if (fresh.confidence < MIN_CONFIDENCE_TO_TRUST) {
    // Page exists but the LLM isn't sure it still describes the same scholarship.
    // Don't overwrite anything; don't advance verification status. Stamp the
    // attempt so this row gets revisited later.
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, {
      ok: true,
      status: "low_confidence",
      confidence: fresh.confidence,
      scholarship_id: stored.scholarship_id,
    });
  }

  // ─── Opportunistic backfill of structured matching inputs ────────
  // For BACKFILL_NULL_FIELDS: NULL/empty stored value + non-empty fresh
  // value = silent additive backfill. These are the inputs the
  // eligibility predicate uses (eligible_countries / target_fields /
  // target_degree_level), and most legacy rows have them NULL even
  // though the scholarship's actual page lists them. Treating absence-
  // → presence as "no contradiction, just new info" lets the verify
  // cron progressively heal the catalog without admin work, while
  // never silently overwriting an existing value.
  const backfillUpdates: Record<string, unknown> = {};
  for (const f of BACKFILL_NULL_FIELDS) {
    const a = (stored as Record<string, unknown>)[f];
    const b = (fresh as Record<string, unknown>)[f];
    const storedEmpty = a === null || a === undefined || (Array.isArray(a) && a.length === 0);
    const freshNonEmpty = Array.isArray(b) && b.length > 0;
    if (storedEmpty && freshNonEmpty) backfillUpdates[f] = b;
  }

  // If we're backfilling target_fields or target_degree_level, the
  // embedding's source_text changes — clear embedding so the
  // embed-scholarships worker re-embeds on the next pass. Per the
  // scholarships_needing_embedding view, embedding IS NULL is
  // sufficient to enqueue. eligible_countries doesn't go into the
  // embedding source_text so doesn't trigger re-embedding.
  const embeddingFieldsBackfilled =
    "target_fields" in backfillUpdates || "target_degree_level" in backfillUpdates;
  if (embeddingFieldsBackfilled) {
    backfillUpdates.embedding = null;
    backfillUpdates.embedded_at = null;
  }

  // ─── Compare stored vs. fresh ────────────────────────────────────
  const diffs = diffMaterial(stored, fresh);
  const now = new Date().toISOString();

  if (diffs.length === 0) {
    // No material changes — clean re-verify. Promote to 'verified',
    // bump the timestamp, AND apply any opportunistic backfill so the
    // additive learnings don't sit unused.
    await supa.from("scholarships")
      .update({
        verification_status: "verified",
        last_verified_at: now,
        verified: true,
        ...backfillUpdates,
      })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, {
      ok: true,
      status: "verified_clean",
      scholarship_id: stored.scholarship_id,
      cost_estimate_usd: COST_ESTIMATE_USD,
      backfilled: Object.keys(backfillUpdates),
    });
  }

  // ─── Diffs found — stage for admin review, don't auto-overwrite ──
  // Land the fresh extraction in scholarships_staging with a needs_review
  // status so an admin can compare + accept. Don't promote verification_status
  // yet — keep at 'stale' so it shows up in the queue.
  await supa.from("scholarships_staging").insert({
    source_id: null,
    scholarship_id: stored.scholarship_id,
    fingerprint: null,
    raw_text: pageMarkdown.slice(0, 2000),
    parsed_data: fresh as unknown as Record<string, unknown>,
    confidence: fresh.confidence,
    diff_summary: diffs.map(d => `${d.field}: ${JSON.stringify(d.was)} → ${JSON.stringify(d.now)}`).join("; "),
    status: "pending",
  }).select("staging_id").maybeSingle();

  await supa.from("scholarships")
    .update({
      verification_status: "stale",
      last_verified_at: now,
      // Apply opportunistic backfill even when material diffs exist —
      // a row that has BOTH a deadline drift AND a previously-missing
      // eligible_countries should still get the additive backfill;
      // those are independent changes.
      ...backfillUpdates,
    })
    .eq("scholarship_id", stored.scholarship_id);

  return json(200, {
    ok: true,
    status: "diffs_staged",
    scholarship_id: stored.scholarship_id,
    diff_count: diffs.length,
    diffs,
    cost_estimate_usd: COST_ESTIMATE_USD,
  });
});
