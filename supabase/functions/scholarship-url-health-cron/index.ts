// scholarship-url-health-cron
//
// Weekly cron (Mondays 04:00 UTC). Pulls rows from
// scholarships_url_check_queue, fires GET requests at the official_url,
// classifies the result, and writes back the bookkeeping columns. Per-
// row failures don't abort the run; aggregate stats are returned to
// the caller.
//
// Why GET (not HEAD): some providers reject HEAD or return misleading
// 405s. GET with a 5s timeout + we don't read the body is more robust.
// We also follow up to 3 redirects.
//
// Concurrency: simple semaphore. 5 in flight at a time. With ~200 URLs
// and a 5s budget per request, the run completes well under the
// 60s function timeout even if many time out.

import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const REQUEST_TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;
const CONCURRENCY = 8;
const BATCH_SIZE = 500;           // rows per cron invocation
const USER_AGENT = "TopUni-URL-Health-Bot/1.0 (+https://topuni.org)";

interface QueueRow {
  scholarship_id: string;
  official_url: string;
  url_consecutive_fails: number | null;
}

type CheckResult =
  | { status: "ok"; httpCode: number; resolvedTo: string | null }
  | { status: "redirect"; httpCode: number; resolvedTo: string | null }
  | { status: "fail"; httpCode: number | null; reason: string };

/* Soft-404 detection. Many providers return HTTP 200 even when the
 * underlying program page is gone (rebrand redirected to a generic
 * landing page, Wagtail/Drupal CMS missing-slug fallback, JS-shell
 * apps that show "Not Found" client-side). Without sniffing the body
 * we'd happily mark these "ok" forever and keep linking students to
 * dead pages.
 *
 * Strategy: read the first ~64KB only (Read at most this much then
 * cancel the rest), pull <title> and a clipped main-content slice,
 * match against known soft-404 marker phrases. Only fires when the
 * content is short enough OR the title is unambiguously a 404 — we
 * don't want to flag a real page that mentions "Page not found"
 * inside a long article. */
const SOFT_404_TITLE_RE = /(\b404\b|page\s+not\s+found|not\s+found\b|page\s+(?:doesn'?t\s+exist|expired|removed)|sorry,\s+(?:this|that)\s+page|nothing\s+here)/i;
const SOFT_404_BODY_RE  = /(this\s+page\s+(?:doesn'?t|does\s+not)\s+exist|the\s+(?:page|content|scholarship)\s+(?:you\s+(?:are\s+)?(?:looking|requested)|you've?\s+requested)\s+(?:could\s+not\s+be\s+found|cannot\s+be\s+found|isn'?t\s+available|is\s+no\s+longer\s+available|has\s+(?:moved|been\s+removed))|sorry,?\s+we\s+(?:couldn'?t|can'?t|cannot)\s+find|page\s+(?:has\s+been|was)\s+(?:moved|removed|deleted)|you\s+took\s+a\s+wrong\s+turn|404\s+(?:error|not\s+found))/i;

const MAX_BODY_BYTES = 64 * 1024; // 64KB cap on body read

async function readBodyClipped(resp: Response): Promise<string> {
  if (!resp.body) return "";
  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } catch {
    /* ignore — partial body still useful */
  } finally {
    try { reader.cancel(); } catch { /* ignore */ }
  }
  // Concat without splitting multi-byte UTF-8 sequences; TextDecoder
  // handles trailing partial codepoints with stream:false fine for our
  // marker matching purposes.
  const merged = new Uint8Array(Math.min(total, MAX_BODY_BYTES));
  let offset = 0;
  for (const c of chunks) {
    const room = merged.length - offset;
    if (room <= 0) break;
    merged.set(c.subarray(0, room), offset);
    offset += Math.min(c.length, room);
  }
  return new TextDecoder("utf-8").decode(merged);
}

function detectSoft404(html: string): { soft404: boolean; reason?: string } {
  if (!html) return { soft404: false };
  const titleMatch = html.match(/<title[^>]*>([^<]{0,200})<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? "";
  if (title && SOFT_404_TITLE_RE.test(title)) {
    return { soft404: true, reason: `soft_404_title: ${title.slice(0, 80)}` };
  }
  // Body checks — strip tags to avoid attribute-name false positives
  // ("notfound" CSS class), then match against a window of text.
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Two conditions to fire on body matches:
  //   (a) Soft-404 phrase appears in the first 800 chars of visible
  //       text (above-the-fold for most pages)
  //   (b) OR overall page text is short AND a soft-404 phrase appears
  //       anywhere — short pages with these phrases are almost always
  //       error pages, not real content. Cap: 1500 chars.
  const head = text.slice(0, 800);
  if (SOFT_404_BODY_RE.test(head)) {
    return { soft404: true, reason: "soft_404_above_fold" };
  }
  if (text.length < 1500 && SOFT_404_BODY_RE.test(text)) {
    return { soft404: true, reason: "soft_404_thin_page" };
  }
  return { soft404: false };
}

async function checkUrl(rawUrl: string): Promise<CheckResult> {
  let url = rawUrl.trim();
  if (!url) return { status: "fail", httpCode: null, reason: "empty url" };
  // Some entries lack scheme — assume https
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  let current = url;
  let lastCode: number | null = null;
  let redirects = 0;
  let didRedirect = false;
  while (true) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": USER_AGENT,
          // Ask for HTML so providers don't gate by Accept
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
    } catch (e) {
      const name = (e as { name?: string })?.name || "";
      const reason = name === "AbortError" ? "timeout" : (e instanceof Error ? e.message : String(e));
      return { status: "fail", httpCode: null, reason: reason.slice(0, 200) };
    } finally {
      clearTimeout(tid);
    }
    lastCode = resp.status;

    if (resp.status >= 200 && resp.status < 300) {
      // Soft-404 sniff before declaring "ok". Only check when the
      // response advertises HTML (some PDFs / JSON endpoints return 200
      // without HTML and shouldn't be parsed for soft-404 markers).
      const ct = resp.headers.get("content-type") ?? "";
      if (/text\/html|application\/xhtml/i.test(ct)) {
        const body = await readBodyClipped(resp);
        const sniff = detectSoft404(body);
        if (sniff.soft404) {
          return { status: "fail", httpCode: resp.status, reason: sniff.reason ?? "soft_404" };
        }
      } else {
        try { resp.body?.cancel(); } catch { /* ignore */ }
      }
      return { status: didRedirect ? "redirect" : "ok", httpCode: resp.status, resolvedTo: didRedirect ? current : null };
    }
    // Non-2xx: cancel body, follow redirects or return fail
    try { resp.body?.cancel(); } catch { /* ignore */ }
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc || redirects >= MAX_REDIRECTS) {
        return { status: "fail", httpCode: resp.status, reason: `${redirects >= MAX_REDIRECTS ? "too many redirects" : "no Location header"}` };
      }
      current = new URL(loc, current).toString();
      redirects++;
      didRedirect = true;
      continue;
    }
    // 4xx / 5xx
    return { status: "fail", httpCode: resp.status, reason: `HTTP ${resp.status}` };
  }
}

async function pMap<T, R>(items: T[], fn: (x: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  // Cron / admin gate. verify_jwt is false for this function (the gateway
  // can't see the cron's sb_secret apikey as a JWT), so it authenticates
  // the caller itself here.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return respondError(401, auth.reason ?? "unauthorized", corsHeaders);

  if (req.method !== "POST") return respondError(405, "POST only", corsHeaders);

  const startedAt = Date.now();
  const supa = createServiceClient();

  // Optional override: ?max_rows=N for manual one-off runs
  const url = new URL(req.url);
  const maxRows = Math.min(Math.max(Number(url.searchParams.get("max_rows")) || BATCH_SIZE, 1), 500);

  const { data: queue, error: qErr } = await supa
    .from("scholarships_url_check_queue")
    .select("scholarship_id, official_url, url_consecutive_fails")
    .limit(maxRows)
    .returns<QueueRow[]>();
  if (qErr) return respondError(500, qErr.message, corsHeaders);
  if (!queue || queue.length === 0) {
    return respondJson(200, { checked: 0, ok: 0, redirect: 0, fail: 0, duration_ms: Date.now() - startedAt }, corsHeaders);
  }

  const results = await pMap(queue, async (row) => {
    const result = await checkUrl(row.official_url);
    return { row, result };
  }, CONCURRENCY);

  let ok = 0, redirect = 0, fail = 0;
  const updates: Promise<unknown>[] = [];
  const now = new Date().toISOString();

  for (const { row, result } of results) {
    const patch: Record<string, unknown> = { url_last_checked_at: now };
    if (result.status === "ok") {
      patch.url_check_status = "ok";
      patch.url_check_http_code = result.httpCode;
      patch.url_consecutive_fails = 0;
      ok++;
    } else if (result.status === "redirect") {
      patch.url_check_status = "redirect";
      patch.url_check_http_code = result.httpCode;
      patch.url_resolved_to = result.resolvedTo;
      patch.url_consecutive_fails = 0;
      redirect++;
    } else {
      patch.url_check_status = "fail";
      patch.url_check_http_code = result.httpCode ?? null;
      const nextFails = (row.url_consecutive_fails ?? 0) + 1;
      patch.url_consecutive_fails = nextFails;
      // 3+ consecutive URL failures → flip verification_status to 'broken'
      // so downstream LLMs (brief, counselor) drop this scholarship from
      // their retrieved context per the contract in DATA_PIPELINE_AUDIT.md.
      if (nextFails >= 3) patch.verification_status = "broken";
      fail++;
    }
    // PostgrestFilterBuilder is PromiseLike — Promise.allSettled awaits it
    // at runtime. The cast is purely to satisfy Promise<unknown>[] now that
    // the typed client returns a stricter builder shape.
    updates.push(
      supa.from("scholarships").update(patch as never).eq("scholarship_id", row.scholarship_id) as unknown as Promise<unknown>,
    );
  }

  // Settle all updates; partial failures don't abort
  await Promise.allSettled(updates);

  return respondJson(200, {
    checked: queue.length,
    ok, redirect, fail,
    duration_ms: Date.now() - startedAt,
  }, corsHeaders);
});
