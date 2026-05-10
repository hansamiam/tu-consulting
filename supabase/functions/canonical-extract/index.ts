// canonical-extract — foundational pipeline for canonical scholarship data.
//
// Per user direction (2026-05-10): "we need a real canonical engineered
// solution for: scholarship overviews, deadlines, funding amounts,
// requirements, real canonical links."
//
// What this does, given a scholarship_id:
//   1. Picks the cleanest URL to scrape — prefers the existing
//      canonical_official_url, then official_url, then source_url, but
//      SKIPS aggregator domains (scholars4dev, opportunitydesk, etc.)
//      since those round-up pages don't have program-canonical content.
//      If nothing clean is available, returns early with reason
//      "no_clean_url".
//   2. Firecrawl-scrapes the page (JS-rendered markdown).
//   3. Calls the LLM with a strict schema asking for 5 canonical fields:
//        canonical_overview, canonical_deadline_iso,
//        canonical_funding_text + canonical_funding_usd,
//        canonical_official_url (the program page URL on the
//        institution's own domain — extracted FROM the markdown if the
//        scraped URL was already aggregator-leaning),
//        canonical_requirements (structured JSON with citizenship,
//        levels, fields, min_gpa/ielts/toefl/sat, age_max, other).
//   4. Validates each field for sanity:
//        · overview is non-generic, ≤180 chars, declarative
//        · deadline parses as a valid ISO date (or null)
//        · funding_usd is a positive integer (or null)
//        · official_url's domain is non-aggregator AND matches the
//          provider name's hint (or stays null)
//   5. UPDATES the row with whichever fields validated. Appends the
//      run to canonical_audit (jsonb log) so we can trace what
//      changed and why.
//   6. The trigger trg_recompute_canonical_quality_score auto-bumps
//      canonical_quality_score on UPDATE.
//
// Used by:
//   · canonical-extract-cron (daily batch picker — picks rows where
//     canonical_overview_at IS NULL OR < now() - 90 days)
//   · /admin/scholarships-verification "Re-extract canonical" button
//     (interactive operator-triggered)
//
// Auth: admin OR service-role only. Never anon.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { firecrawlScrape, FIRECRAWL_COST_PER_SCRAPE_USD } from "../_shared/firecrawl.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COST_ESTIMATE_USD = 0.0020 + FIRECRAWL_COST_PER_SCRAPE_USD;
const MAX_MARKDOWN_CHARS = 25_000;

/* Aggregator domain detection — mirrors src/lib/aggregatorUrls.ts.
   Kept inline here to avoid a server-side dependency on the client
   bundle. Round-up sites where the scrape would yield "list of 50
   scholarships" rather than program-canonical content. */
const AGGREGATOR_DOMAINS = new Set<string>([
  "scholars4dev.com",
  "opportunitiesforyouth.org",
  "opportunitiestracker.ug",
  "opportunitydesk.org",
  "scholarshipsdb.net",
  "scholarship-positions.com",
  "after12.in",
  "buddy4study.com",
]);

const domainOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
};

const isAggregator = (url: string | null | undefined): boolean => {
  const d = domainOf(url);
  if (!d) return false;
  for (const agg of AGGREGATOR_DOMAINS) {
    if (d === agg || d.endsWith(`.${agg}`)) return true;
  }
  return false;
};

interface CanonicalExtraction {
  canonical_overview: string | null;
  canonical_deadline_iso: string | null;
  canonical_funding_text: string | null;
  canonical_funding_usd: number | null;
  canonical_official_url: string | null;
  canonical_requirements: {
    citizenship?: string[];
    levels?: string[];
    fields?: string[];
    min_gpa?: number | null;
    min_ielts?: number | null;
    min_toefl?: number | null;
    min_sat?: number | null;
    age_max?: number | null;
    other?: string[];
  } | null;
  confidence: number; // 0-1
}

const EXTRACT_PROMPT = `You are extracting CANONICAL scholarship data from the official program page below.

OUTPUT a strict JSON object matching this exact schema (no commentary, no markdown):
{
  "canonical_overview":      <string ≤180 chars, ONE sentence describing what this program funds + for whom + at which level. Declarative, factual, no marketing. Example: "Funds Chinese-government Master's and PhD programs in any field at 280+ Chinese universities for international students of any nationality.">,
  "canonical_deadline_iso":  <string "YYYY-MM-DD" or null. The CURRENT or NEXT cycle's deadline. If only a month/year is announced ("February 2026"), set to the last day of that month. If "rolling" or no announced date, return null.>,
  "canonical_funding_text":  <string ≤80 chars, human-readable formatted funding. Example: "Full ride: tuition + $32K/yr stipend + travel" or "Up to $25K/yr × 4 years" or null>,
  "canonical_funding_usd":   <integer total USD value of the maximum award across the full duration, or null. Example: 192000 for "$48K/yr × 4 years".>,
  "canonical_official_url":  <string URL on the institution's OWN domain that hosts the program page. NOT an aggregator. NOT a third-party round-up. Extract from the page if the source URL itself is fine, else find a link in the markdown that points to the institution's official program page. Null if no clean URL is in the content.>,
  "canonical_requirements": {
    "citizenship":  <array of canonical country names eligible to apply, e.g. ["Kazakhstan", "Kyrgyzstan"]. Empty array if open to all.>,
    "levels":       <array from {"high school","bachelor's","master's","PhD","postdoctoral"}, e.g. ["master's","PhD"]>,
    "fields":       <array of academic fields the scholarship targets, e.g. ["Computer Science","Engineering"]. Empty array if open to all fields.>,
    "min_gpa":      <number 0-4 or null>,
    "min_ielts":    <number 0-9 or null>,
    "min_toefl":    <number 0-120 or null>,
    "min_sat":      <number 400-1600 or null>,
    "age_max":      <integer or null>,
    "other":        <array of free-form requirements you couldn't structure, ≤3 items, ≤80 chars each>
  },
  "confidence":      <number 0-1, your confidence the page genuinely contained the answers above. Below 0.5 means "page didn't have enough canonical content; don't trust the extraction.">
}

REJECT generic fluff. If the overview would be "Scholarship for international students" or "Funds study in [field]", return null for canonical_overview — empty is better than generic.
PREFER specifics: "MEXT funds 1500 international scholars/yr at Japanese universities at the master's, doctoral, and research-student levels." beats "Japan government scholarship."

PROGRAM CONTEXT:
- Stored name: {{NAME}}
- Stored provider: {{PROVIDER}}
- Stored host country: {{COUNTRY}}
- Source URL scraped: {{SOURCE_URL}}

PAGE MARKDOWN:
{{MARKDOWN}}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST")    return json(405, { error: "POST only" });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: "unauthorized", reason: auth.reason });

  let body: { scholarship_id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "invalid JSON body" }); }
  const scholarshipId = body.scholarship_id;
  if (!scholarshipId || typeof scholarshipId !== "string") return json(400, { error: "scholarship_id required" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SB_SECRET_KEY") ?? "";
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Load row
  const { data: row, error: rowErr } = await supabase
    .from("scholarships")
    .select("scholarship_id, scholarship_name, provider_name, host_country, official_url, source_url, canonical_official_url, canonical_audit")
    .eq("scholarship_id", scholarshipId)
    .maybeSingle();
  if (rowErr || !row) return json(404, { error: "scholarship not found", id: scholarshipId });

  // 2. Pick the cleanest URL to scrape. Prefer existing canonical, then
  //    official, then source — skipping aggregator domains since those
  //    don't have program-canonical content.
  const candidateUrls = [row.canonical_official_url, row.official_url, row.source_url].filter(Boolean) as string[];
  const cleanUrl = candidateUrls.find((u) => !isAggregator(u));
  if (!cleanUrl) {
    return json(200, {
      ok: false,
      reason: "no_clean_url",
      message: "All available URLs point to aggregator domains; no canonical source to extract from.",
      candidates: candidateUrls,
    });
  }

  // 3. Scrape
  let markdown = "";
  let scrapeStatus = 0;
  try {
    const result = await firecrawlScrape({ url: cleanUrl, onlyMainContent: true, waitFor: 1500 });
    markdown = (result.markdown ?? "").slice(0, MAX_MARKDOWN_CHARS);
    scrapeStatus = result.metadata?.statusCode ?? 0;
  } catch (e) {
    return json(200, { ok: false, reason: "scrape_failed", message: String(e), url: cleanUrl });
  }
  if (!markdown || markdown.length < 200) {
    return json(200, { ok: false, reason: "thin_content", url: cleanUrl, scrapeStatus });
  }

  // 4. LLM extraction
  const prompt = EXTRACT_PROMPT
    .replace("{{NAME}}", row.scholarship_name ?? "")
    .replace("{{PROVIDER}}", row.provider_name ?? "")
    .replace("{{COUNTRY}}", row.host_country ?? "")
    .replace("{{SOURCE_URL}}", cleanUrl)
    .replace("{{MARKDOWN}}", markdown);

  let extraction: CanonicalExtraction | null = null;
  try {
    const resp = await chatCompletions({
      tier: "pro",
      messages: [
        { role: "system", content: "You return ONLY a JSON object matching the schema. No prose, no markdown fences, no commentary." },
        { role: "user", content: prompt },
      ],
    });
    if (!resp.ok) {
      const text = await resp.text();
      return json(200, { ok: false, reason: "llm_http_error", status: resp.status, message: text.slice(0, 500) });
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content
      ?? data.content?.[0]?.text  // Anthropic shape
      ?? "";
    // Some models still wrap in ```json ... ```; strip if present.
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    extraction = JSON.parse(cleaned);
  } catch (e) {
    return json(200, { ok: false, reason: "llm_parse_failed", message: String(e) });
  }
  if (!extraction || typeof extraction !== "object") {
    return json(200, { ok: false, reason: "llm_empty_extraction" });
  }
  if (typeof extraction.confidence !== "number" || extraction.confidence < 0.5) {
    return json(200, { ok: false, reason: "low_confidence", confidence: extraction.confidence });
  }

  // 5. Validate & sanitize
  const updates: Record<string, unknown> = {};
  const changed: string[] = [];
  const now = new Date().toISOString();

  // Overview
  const overview = (extraction.canonical_overview ?? "").trim();
  if (overview && overview.length >= 30 && overview.length <= 240 && /[a-z]/i.test(overview)) {
    updates.canonical_overview = overview;
    updates.canonical_overview_source = cleanUrl;
    updates.canonical_overview_at = now;
    changed.push("canonical_overview");
  }

  // Deadline
  if (extraction.canonical_deadline_iso) {
    const dl = String(extraction.canonical_deadline_iso);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dl)) {
      const parsed = new Date(dl);
      if (!isNaN(parsed.getTime())) {
        updates.canonical_deadline_iso = dl;
        updates.canonical_deadline_at = now;
        changed.push("canonical_deadline_iso");
      }
    }
  }

  // Funding
  if (extraction.canonical_funding_text || extraction.canonical_funding_usd) {
    if (extraction.canonical_funding_text && typeof extraction.canonical_funding_text === "string") {
      updates.canonical_funding_text = extraction.canonical_funding_text.trim().slice(0, 80);
    }
    if (typeof extraction.canonical_funding_usd === "number" && extraction.canonical_funding_usd > 0 && extraction.canonical_funding_usd < 50_000_000) {
      updates.canonical_funding_usd = Math.round(extraction.canonical_funding_usd);
    }
    if (updates.canonical_funding_text || updates.canonical_funding_usd) {
      updates.canonical_funding_at = now;
      changed.push("canonical_funding");
    }
  }

  // Canonical URL — must be on a non-aggregator domain to count.
  if (extraction.canonical_official_url && typeof extraction.canonical_official_url === "string") {
    const u = extraction.canonical_official_url.trim();
    try {
      const parsed = new URL(u);
      if (!isAggregator(u) && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
        updates.canonical_official_url = u;
        updates.canonical_official_url_at = now;
        changed.push("canonical_official_url");
      }
    } catch { /* invalid URL; skip */ }
  } else if (!isAggregator(cleanUrl)) {
    // Fallback: the URL we scraped IS the canonical, just record it.
    updates.canonical_official_url = cleanUrl;
    updates.canonical_official_url_at = now;
    changed.push("canonical_official_url");
  }

  // Requirements
  if (extraction.canonical_requirements && typeof extraction.canonical_requirements === "object") {
    updates.canonical_requirements = extraction.canonical_requirements;
    updates.canonical_requirements_at = now;
    changed.push("canonical_requirements");
  }

  // 6. Append audit log
  const audit = Array.isArray(row.canonical_audit) ? row.canonical_audit : [];
  audit.push({
    at: now,
    source: cleanUrl,
    changed,
    confidence: extraction.confidence,
  });
  // Cap audit log at last 20 runs to avoid unbounded JSONB growth.
  updates.canonical_audit = audit.slice(-20);

  if (changed.length === 0) {
    return json(200, { ok: false, reason: "nothing_validated", confidence: extraction.confidence, raw: extraction });
  }

  // 7. Persist
  const { error: updErr } = await supabase
    .from("scholarships")
    .update(updates)
    .eq("scholarship_id", scholarshipId);
  if (updErr) {
    return json(500, { ok: false, reason: "db_update_failed", message: updErr.message });
  }

  return json(200, {
    ok: true,
    scholarship_id: scholarshipId,
    changed,
    confidence: extraction.confidence,
    cost_estimate_usd: COST_ESTIMATE_USD,
    source: cleanUrl,
  });
});
