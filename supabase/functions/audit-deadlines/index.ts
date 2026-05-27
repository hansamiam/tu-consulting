// audit-deadlines
//
// Verifies one scholarship's stored deadline against its official page.
// Writes a row to deadline_audit_log with the verdict. Does NOT mutate
// the scholarships row — that's a separate admin decision (or a future
// auto-promotion gate). This function is "observe and log," not "fix."
//
// Pipeline per row:
//   1. Pick the best URL (canonical_official_url > official_url > source_url)
//   2. Firecrawl-scrape the page (JS-rendered markdown)
//   3. Ask the LLM to extract the application deadline for the NEXT future
//      cycle, with a structured verdict comparing to the stored value
//   4. INSERT the verdict + observed deadline + source into deadline_audit_log
//
// Cost: ~$0.001 Firecrawl + ~$0.002 flash LLM = ~$0.003/row. The companion
// audit-deadlines-cron paces N rows/day to stay under budget.
//
// Auth: admin or service_role only. Called by cron (service_role) and
// from the admin UI (admin button "re-verify this row").
//
// Request body:
//   { scholarship_id: uuid }
//
// Response:
//   { ok: true, status: "match" | "mismatch" | "inconclusive" | "rolling",
//     observed_deadline: "YYYY-MM-DD" | null,
//     confidence: 0-1, notes: string }

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson, respondError } from "../_shared/http.ts";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { extractLlmJson } from "../_shared/llm-json.ts";
import { firecrawlScrape } from "../_shared/firecrawl.ts";

const json = (status: number, body: unknown) => respondJson(status, body, corsHeaders);
const err  = (status: number, message: string, extra?: Record<string, unknown>) =>
  respondError(status, message, corsHeaders, extra);

interface ReqBody { scholarship_id?: string }

// Hard cap on the LLM page slice. Scholarship pages are usually 2–8KB
// of meaningful prose; 24KB is generous for the rare long page and
// keeps the prompt under ~6k tokens.
const PAGE_CHAR_BUDGET = 24_000;

interface AuditVerdict {
  status: "match" | "mismatch" | "inconclusive" | "rolling";
  observed_deadline: string | null;  // ISO YYYY-MM-DD
  confidence: number;                // 0..1
  notes: string;                     // single sentence, max ~200 chars
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return err(401, auth.reason ?? "unauthorized");

  let body: ReqBody;
  try { body = await req.json(); }
  catch { return err(400, "invalid JSON body"); }

  const scholarshipId = body.scholarship_id?.trim();
  if (!scholarshipId) return err(400, "scholarship_id required");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return err(500, "SUPABASE_URL / service key missing from env");
  const supa = createClient(supabaseUrl, serviceKey);

  // Load the row. Use the same URL-fallback policy as the catalog picker
  // so the audit hits the same surface the catalog would have used.
  const { data: row, error: loadErr } = await supa
    .from("scholarships")
    .select(`
      scholarship_id, scholarship_name, provider_name, host_country,
      application_deadline, canonical_deadline_iso, deadline_type,
      canonical_official_url, official_url, source_url, is_published
    `)
    .eq("scholarship_id", scholarshipId)
    .maybeSingle();
  if (loadErr) return err(500, "DB load failed", { detail: loadErr.message });
  if (!row)    return err(404, "scholarship not found");

  const url = row.canonical_official_url || row.official_url || row.source_url;
  if (!url) {
    await writeAudit(supa, scholarshipId, row, {
      status: "inconclusive",
      observed_deadline: null,
      confidence: 0,
      notes: "no URL on row — cannot audit",
    });
    return json(200, { ok: true, status: "inconclusive", reason: "no_url" });
  }

  // Fetch the page. Firecrawl renders JS, so SPA-heavy provider sites
  // (DAAD, Eiffel, several university aid pages) produce usable markdown.
  let pageMarkdown: string;
  try {
    const scrape = await firecrawlScrape({ url, onlyMainContent: true, timeout: 30_000 });
    pageMarkdown = (scrape.markdown ?? "").slice(0, PAGE_CHAR_BUDGET);
    if (!pageMarkdown.trim()) {
      await writeAudit(supa, scholarshipId, row, {
        status: "inconclusive",
        observed_deadline: null,
        confidence: 0,
        notes: `scrape returned empty page (status ${scrape.metadata?.statusCode ?? "?"})`,
      });
      return json(200, { ok: true, status: "inconclusive", reason: "empty_page" });
    }
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    await writeAudit(supa, scholarshipId, row, {
      status: "inconclusive",
      observed_deadline: null,
      confidence: 0,
      notes: `scrape failed: ${msg.slice(0, 200)}`,
    });
    return json(200, { ok: true, status: "inconclusive", reason: "scrape_failed", detail: msg });
  }

  // Ask the LLM to compare. Strict JSON output. Today's date is passed in
  // explicitly so the model can reason about "next future cycle."
  const today = new Date().toISOString().slice(0, 10);
  const storedStr    = row.application_deadline    ?? "null";
  const canonicalStr = row.canonical_deadline_iso  ?? "null";

  const verdict = await askLlmForVerdict({
    name: row.scholarship_name,
    provider: row.provider_name ?? "",
    country: row.host_country ?? "",
    stored: storedStr,
    canonical: canonicalStr,
    deadlineType: row.deadline_type ?? "annual",
    today,
    page: pageMarkdown,
    url,
  });

  await writeAudit(supa, scholarshipId, row, verdict);

  return json(200, {
    ok: true,
    scholarship_id: scholarshipId,
    status: verdict.status,
    observed_deadline: verdict.observed_deadline,
    confidence: verdict.confidence,
    notes: verdict.notes,
    page_chars: pageMarkdown.length,
  });
});

/* ─── helpers ─────────────────────────────────────────────────────────── */

async function writeAudit(
  supa: any,
  scholarshipId: string,
  row: {
    application_deadline: string | null;
    canonical_deadline_iso: string | null;
  },
  v: AuditVerdict,
): Promise<void> {
  // No throw on failure — the function's primary return value is the
  // verdict to the caller; a failed insert is operationally bad but
  // shouldn't block the response. Log loudly so the cron's per-row
  // result still surfaces the issue in the run-level summary.
  const { error: insErr } = await supa.from("deadline_audit_log").insert({
    scholarship_id:     scholarshipId,
    stored_at_audit:    row.application_deadline,
    canonical_at_audit: row.canonical_deadline_iso,
    observed_deadline:  v.observed_deadline,
    observed_source:    null, // filled by the LLM via `notes` for now; future: parse out
    status:             v.status,
    confidence:         v.confidence,
    verifier:           "audit-deadlines-v1",
    notes:              v.notes,
  });
  if (insErr) console.error("[audit-deadlines] log insert failed", insErr);
}

async function askLlmForVerdict(args: {
  name: string;
  provider: string;
  country: string;
  stored: string;
  canonical: string;
  deadlineType: string;
  today: string;
  page: string;
  url: string;
}): Promise<AuditVerdict> {
  const sys =
    "You are a meticulous fact-checker auditing scholarship application deadlines. " +
    "Your only job is to extract the application deadline that this provider's OFFICIAL page advertises " +
    "for the NEXT FUTURE cycle (a date >= today), then compare it against the stored value. " +
    "Be conservative — when the page does not clearly state a deadline, return 'inconclusive'. " +
    "Do not invent dates from outside the page. " +
    "When the page says the program is rolling / continuous / 'no fixed deadline', return 'rolling'. " +
    "Output strict JSON.";

  const user = `
Today's date: ${args.today}.

Scholarship: ${args.name}
Provider:    ${args.provider}
Country:     ${args.country}
Deadline type (catalog):   ${args.deadlineType}
Stored application_deadline: ${args.stored}
Stored canonical_deadline:   ${args.canonical}
Source URL: ${args.url}

PAGE CONTENT (markdown, may be truncated):
"""
${args.page}
"""

INSTRUCTIONS
1. Read the page. Identify the application DEADLINE (closing date), not the opening date, notification date, or program start date. Many pages list all four — pick the deadline only.
2. If the program has multiple deadlines (constituency-specific, scholarship-specific within a fund), pick the one most likely to apply to a typical international applicant. Note your choice in 'notes'.
3. If the page makes clear the program is rolling with no fixed deadline, return status='rolling'.
4. Compare your observed deadline against the stored value:
   - status='match' if your observed date equals stored exactly OR is within 3 days of stored (off-by-one timezone/EOD ambiguity is fine)
   - status='mismatch' if your observed date differs by >3 days from stored
   - status='inconclusive' if the page doesn't clearly state a deadline
5. Confidence:
   - 0.9+ if the page literally states "application deadline: <date>"
   - 0.7-0.85 if the page states a closing date but with some ambiguity (e.g., timezone unstated, multiple cycles)
   - 0.4-0.6 if you had to infer from indirect language
   - <0.4 means status should be 'inconclusive'

OUTPUT (strict JSON, no prose, no code fences):
{
  "status":            "match" | "mismatch" | "inconclusive" | "rolling",
  "observed_deadline": "YYYY-MM-DD" | null,
  "confidence":        0.0-1.0,
  "notes":             "one short sentence — say which date you picked and from where on the page"
}
`.trim();

  try {
    const resp = await chatCompletions({
      tier: "flash",
      jsonMode: true,
      messages: [
        { role: "system", content: sys },
        { role: "user",   content: user },
      ],
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        status: "inconclusive",
        observed_deadline: null,
        confidence: 0,
        notes: `LLM HTTP ${resp.status}: ${text.slice(0, 160)}`,
      };
    }

    const completion = await resp.json();
    // OpenAI-compat shape (Lovable, OpenAI). Anthropic returns differently;
    // chatCompletions handles the translation upstream so the shape here
    // is always the OpenAI one when streaming=false. Defensive: tolerate
    // a missing field rather than throwing.
    const raw: string =
      completion?.choices?.[0]?.message?.content
      ?? completion?.content?.[0]?.text
      ?? "";
    if (!raw) {
      return {
        status: "inconclusive", observed_deadline: null, confidence: 0,
        notes: "empty LLM response",
      };
    }

    const parsed = extractLlmJson(raw) as Partial<AuditVerdict>;
    return validateVerdict(parsed);
  } catch (e) {
    return {
      status: "inconclusive",
      observed_deadline: null,
      confidence: 0,
      notes: `LLM call threw: ${(e as Error).message?.slice(0, 200) ?? String(e)}`,
    };
  }
}

function validateVerdict(p: Partial<AuditVerdict>): AuditVerdict {
  const status = (p.status === "match" || p.status === "mismatch"
                  || p.status === "inconclusive" || p.status === "rolling")
                  ? p.status : "inconclusive";

  // Date must be YYYY-MM-DD and either match status semantics or be null.
  let observed: string | null = null;
  if (typeof p.observed_deadline === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(p.observed_deadline)) {
    observed = p.observed_deadline;
  }

  let confidence = typeof p.confidence === "number" ? p.confidence : 0;
  if (Number.isNaN(confidence) || confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  const notes = (typeof p.notes === "string" ? p.notes : "").slice(0, 500);

  // If status is rolling/inconclusive, observed_deadline should be null.
  if (status === "rolling" || status === "inconclusive") {
    observed = null;
  }

  return { status, observed_deadline: observed, confidence, notes };
}
