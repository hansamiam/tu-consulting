// scrape-cron-dispatcher
//
// Picks all scholarship_sources that are due (last_crawled_at older than
// frequency_hours, or never crawled) and fans out one scrape-source call
// per source. Designed to be invoked by pg_cron every hour.
//
// Sources are processed serially so we respect Firecrawl's rate limit
// (~10 req/s on free tier) and don't blow the 60s edge-function timeout
// on first-time bootstraps. With 20 sources at ~2s each, a full sweep
// takes <60s.
//
// Returns a per-source status array so the run is debuggable from logs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

// Don't try to scrape more than this in one dispatcher tick — keeps us
// under the 60s function timeout and avoids burning Firecrawl credits
// in a runaway burst. With CONCURRENCY=5, 40 sources × ~5s avg / 5 ≈
// 40s — fits inside the timeout with headroom and ~doubles throughput
// vs the serial 20-source ceiling.
const MAX_SOURCES_PER_TICK = 40;

// 2026-05-18: dropped CONCURRENCY from 5 → 2 after a sustained
// burst of OpenAI 429 (TPM 30000 / org-tier-1) wiped out 9 of 12
// scrapes in a single tick. At 5 in flight × ~10K tokens/call =
// 50K tokens burst, well over the 30K-per-minute window. With
// concurrency 2 we average ~20K tokens/burst — comfortably under
// the cap and the per-call 429 retry inside scrape-source can
// ride out the rare spike. Net throughput drop is small because
// the bottleneck is the LLM, not Firecrawl.
const CONCURRENCY = 2;

// Stop hammering a source once it's failed this many times in a row.
const FAILURE_CIRCUIT_BREAKER = 5;

serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  if (!SUPABASE_URL) return json(500, { error: "Supabase env not configured" });

  // Auth: cron (service role) or admin user only.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  const supa = createServiceClient();

  // Pull the dispatch-side token from private.app_secrets — the SAME
  // value pg_cron uses to hit our edge functions. This is the only
  // value guaranteed to work against THIS project's API gateway after
  // a key rotation (the env-injected SERVICE_ROLE may still be the
  // legacy JWT, which the "Disable legacy JWT" gateway toggle now
  // rejects). One DB round-trip at the top of each dispatch run,
  // amortised across MAX_SOURCES_PER_TICK internal fetches.
  let DISPATCH_TOKEN: string =
    Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  try {
    const { data: tokenRpc } = await supa.rpc("app_cron_token" as never) as { data: unknown };
    if (typeof tokenRpc === "string" && tokenRpc.length > 10) DISPATCH_TOKEN = tokenRpc;
  } catch { /* fall back to env-derived service key — better than nothing */ }

  // Manual override (admin can pass { force_all: true } to ignore cadence).
  const body = await req.json().catch(() => ({} as { force_all?: boolean; source_ids?: string[] }));

  // Pick due sources: never-crawled (last_crawled_at IS NULL) or due by cadence.
  // Skip sources that have hit the circuit breaker. Skip quarantined sources
  // entirely (the daily evaluate_source_health() cron flags sources whose
  // auto-publish rate cratered or whose rows keep coming up broken — no
  // point burning Firecrawl/AI budget on them until admin re-enables).
  // 'degraded' sources still scrape but get filtered to half cadence below.
  //
  // SKIP aggregator-category sources here. Those hubs are walked by
  // discover-from-hubs-cron, which extracts INDIVIDUAL program URLs
  // and inserts them as separate (non-aggregator) sources. Running
  // scrape-source against a hub's listing page burns Firecrawl + LLM
  // calls to emit thin/no rows (listing snippets fail the minimum-
  // info gate) — useless work that also generates low-quality staging
  // pollution. The per-program URLs discover-from-hub finds DO land
  // here and get scraped on normal cadence.
  let query = supa
    .from("scholarship_sources")
    .select("source_id, name, url, last_crawled_at, frequency_hours, consecutive_failures, health_status, category")
    .eq("is_active", true)
    .neq("health_status", "quarantined")
    .neq("category", "aggregator")
    .lt("consecutive_failures", FAILURE_CIRCUIT_BREAKER)
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SOURCES_PER_TICK);

  if (Array.isArray(body.source_ids) && body.source_ids.length > 0) {
    query = query.in("source_id", body.source_ids);
  }

  const { data: candidates, error } = await query;
  if (error) return json(500, { error: `Load sources: ${error.message}` });

  const now = Date.now();
  const due = (candidates ?? []).filter((s) => {
    if (body.force_all) return true;
    if (!s.last_crawled_at) return true;
    const elapsed = now - new Date(s.last_crawled_at).getTime();
    // Degraded sources scrape at half frequency (2× the cadence in hours).
    const baseCadenceHrs = s.frequency_hours ?? 24;
    const effectiveCadenceHrs = s.health_status === "degraded" ? baseCadenceHrs * 2 : baseCadenceHrs;
    return elapsed >= effectiveCadenceHrs * 3_600_000;
  });

  if (due.length === 0) {
    return json(200, { ok: true, dispatched: 0, message: "No sources due" });
  }

  const startedAt = Date.now();
  const results: { source_id: string; name: string; status: number; ok: boolean; ms: number }[] = [];

  // Parallel fan-out with bounded concurrency. Each scrape-source call
  // is self-contained (its own Firecrawl + LLM round-trip), so they
  // parallelize cleanly. Throttling at CONCURRENCY=5 keeps Firecrawl
  // request rate well under the per-second cap while ~5×ing throughput
  // vs the previous serial loop.
  const dispatchOne = async (s: typeof due[number]) => {
    const t0 = Date.now();
    let status = 0;
    let ok = false;
    try {
      // DISPATCH_TOKEN comes from private.app_secrets via the rpc call
      // above — same value pg_cron uses, gateway-rotation-resilient.
      // apikey header (not Bearer) because the gateway only accepts
      // sb_secret_* short-form keys via the apikey lane.
      const r = await fetch(`${SUPABASE_URL}/functions/v1/scrape-source`, {
        method: "POST",
        headers: {
          apikey: DISPATCH_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_id: s.source_id }),
      });
      status = r.status;
      ok = r.ok;
    } catch (e) {
      console.error(`Dispatch ${s.name} failed:`, e);
    }
    return { source_id: s.source_id, name: s.name, status, ok, ms: Date.now() - t0 };
  };

  // Worker pool — fixed-size set of in-flight promises. Each worker
  // pulls the next source off the queue when it finishes its current
  // call. This is the standard Promise-pool pattern; faster than
  // chunking because slow sources don't bottleneck a fast batch.
  const queue = [...due];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        const r = await dispatchOne(next);
        results.push(r);
      }
    })());
  }
  await Promise.all(workers);

  return json(200, {
    ok: true,
    dispatched: results.length,
    duration_ms: Date.now() - startedAt,
    concurrency: CONCURRENCY,
    results,
  });
});
