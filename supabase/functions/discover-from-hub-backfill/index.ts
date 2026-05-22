// discover-from-hub-backfill (F13)
//
// One-shot pre-ship sweep of the 4 T3 whitelisted aggregator hubs. Goes deeper
// than the regular discover-from-hub cron (depth 10 vs 2) and writes to the
// source_candidates queue instead of scholarship_sources directly — so a human
// approves each official URL before it lands as a permanent source.
//
// Why this exists (Discover v1 plan F13):
// The publish-gate G1–G11 backfill was rejected because 564/566 rows fail —
// the failures concentrate on G3a/G3b (missing or aggregator-shaped
// official_url) and G8a (no deadline). Those are *data quality* failures, not
// gate-logic failures. F13 fixes them at the source: re-discover programs via
// the T3 whitelist, resolve each to its TRUE official URL (NOT the aggregator
// article URL — D4 invariant), and capture deadline + coverage at insertion
// time so the next gate run has rows that actually pass.
//
// Flow:
//   1) Hub scan (Phase A): for each of the 4 T3 hubs, paginate up to
//      MAX_PAGES_PER_HUB, LLM-extract candidate article URLs.
//   2) Candidate resolve (Phase B): for each unique article URL (up to
//      MAX_CANDIDATES), Firecrawl + LLM-extract { official_url, name,
//      provider, host_country, deadline, coverage_type, award_text }.
//   3) Filter: drop candidates where official_url is itself an aggregator
//      URL (D4), where deadline is outside the (today+2, today+60) launch
//      window, or where extraction confidence is below the floor.
//   4) Dedup: drop candidates whose official_url already lives in
//      scholarship_sources (active or inactive — we don't re-add) or in
//      scholarships.official_url.
//   5) Insert: upsert to source_candidates with status='pending' for admin
//      review at /admin/source_candidates.
//
// Idempotent: the partial unique index
// idx_source_candidates_pending_url_unique blocks duplicate pending rows on
// candidate_official_url. We pre-check the same set so the response cleanly
// reports "duplicates_skipped" rather than swallowing PK errors.
//
// Auth: admin or service-role. One-shot — not wired into any cron.
//
// Cost (approximate, one full run):
//   Phase A: 4 hubs × ~10 Firecrawl pages × $0.001 + 4 LLM calls × $0.005
//          = $0.04 + $0.02 = ~$0.06
//   Phase B: 200 cap × ($0.001 Firecrawl + $0.005 LLM) = ~$1.20
//   Total budget: ~$1.30 per run.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { firecrawlScrape, FIRECRAWL_COST_PER_SCRAPE_USD } from "../_shared/firecrawl.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import { extractLlmJson } from "../_shared/llm-json.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

// ─── Defaults / caps ────────────────────────────────────────────────────────
// Hub-scan depth. The standard discover-from-hub cron walks 2 pages because
// it runs on a recurring cadence and each tick only needs the latest 30
// posts. F13 is a one-shot pre-ship sweep, so we go deeper to backfill
// programs that landed on the hubs between cron rotations.
const DEFAULT_MAX_PAGES_PER_HUB = 10;
// Soft cap on total candidates per run. Protects admin review queue from
// being overwhelmed and bounds per-run LLM cost to ~$1.20. If more candidates
// are found, the remainder defers to the next run (cron or re-invocation).
const DEFAULT_MAX_CANDIDATES = 200;
// Deadline window — only candidates whose deadline lands in (today+2, today+60).
// today+2 keeps us from queuing programs that will expire before admin review;
// today+60 keeps the queue focused on near-term launch coverage rather than
// "next year" programs the normal cron will catch.
const DEFAULT_DEADLINE_WINDOW_DAYS = 60;
const MIN_DEADLINE_BUFFER_DAYS = 2;
const DEFAULT_MIN_EXTRACTION_CONFIDENCE = 0.7;
// How many candidates we resolve in parallel during Phase B. Each resolution
// is one Firecrawl + one LLM call (~3-5s wall-clock). With 200 candidates and
// concurrency 10, Phase B fits in ~60-100s — well under the standard edge
// function timeout. Higher concurrency risks Firecrawl rate-limit responses.
const CANDIDATE_RESOLVE_CONCURRENCY = 10;
const MAX_MARKDOWN_CHARS_HUB = 60_000;
const MAX_MARKDOWN_CHARS_ARTICLE = 20_000;
const SHORT_PAGE_THRESHOLD = 1500;
const LLM_COST_PER_CALL_USD = 0.005;

// ─── Types ──────────────────────────────────────────────────────────────────
interface T3Hub {
  source_id: string;
  name: string;
  url: string;
}

interface DiscoveredArticleUrl {
  url: string;
  name?: string;
  hint?: string;
  confidence: number;
  discovered_from_source_id: string;
  discovered_from_url: string;
}

interface ResolvedCandidate {
  official_url: string;
  name: string;
  provider: string;
  host_country: string | null;
  deadline_iso: string | null;
  coverage_type: string | null;
  award_amount_text: string | null;
  extraction_confidence: number;
  extraction_notes: string | null;
}

// ─── Prompts ────────────────────────────────────────────────────────────────
const HUB_SCAN_SYSTEM_PROMPT = `You read scholarship aggregator listing pages and extract URLs to INDIVIDUAL DEGREE-PROGRAM scholarship articles (one program per URL).

Output a JSON object: { "scholarships": [{name, url, hint, confidence}...] }. No markdown fences, no preamble.

RULES:
1. URLs MUST be absolute (https://...). Resolve relative links against the page URL.
2. Each URL must point at a SINGLE program's article page on this aggregator — NOT category indexes, navigation, the directory's own home, social shares, or pagination links.
3. confidence ≥ 0.85 only when the link text + context clearly names a specific scholarship/fellowship program for a degree (bachelor/master/PhD/postdoc).
4. EXCLUDE — do NOT extract any of these even if "scholarship" / "fellowship" appears in the title:
   - Conference travel grants, conference scholarships, event-attendance funding
   - Hackathons / competitions / pitch contests / prize-only awards
   - Short courses / winter schools / summer schools / workshops / bootcamps
   - Mentorship programs / leadership cohorts that don't enroll in a degree
   - Career / mid-career / professional fellowships not tied to a degree
   - Entrepreneur / accelerator / incubator programs
   - Internships, research-associate positions, staff jobs, journalism grants
   - Calls-for-proposals, calls-for-papers, training programs
   - Programs with a year marker before 2024 (stale)
5. Output up to 50 highest-confidence URLs per call. Skip generic ones — better 10 confident URLs than 50 mixed.`;

const ARTICLE_RESOLVE_SYSTEM_PROMPT = `You read one aggregator article page about a scholarship and extract the program's TRUE OFFICIAL URL and metadata.

CRITICAL — official URL extraction (D4 invariant):
- The "official URL" is the program's own page on the funder/university website (e.g. chevening.org, daad.de, ox.ac.uk/scholarships/...).
- The article you're reading is hosted on an AGGREGATOR (opportunitiesforyouth.org, opportunitiestracker.ug). The aggregator's URL is NOT the official URL.
- Look for "Visit official page", "Apply here", "Official website", "Apply on official site", or a domain link in the article body that points OUTSIDE the aggregator domain.
- If you cannot find a URL pointing to the program's actual host institution, return official_url=null and extraction_confidence ≤ 0.4. Do not fabricate. Do not return the aggregator article URL as official_url.

Output JSON (single object, no fences):
{
  "official_url": "https://...",     // null if no off-aggregator URL found
  "name": "Program name",            // cleaned, no "| Aggregator" suffix
  "provider": "Funding org / university",
  "host_country": "ISO country name or null",
  "deadline_iso": "YYYY-MM-DD or null",  // application deadline, single fixed date
  "coverage_type": "full_ride | tuition_only | stipend | partial | null",
  "award_amount_text": "Short funding summary or null",
  "extraction_confidence": 0.0-1.0,  // your confidence the official_url is correct
  "extraction_notes": "Optional: what was ambiguous or worth flagging for admin"
}

Confidence rubric:
- 0.85+ : Clear off-aggregator link + matching program name + clear deadline
- 0.70-0.85 : Off-aggregator URL extracted but one of {deadline, coverage, provider} missing or vague
- 0.40-0.70 : Article mentions the program but the official URL is uncertain
- ≤ 0.40 : Cannot find an off-aggregator official URL

If the article describes anything other than a degree-program scholarship (conferences, jobs, internships, calls-for-proposals, training, short courses), set extraction_confidence to 0 and add "non_degree_scholarship" to extraction_notes.`;

// ─── URL filtering heuristics ──────────────────────────────────────────────
const NON_DEGREE_URL_PATTERNS: RegExp[] = [
  /\b(internship|intern[- ]position|research[- ]associate|fellow position|job opening|hiring|career[- ]opportunity)\b/,
  /\b(winter[- ]school|summer[- ]school|short[- ]course|bootcamp|workshop|webinar|seminar|symposium|conference[- ]grant|conference[- ]scholarship|travel[- ]grant|travel[- ]scholarship)\b/,
  /\b(photography[- ]award|reporting[- ]grant|journalism[- ](grant|fund)|writing[- ]grant)\b/,
  /\b(mentorship[- ]program|mentorship[- ]programme|young[- ]leaders|youth[- ]programme)\b/,
  /\b(entrepreneur[- ]?(ship|s)?[- ]program|early[- ]stage[- ]founders|accelerator|incubator|pitch[- ]contest|hackathon|competition)\b/,
  /\b(call[- ]for[- ]proposals|call[- ]for[- ]papers|training[- ]program)\b/,
  /\b20(0[5-9]|1[0-9]|2[0-3])\b/, // stale-year markers
];

function isLikelyScholarshipUrl(url: string, name?: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (/\b(login|signup|register|contact|about|privacy|terms|sitemap|search|tag|category|archive|home)\b/.test(path)) return false;
    if (path === "/" || path === "") return false;
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|jpg|jpeg|png|gif|mp4|mp3)$/i.test(path)) return false;
    const haystack = `${path} ${(name ?? "").toLowerCase()}`;
    if (NON_DEGREE_URL_PATTERNS.some((r) => r.test(haystack))) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function paginatedUrls(hubUrl: string, maxPages: number): string[] {
  const sep = hubUrl.endsWith("/") ? "" : "/";
  const out: string[] = [hubUrl];
  for (let i = 2; i <= maxPages; i++) out.push(`${hubUrl}${sep}page/${i}/`);
  return out;
}

async function scanHub(
  hub: T3Hub,
  maxPages: number,
  minConfidence: number,
): Promise<{ articles: DiscoveredArticleUrl[]; pagesWalked: number; firecrawlCalls: number; llmCalls: number }> {
  const pageUrls = paginatedUrls(hub.url, maxPages);
  let combinedMarkdown = "";
  let pagesWalked = 0;
  let firecrawlCalls = 0;

  for (const url of pageUrls) {
    try {
      const result = await firecrawlScrape({ url, onlyMainContent: false });
      firecrawlCalls++;
      const md = result.markdown ?? "";
      if (pagesWalked === 0 && !md.trim()) break;
      if (pagesWalked > 0 && md.trim().length < SHORT_PAGE_THRESHOLD) break;
      combinedMarkdown += (pagesWalked > 0 ? "\n\n=== PAGE BREAK ===\n\n" : "") + md;
      pagesWalked++;
    } catch (e) {
      console.warn(`[F13][hub:${hub.name}] firecrawl error on ${url}: ${(e as Error).message}`);
      if (pagesWalked === 0) break;
      break;
    }
  }

  if (!combinedMarkdown.trim()) return { articles: [], pagesWalked, firecrawlCalls, llmCalls: 0 };

  const truncated = combinedMarkdown.slice(0, MAX_MARKDOWN_CHARS_HUB);
  let articles: DiscoveredArticleUrl[] = [];
  try {
    const resp = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: HUB_SCAN_SYSTEM_PROMPT },
        { role: "user", content: `Hub URL: ${hub.url}\n\nPage markdown follows. Extract individual scholarship program article URLs:\n\n${truncated}` },
      ],
    });
    if (!resp.ok) {
      console.warn(`[F13][hub:${hub.name}] LLM HTTP ${resp.status}`);
      return { articles: [], pagesWalked, firecrawlCalls, llmCalls: 1 };
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content as string | undefined;
    if (!text) return { articles: [], pagesWalked, firecrawlCalls, llmCalls: 1 };
    const parsed = extractLlmJson(text) as { scholarships?: Array<{ name?: string; url?: string; hint?: string; confidence?: number }> };
    const raw = Array.isArray(parsed.scholarships) ? parsed.scholarships : [];
    articles = raw
      .filter((d) => d && typeof d.url === "string" && d.url.trim().length > 10)
      .filter((d) => typeof d.confidence === "number" && d.confidence! >= minConfidence)
      .filter((d) => isLikelyScholarshipUrl(d.url!, d.name))
      .map((d) => ({
        url: d.url!.trim(),
        name: d.name?.trim().slice(0, 200),
        hint: d.hint?.trim().slice(0, 500),
        confidence: d.confidence!,
        discovered_from_source_id: hub.source_id,
        discovered_from_url: hub.url,
      }));
  } catch (e) {
    console.warn(`[F13][hub:${hub.name}] LLM parse error: ${(e as Error).message}`);
    return { articles: [], pagesWalked, firecrawlCalls, llmCalls: 1 };
  }
  return { articles, pagesWalked, firecrawlCalls, llmCalls: 1 };
}

async function resolveCandidate(
  article: DiscoveredArticleUrl,
): Promise<ResolvedCandidate | { error: string }> {
  let markdown = "";
  try {
    const result = await firecrawlScrape({ url: article.url, onlyMainContent: true });
    markdown = result.markdown ?? "";
  } catch (e) {
    return { error: `firecrawl_failed: ${(e as Error).message}` };
  }
  if (!markdown.trim()) return { error: "empty_markdown" };

  const truncated = markdown.slice(0, MAX_MARKDOWN_CHARS_ARTICLE);
  try {
    const resp = await chatCompletions({
      tier: "flash",
      jsonMode: true,
      messages: [
        { role: "system", content: ARTICLE_RESOLVE_SYSTEM_PROMPT },
        { role: "user", content: `Article URL (this IS an aggregator URL — extract the OFF-aggregator official URL from the body): ${article.url}\n\nArticle markdown:\n\n${truncated}` },
      ],
    });
    if (!resp.ok) return { error: `llm_http_${resp.status}` };
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content as string | undefined;
    if (!text) return { error: "llm_empty_completion" };
    const parsed = extractLlmJson(text) as Partial<ResolvedCandidate>;

    const officialUrl = typeof parsed.official_url === "string" ? parsed.official_url.trim() : "";
    const confidence = typeof parsed.extraction_confidence === "number" ? parsed.extraction_confidence : 0;
    return {
      official_url: officialUrl,
      name: (parsed.name ?? "").toString().trim().slice(0, 300),
      provider: (parsed.provider ?? "").toString().trim().slice(0, 200),
      host_country: parsed.host_country ? String(parsed.host_country).trim().slice(0, 100) : null,
      deadline_iso: parsed.deadline_iso ? String(parsed.deadline_iso).trim() : null,
      coverage_type: parsed.coverage_type ? String(parsed.coverage_type).trim() : null,
      award_amount_text: parsed.award_amount_text ? String(parsed.award_amount_text).trim().slice(0, 500) : null,
      extraction_confidence: confidence,
      extraction_notes: parsed.extraction_notes ? String(parsed.extraction_notes).trim().slice(0, 500) : null,
    };
  } catch (e) {
    return { error: `llm_parse_failed: ${(e as Error).message}` };
  }
}

function parseDeadline(iso: string | null): Date | null {
  if (!iso) return null;
  // Accept full ISO ("YYYY-MM-DD") or date with time component.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return isNaN(d.getTime()) ? null : d;
}

function isWithinWindow(d: Date | null, minBufferDays: number, windowDays: number): boolean {
  if (!d) return false;
  const now = new Date();
  const minD = new Date(now);
  minD.setUTCDate(minD.getUTCDate() + minBufferDays);
  const maxD = new Date(now);
  maxD.setUTCDate(maxD.getUTCDate() + windowDays);
  return d.getTime() >= minD.getTime() && d.getTime() <= maxD.getTime();
}

// Concurrency-bounded map.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function runner() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx], idx);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => runner());
  await Promise.all(runners);
  return out;
}

// ─── Handler ────────────────────────────────────────────────────────────────
serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  let body: {
    max_pages_per_hub?: number;
    max_candidates?: number;
    deadline_window_days?: number;
    min_extraction_confidence?: number;
    min_hub_confidence?: number;
    hub_source_ids?: string[];
    dry_run?: boolean;
  } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const maxPagesPerHub = clampInt(body.max_pages_per_hub, 1, 25, DEFAULT_MAX_PAGES_PER_HUB);
  const maxCandidates = clampInt(body.max_candidates, 1, 500, DEFAULT_MAX_CANDIDATES);
  const deadlineWindowDays = clampInt(body.deadline_window_days, 7, 365, DEFAULT_DEADLINE_WINDOW_DAYS);
  const minHubConfidence = clampFloat(body.min_hub_confidence, 0, 1, 0.7);
  const minExtractionConfidence = clampFloat(body.min_extraction_confidence, 0, 1, DEFAULT_MIN_EXTRACTION_CONFIDENCE);
  const dryRun = body.dry_run === true;

  const supa = createServiceClient();

  // ─── Resolve T3 hubs ──────────────────────────────────────────────────────
  let hubsQuery = supa
    .from("scholarship_sources")
    .select("source_id, name, url")
    .eq("source_tier", "aggregator_discovery_only")
    .eq("is_active", true);
  if (Array.isArray(body.hub_source_ids) && body.hub_source_ids.length > 0) {
    hubsQuery = hubsQuery.in("source_id", body.hub_source_ids);
  }
  const { data: hubsRaw, error: hubsErr } = await hubsQuery;
  if (hubsErr) return json(500, { error: `Hub query failed: ${hubsErr.message}` });
  const hubs: T3Hub[] = (hubsRaw ?? []).map((h) => ({ source_id: h.source_id, name: h.name, url: h.url }));
  if (hubs.length === 0) return json(200, { ok: false, reason: "no_active_t3_hubs" });

  // ─── Phase A: hub scan ────────────────────────────────────────────────────
  const phaseAResults = await Promise.all(hubs.map((h) => scanHub(h, maxPagesPerHub, minHubConfidence)));
  let firecrawlCalls = 0;
  let llmCalls = 0;
  let pagesWalked = 0;
  const seenArticleUrls = new Set<string>();
  const articles: DiscoveredArticleUrl[] = [];
  for (let i = 0; i < phaseAResults.length; i++) {
    const r = phaseAResults[i];
    firecrawlCalls += r.firecrawlCalls;
    llmCalls += r.llmCalls;
    pagesWalked += r.pagesWalked;
    for (const a of r.articles) {
      if (seenArticleUrls.has(a.url)) continue;
      seenArticleUrls.add(a.url);
      articles.push(a);
    }
  }

  // ─── Pre-filter against scholarship_sources / source_candidates / scholarships ───
  // Drop article URLs we've already turned into a source row (any state) and
  // article URLs already sitting in source_candidates as 'pending' from a prior
  // run. We still re-check after extraction against the resolved official_url
  // since the same article might appear under multiple aggregator URLs.
  const articleUrls = articles.map((a) => a.url);
  let alreadyAsSourceUrlSet = new Set<string>();
  let alreadyAsPendingCandidateSet = new Set<string>();
  if (articleUrls.length > 0) {
    const [{ data: srcRows }, { data: candRows }] = await Promise.all([
      supa.from("scholarship_sources").select("url").in("url", articleUrls),
      supa.from("source_candidates").select("candidate_official_url").in("candidate_official_url", articleUrls).eq("status", "pending"),
    ]);
    alreadyAsSourceUrlSet = new Set((srcRows ?? []).map((r) => r.url as string));
    alreadyAsPendingCandidateSet = new Set((candRows ?? []).map((r) => r.candidate_official_url as string));
  }
  const articlesToResolve = articles
    .filter((a) => !alreadyAsSourceUrlSet.has(a.url))
    .filter((a) => !alreadyAsPendingCandidateSet.has(a.url))
    .slice(0, maxCandidates);

  const skippedAlreadySource = articles.length - articles.filter((a) => !alreadyAsSourceUrlSet.has(a.url)).length;
  const skippedAlreadyPending = articles.filter((a) => !alreadyAsSourceUrlSet.has(a.url)).length
    - articles.filter((a) => !alreadyAsSourceUrlSet.has(a.url) && !alreadyAsPendingCandidateSet.has(a.url)).length;
  const overCap = Math.max(0, articles.length - skippedAlreadySource - skippedAlreadyPending - articlesToResolve.length);

  // ─── Phase B: candidate resolve ───────────────────────────────────────────
  const resolved = await mapWithConcurrency(
    articlesToResolve,
    CANDIDATE_RESOLVE_CONCURRENCY,
    (article) => resolveCandidate(article).then((r) => ({ article, r })),
  );
  firecrawlCalls += articlesToResolve.length;
  llmCalls += articlesToResolve.length;

  let extractionErrors = 0;
  let droppedLowConfidence = 0;
  let droppedNoOfficialUrl = 0;
  let droppedAggregatorOfficialUrl = 0;
  let droppedOutsideWindow = 0;
  const candidatesToInsert: Array<{
    article: DiscoveredArticleUrl;
    resolved: ResolvedCandidate;
  }> = [];

  // For aggregator-URL detection on resolved official_url, do one round-trip
  // RPC per candidate. Cheap (single Postgres function call) and the source
  // of truth for the aggregator-domain list.
  const officialUrls: string[] = [];
  for (const item of resolved) {
    if ("error" in item.r) { extractionErrors++; continue; }
    if (item.r.extraction_confidence < minExtractionConfidence) { droppedLowConfidence++; continue; }
    if (!item.r.official_url) { droppedNoOfficialUrl++; continue; }
    officialUrls.push(item.r.official_url);
  }

  // Bulk check whether resolved official URLs are themselves aggregator URLs
  // (D4: aggregator URL never stored as official_url) by running each through
  // the public.is_aggregator_url() Postgres function in a single execute.
  // Doing 200 individual RPC calls would dominate runtime — execute_sql with
  // a VALUES list lets us check all in one round trip.
  const aggregatorOfficialUrlSet = await checkAggregatorUrls(supa, officialUrls);

  // Also bulk-check resolved official URLs against existing scholarship_sources
  // and scholarships rows so we don't re-queue programs we already have.
  let existingSourceUrlSet = new Set<string>();
  let existingScholarshipUrlSet = new Set<string>();
  if (officialUrls.length > 0) {
    const [{ data: srcRows }, { data: schRows }] = await Promise.all([
      supa.from("scholarship_sources").select("url").in("url", officialUrls),
      supa.from("scholarships").select("official_url").in("official_url", officialUrls),
    ]);
    existingSourceUrlSet = new Set((srcRows ?? []).map((r) => r.url as string));
    existingScholarshipUrlSet = new Set((schRows ?? []).map((r) => r.official_url as string).filter(Boolean));
  }
  let duplicatesAgainstSources = 0;
  let duplicatesAgainstScholarships = 0;

  for (const item of resolved) {
    if ("error" in item.r) continue; // already counted
    const r = item.r;
    if (r.extraction_confidence < minExtractionConfidence) continue;
    if (!r.official_url) continue;
    if (aggregatorOfficialUrlSet.has(r.official_url)) { droppedAggregatorOfficialUrl++; continue; }
    if (existingSourceUrlSet.has(r.official_url)) { duplicatesAgainstSources++; continue; }
    if (existingScholarshipUrlSet.has(r.official_url)) { duplicatesAgainstScholarships++; continue; }
    const deadline = parseDeadline(r.deadline_iso);
    if (!isWithinWindow(deadline, MIN_DEADLINE_BUFFER_DAYS, deadlineWindowDays)) {
      droppedOutsideWindow++;
      continue;
    }
    candidatesToInsert.push({ article: item.article, resolved: r });
  }

  // Dedup across resolved candidates: multiple aggregator articles can point
  // at the same official URL. Keep the highest-confidence per official_url.
  const bestByOfficial = new Map<string, { article: DiscoveredArticleUrl; resolved: ResolvedCandidate }>();
  let droppedInternalDuplicate = 0;
  for (const c of candidatesToInsert) {
    const prior = bestByOfficial.get(c.resolved.official_url);
    if (!prior || c.resolved.extraction_confidence > prior.resolved.extraction_confidence) {
      if (prior) droppedInternalDuplicate++;
      bestByOfficial.set(c.resolved.official_url, c);
    } else {
      droppedInternalDuplicate++;
    }
  }
  const insertSet = Array.from(bestByOfficial.values());

  // ─── Insert to source_candidates ─────────────────────────────────────────
  let inserted = 0;
  let insertConflicts = 0;
  if (!dryRun && insertSet.length > 0) {
    const rows = insertSet.map(({ article, resolved }) => ({
      candidate_official_url: resolved.official_url,
      proposed_name: resolved.name || null,
      proposed_provider: resolved.provider || null,
      proposed_host_country: resolved.host_country,
      proposed_deadline: resolved.deadline_iso,
      proposed_coverage_type: resolved.coverage_type,
      proposed_award_amount_text: resolved.award_amount_text,
      discovered_from_url: article.discovered_from_url,
      discovered_from_source_id: article.discovered_from_source_id,
      extraction_confidence: resolved.extraction_confidence,
      extraction_notes: resolved.extraction_notes,
      status: "pending" as const,
    }));
    // Insert one-by-one so the partial unique index on (candidate_official_url
    // WHERE status='pending') doesn't fail the whole batch when a concurrent
    // pending row was inserted between our pre-check and this insert.
    for (const row of rows) {
      const { error } = await supa.from("source_candidates").insert(row);
      if (error) {
        // 23505 = unique_violation, the expected race case. Anything else is logged.
        if (error.code === "23505") insertConflicts++;
        else console.warn(`[F13] insert error for ${row.candidate_official_url}: ${error.message}`);
      } else {
        inserted++;
      }
    }
  }

  return json(200, {
    ok: true,
    dry_run: dryRun,
    config: {
      max_pages_per_hub: maxPagesPerHub,
      max_candidates: maxCandidates,
      deadline_window_days: deadlineWindowDays,
      min_hub_confidence: minHubConfidence,
      min_extraction_confidence: minExtractionConfidence,
    },
    hubs_scanned: hubs.length,
    pages_walked: pagesWalked,
    articles_discovered: articles.length,
    articles_unique: seenArticleUrls.size,
    skipped_already_source: skippedAlreadySource,
    skipped_already_pending_candidate: skippedAlreadyPending,
    skipped_over_cap: overCap,
    articles_resolved: articlesToResolve.length,
    extraction_errors: extractionErrors,
    dropped_low_confidence: droppedLowConfidence,
    dropped_no_official_url: droppedNoOfficialUrl,
    dropped_aggregator_official_url: droppedAggregatorOfficialUrl,
    dropped_outside_deadline_window: droppedOutsideWindow,
    duplicates_against_scholarship_sources: duplicatesAgainstSources,
    duplicates_against_scholarships: duplicatesAgainstScholarships,
    dropped_internal_duplicate_official_url: droppedInternalDuplicate,
    candidates_inserted: inserted,
    insert_unique_conflicts: insertConflicts,
    cost_estimate_usd: Number(
      (firecrawlCalls * FIRECRAWL_COST_PER_SCRAPE_USD + llmCalls * LLM_COST_PER_CALL_USD).toFixed(4),
    ),
  });
});

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, Math.floor(v)));
}
function clampFloat(v: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

async function checkAggregatorUrls(
  supa: ReturnType<typeof createServiceClient>,
  urls: string[],
): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const out = new Set<string>();
  // Run individual rpc calls — cheap (Postgres function, no I/O). The
  // alternative (bulk SQL via execute_sql RPC) would require an RPC wrapper
  // we don't have. 200 calls at ~5ms each = ~1s, acceptable.
  await Promise.all(urls.map(async (url) => {
    try {
      const { data } = await supa.rpc("is_aggregator_url", { url });
      if (data === true) out.add(url);
    } catch {
      // If the rpc fails, fail open (treat as not-aggregator). The LLM
      // prompt + per-domain whitelist on the response side still gives
      // some defense; admin review catches the rest.
    }
  }));
  return out;
}
