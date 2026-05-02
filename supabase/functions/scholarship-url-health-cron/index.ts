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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUEST_TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;
const CONCURRENCY = 5;
const BATCH_SIZE = 80;            // rows per cron invocation
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
    // Cancel the body read — we don't care about content
    try { resp.body?.cancel(); } catch { /* ignore */ }

    if (resp.status >= 200 && resp.status < 300) {
      return { status: didRedirect ? "redirect" : "ok", httpCode: resp.status, resolvedTo: didRedirect ? current : null };
    }
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Optional override: ?max_rows=N for manual one-off runs
  const url = new URL(req.url);
  const maxRows = Math.min(Math.max(Number(url.searchParams.get("max_rows")) || BATCH_SIZE, 1), 500);

  const { data: queue, error: qErr } = await supa
    .from("scholarships_url_check_queue")
    .select("scholarship_id, official_url, url_consecutive_fails")
    .limit(maxRows)
    .returns<QueueRow[]>();
  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!queue || queue.length === 0) {
    return new Response(
      JSON.stringify({ checked: 0, ok: 0, redirect: 0, fail: 0, duration_ms: Date.now() - startedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
      patch.url_consecutive_fails = (row.url_consecutive_fails ?? 0) + 1;
      fail++;
    }
    updates.push(
      supa.from("scholarships").update(patch).eq("scholarship_id", row.scholarship_id),
    );
  }

  // Settle all updates; partial failures don't abort
  await Promise.allSettled(updates);

  return new Response(
    JSON.stringify({
      checked: queue.length,
      ok, redirect, fail,
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
