// discover-from-hub
//
// Self-expanding scholarship database. Takes an aggregator/directory URL
// (e.g. scholars4dev.com listing page) and extracts the individual
// scholarship page URLs hosted within it via LLM, then inserts each as
// a new row in scholarship_sources. The existing scrape-cron-dispatcher
// then crawls each new source on its normal cadence, generating
// scholarship rows in the catalogue.
//
// Effect: a single admin click on one hub URL can multiply the source
// registry by 10-50x. Combined with the existing dispatcher + scrape +
// verify chain, this turns the "scale 200 → 1000+" ask into automation
// rather than manual URL collection.
//
// Idempotent: existing scholarship_sources rows (matched by URL) are
// skipped. Re-running on the same hub re-extracts and only inserts
// genuinely new URLs.
//
// Cost: ~$0.025 per hub crawl ($0.02 Firecrawl for up to 2 pagination
// pages + ~$0.005 pro-tier LLM call against the combined markdown).
// Discovery yield ~2× the prior single-page walk, so cost-per-URL
// is actually lower. Cached server-side via the dispatcher's
// content-hash check on the individual sources, so cost is paid once
// per discovery + ongoing per-source crawls (which already short-
// circuit on unchanged content).
//
// Auth: admin or service-role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletions } from "../_shared/ai-gateway.ts";
import { firecrawlScrape, FIRECRAWL_COST_PER_SCRAPE_USD } from "../_shared/firecrawl.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

const MAX_MARKDOWN_CHARS = 60_000;
// Hard cap on URLs we'll insert from one hub crawl. The LLM occasionally
// hallucinates dozens of "scholarships" that are actually category links.
// Cap protects against runaway insertion if the prompt is bypassed.
const MAX_DISCOVERED_PER_HUB = 80;
const LLM_COST_PER_DISCOVERY_USD = 0.005;

interface DiscoveredScholarship {
  name: string;
  url: string;
  /** Free-text hint to seed parser_hint when this row is later crawled. */
  hint?: string;
  /** LLM's confidence that this is a real per-program scholarship URL
   *  (not a category page, the hub home, etc.). 0-1. */
  confidence: number;
}

const SYSTEM_PROMPT = `You read scholarship aggregator / directory pages and extract URLs that point to INDIVIDUAL scholarship programs (not category indexes, not the directory's home page, not navigation).

For each individual scholarship link you find on the page, output a JSON entry with the program name, its absolute URL, an optional 1-line parser_hint, and a confidence score 0-1.

CRITICAL RULES:
1. URLs MUST be absolute (https://...). If the page has relative links, resolve them against the page URL.
2. Skip URLs that lead to:
   - Category pages ("Master's scholarships", "PhD scholarships")
   - The directory's own home / about / contact pages
   - Social media share links
   - Random news articles
   - Pagination / "next page" links
3. Only include URLs that look like a real scholarship program page (a single program with a deadline, eligibility, and application info — even if you can't see it from the listing snippet).
4. confidence is HIGH (0.85+) only when the link text + surrounding context clearly names a specific scholarship and you can confirm the URL points to a per-program page (not a listing).
5. Output a JSON object: { "scholarships": [{name, url, hint, confidence}...] }. No markdown fences, no preamble.
6. Cap your output at the 50 highest-confidence URLs. Skip generic ones.`;

function isolateJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

function isLikelyScholarshipUrl(url: string): boolean {
  // Heuristic gate before insertion. Block the categories of bad URL the
  // LLM occasionally returns despite the prompt.
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    // Block the obvious junk
    if (/\b(login|signup|register|contact|about|privacy|terms|sitemap|search|tag|category|archive|page|home)\b/.test(path)) return false;
    if (path === "/" || path === "" || path.match(/^\/(en|us|uk|au)?\/?$/)) return false;
    // Block file-extension downloads (we want HTML pages, not PDFs from the hub itself).
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|jpg|jpeg|png|gif|mp4|mp3)$/i.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  let body: { hub_source_id?: string; hub_url?: string; min_confidence?: number };
  try { body = await req.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  const minConfidence = typeof body.min_confidence === "number" ? body.min_confidence : 0.7;
  const supa = createServiceClient();

  // Resolve the hub URL — caller passes either a source_id (preferred,
  // links the run to the registry row) or a raw URL (one-shot).
  let hubUrl: string | null = null;
  let hubName = "ad-hoc hub";
  let hubRegion: string | null = null;
  let hubCategory: string | null = null;
  if (body.hub_source_id) {
    const { data: src, error: srcErr } = await supa
      .from("scholarship_sources")
      .select("source_id, name, url, region, category")
      .eq("source_id", body.hub_source_id)
      .maybeSingle();
    if (srcErr || !src) return json(404, { error: "Hub source not found" });
    hubUrl = src.url;
    hubName = src.name;
    hubRegion = src.region;
    hubCategory = src.category;
  } else if (body.hub_url) {
    hubUrl = body.hub_url;
  } else {
    return json(400, { error: "Either hub_source_id or hub_url required" });
  }

  // 2026-05-18: Stamp last_crawled_at IMMEDIATELY for hub-source-id runs,
  // BEFORE any work that could fail. Pre-fix the stamp lived at the end
  // of the success path, so any early-return (empty markdown, fetch
  // failed, LLM HTTP error, parse failed, zero candidates) left the
  // hub at last_crawled_at=NULL. The hubs-cron's `NULLS FIRST` ordering
  // then picked the SAME dead hub every 6h forever, while ~21 newly
  // seeded hubs (including opportunitytracker.ug — user-priority) sat
  // at NULL waiting for a slot they'd never get. last_success_at +
  // consecutive_failures=0 still only flip on actual success at the
  // bottom of this function.
  if (body.hub_source_id) {
    const { error: preStampErr } = await supa
      .from("scholarship_sources")
      .update({ last_crawled_at: new Date().toISOString() })
      .eq("source_id", body.hub_source_id);
    if (preStampErr) console.warn("[discover-from-hub] pre-stamp failed", preStampErr.message);
  }

  // Fetch the hub page + up to 2 paginated successors. Most aggregator
  // hubs (especially WordPress-based ones — opportunitiesforyouth.org,
  // opportunitytracker.ug, opportunitydesk.org, scholars4dev.com,
  // afterschoolafrica.com) paginate at /page/2/, /page/3/. Page 1
  // covers ~15 most-recent posts; pages 2-3 surface another 30 posts'
  // worth of URLs without re-harvesting any. We pass NO onlyMainContent
  // so the LLM can see navigation + sidebar links (which are exactly
  // what we're after on directory pages).
  //
  // Resilient to non-WordPress sites: if a /page/N/ URL returns empty
  // or a 404-shaped page (Firecrawl just gives us short / boilerplate
  // markdown), we stop and use what we already have. Cost: at most
  // 3× Firecrawl per hub (~$0.03 vs $0.01 prior) — but the URL
  // discovery yield is ~3-4× higher, so cost-per-discovered-URL
  // is actually lower.
  // 2 pages strikes the budget balance: ~30 listings per hub (vs. ~15
  // single-page), Firecrawl cost stays under $0.02/hub, and per-hub
  // runtime stays around 10-15s so the cron dispatcher's 12-hub /
  // 60s-timeout envelope still holds.
  const MAX_PAGES = 2;
  const SHORT_PAGE_THRESHOLD = 1500; // chars; below this it's almost
                                     // certainly an empty / 404 page
  const pageUrls: string[] = [hubUrl];
  for (let i = 2; i <= MAX_PAGES; i++) {
    // WordPress canonical pagination. Append /page/N/ (with both
    // trailing-slash variants handled by URL normalization). Won't
    // hurt non-WordPress sites — they'll just return their 404 / home
    // page, we'll detect the short markdown and stop.
    const sep = hubUrl.endsWith("/") ? "" : "/";
    pageUrls.push(`${hubUrl}${sep}page/${i}/`);
  }

  let combinedMarkdown = "";
  let pagesWalked = 0;
  for (const url of pageUrls) {
    try {
      const result = await firecrawlScrape({ url, onlyMainContent: false });
      const md = result.markdown ?? "";
      // First page must produce something; otherwise the whole crawl is dead.
      if (pagesWalked === 0 && !md.trim()) {
        return json(200, { ok: false, reason: "empty markdown on page 1" });
      }
      // Subsequent pages can quietly fail — that's our signal pagination
      // doesn't exist on this site (or we've passed the last page).
      if (pagesWalked > 0 && md.trim().length < SHORT_PAGE_THRESHOLD) break;
      combinedMarkdown += (pagesWalked > 0 ? "\n\n=== PAGE BREAK ===\n\n" : "") + md;
      pagesWalked++;
    } catch (e) {
      // Same logic — first-page fetch failure is fatal; later-page
      // failure is fine, we just stop walking.
      if (pagesWalked === 0) {
        return json(200, { ok: false, reason: "fetch failed", error: (e as Error).message });
      }
      break;
    }
  }
  const pageMarkdown = combinedMarkdown;
  if (!pageMarkdown.trim()) return json(200, { ok: false, reason: "empty markdown" });

  const truncated = pageMarkdown.slice(0, MAX_MARKDOWN_CHARS);
  let extracted: DiscoveredScholarship[] = [];
  try {
    const resp = await chatCompletions({
      // 2026-05-18: pro → flash to drop OpenAI burn. URL extraction is
      // pattern-matching not reasoning; flash handles it fine. The
      // minConfidence floor (0.7) still gates noise out of the registry.
      tier: "flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Hub page URL: ${hubUrl}\n\nPage markdown follows. Extract individual scholarship program URLs:\n\n${truncated}` },
      ],
    });
    if (!resp.ok) return json(502, { error: `LLM ${resp.status}` });
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content as string | undefined;
    if (!text) return json(502, { error: "Empty completion" });
    const parsed = JSON.parse(isolateJson(text)) as { scholarships?: DiscoveredScholarship[] };
    extracted = Array.isArray(parsed.scholarships) ? parsed.scholarships : [];
  } catch (e) {
    return json(502, { error: `Parse failed: ${(e as Error).message}` });
  }

  // Validate + filter the LLM output.
  const candidates = extracted
    .filter((d) =>
      d
      && typeof d.name === "string" && d.name.trim().length > 3
      && typeof d.url === "string" && d.url.trim().length > 10
      && typeof d.confidence === "number" && d.confidence >= minConfidence
    )
    .filter((d) => isLikelyScholarshipUrl(d.url))
    .slice(0, MAX_DISCOVERED_PER_HUB);

  if (candidates.length === 0) {
    return json(200, {
      ok: true,
      hub_url: hubUrl,
      discovered: extracted.length,
      inserted: 0,
      skipped_low_confidence: extracted.filter((d) => (d.confidence ?? 0) < minConfidence).length,
      skipped_invalid_url: extracted.filter((d) => !isLikelyScholarshipUrl(d.url ?? "")).length,
      cost_estimate_usd: FIRECRAWL_COST_PER_SCRAPE_USD + LLM_COST_PER_DISCOVERY_USD,
    });
  }

  // Dedup against existing scholarship_sources by URL. Existing rows are
  // updated nothing — we just don't double-insert. The crawl cadence will
  // refresh them via the regular dispatcher.
  const urls = candidates.map((c) => c.url);
  const { data: existing } = await supa
    .from("scholarship_sources")
    .select("url")
    .in("url", urls);
  const existingSet = new Set((existing ?? []).map((r) => r.url));

  // Category for discovered rows: the URLs we extract from a hub are
  // individual program pages (chevening.org/scholarships,
  // daad.de/sub-program/...), NOT themselves aggregators. Inheriting
  // hubCategory='aggregator' was wrong — it told scrape-source to treat
  // these as aggregator sources, which suppresses the src.url fallback
  // for official_url even when src.url IS the official page (the recent
  // 6cf1982 fix). Force 'official' for aggregator-derived rows; pass
  // through the hub's category for non-aggregator hubs (e.g. an admin
  // hub categorised as 'university' yields university-page URLs).
  const inheritedCategory = hubCategory === "aggregator" ? "official" : (hubCategory ?? "discovered");

  const toInsert = candidates
    .filter((c) => !existingSet.has(c.url))
    .map((c) => ({
      name: c.name.slice(0, 200),
      url: c.url,
      source_type: "html" as const,
      region: hubRegion,
      category: inheritedCategory,
      // Discovered sources start at a slower cadence (5 days) — they
      // haven't proven their reliability yet. The dispatcher's circuit
      // breaker handles failures; admins can promote good ones to faster
      // cadence later. The smart-cadence cron (20260507100000) will
      // also auto-tune this once the source has 5+ runs of history.
      frequency_hours: 120,
      parser_hint: c.hint?.slice(0, 500) ?? null,
      is_active: true,
    }));

  let inserted = 0;
  if (toInsert.length > 0) {
    const { error: insertErr, count } = await supa
      .from("scholarship_sources")
      .insert(toInsert, { count: "exact" });
    if (insertErr) {
      console.error("[discover-from-hub] insert failed", insertErr);
      return json(500, { error: `Insert: ${insertErr.message}` });
    }
    inserted = count ?? toInsert.length;
  }

  // Stamp the hub row's last_crawled_at + last_success_at so the
  // hubs-cron dispatcher rotates through every aggregator instead of
  // re-grinding the same 12 every tick. Pre-fix every aggregator row
  // sat at last_crawled_at = NULL, the `order(last_crawled_at,
  // nullsFirst:true)` pull in discover-from-hubs-cron returned the
  // same 12 every run, and seeds added after that (including the
  // opportunitiesforyouth.org category feeds) were never visited —
  // which is why recent OFY posts never made it into the catalogue.
  // Best-effort: a failed stamp shouldn't fail the discovery response
  // when we've already inserted source rows.
  if (body.hub_source_id) {
    const stampedAt = new Date().toISOString();
    const { error: stampErr } = await supa
      .from("scholarship_sources")
      .update({ last_crawled_at: stampedAt, last_success_at: stampedAt, consecutive_failures: 0 })
      .eq("source_id", body.hub_source_id);
    if (stampErr) console.warn("[discover-from-hub] timestamp stamp failed", stampErr);
  }

  return json(200, {
    ok: true,
    hub_name: hubName,
    hub_url: hubUrl,
    discovered: extracted.length,
    valid_after_filter: candidates.length,
    already_existed: candidates.length - toInsert.length,
    inserted,
    cost_estimate_usd: FIRECRAWL_COST_PER_SCRAPE_USD + LLM_COST_PER_DISCOVERY_USD,
  });
});
