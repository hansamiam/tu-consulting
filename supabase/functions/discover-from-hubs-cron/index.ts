// discover-from-hubs-cron
//
// Weekly tick that loops through every scholarship_source with
// category='aggregator' and dispatches a discover-from-hub call for each.
// New per-program URLs found inside those hubs land in scholarship_sources
// and are picked up by the regular scrape-cron-dispatcher on its cadence.
//
// This is the self-expansion loop:
//
//   discover-from-hubs-cron (weekly)
//     → walks all aggregator hubs → finds new individual program URLs
//
//   scrape-cron-dispatcher (hourly)
//     → walks all sources due → calls scrape-source on each
//
//   scrape-source
//     → fetches, content-hash short-circuits, LLM extracts, validates,
//       dedupes, auto-publishes high-confidence rows to scholarships.
//
//   verify-scholarship-cron (daily)
//     → re-checks 50 oldest verified rows / day, diffs vs source,
//       stages diffs for admin or auto-promotes clean re-fetches.
//
// Net: a curator adds 1-10 hub URLs once. The system self-discovers
// hundreds of program URLs from those hubs, scrapes them, verifies them,
// and keeps them current — all without manual intervention.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

// One discover-from-hub call takes ~5-15s (Firecrawl + pro-tier LLM).
// Cap per tick keeps us under the 60s edge function timeout even with
// slow hubs and gives back-pressure on Firecrawl spend. With
// CONCURRENCY=3, 12 hubs × ~10s avg / 3 ≈ 40s — fits inside the
// timeout with headroom and 2× the previous serial cap.
const MAX_HUBS_PER_TICK = 12;
const CONCURRENCY = 3;

serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const supa = createServiceClient();

  // Same pattern as scrape-cron-dispatcher: fetch the rotation-resilient
  // dispatch token from private.app_secrets so internal fan-out fetches
  // always use whatever value pg_cron is currently using. Avoids the
  // env-var-stale-after-rotation failure mode.
  let DISPATCH_TOKEN: string =
    Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  try {
    const { data: tokenRpc } = await supa.rpc("app_cron_token");
    if (typeof tokenRpc === "string" && tokenRpc.length > 10) DISPATCH_TOKEN = tokenRpc;
  } catch { /* fall back to env-derived service key */ }

  // Pick aggregator-category hubs in last_crawled_at ascending order so
  // hubs we haven't touched in the longest go first. is_active filter
  // matches the regular dispatcher's behavior.
  const { data: hubs, error } = await supa
    .from("scholarship_sources")
    .select("source_id, name, url, last_crawled_at")
    .eq("category", "aggregator")
    .eq("is_active", true)
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(MAX_HUBS_PER_TICK);
  if (error) return json(500, { error: `Load hubs: ${error.message}` });
  if (!hubs || hubs.length === 0) {
    return json(200, { ok: true, hubs: 0, message: "No aggregator hubs configured" });
  }

  const startedAt = Date.now();
  const results: { hub: string; ok: boolean; inserted?: number; error?: string }[] = [];
  let totalInserted = 0;

  const dispatchOne = async (h: typeof hubs[number]) => {
    try {
      // DISPATCH_TOKEN from private.app_secrets — see scrape-cron-dispatcher
      // for the gateway-rotation-resilience rationale.
      const r = await fetch(`${SUPABASE_URL}/functions/v1/discover-from-hub`, {
        method: "POST",
        headers: {
          apikey: DISPATCH_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hub_source_id: h.source_id }),
      });
      const payload = await r.json().catch(() => ({}));
      const ok = r.ok && payload?.ok !== false;
      const inserted = typeof payload?.inserted === "number" ? payload.inserted : 0;
      return { hub: h.name, ok, inserted };
    } catch (e) {
      return { hub: h.name, ok: false, error: (e as Error).message };
    }
  };

  // Bounded-concurrency worker pool (same pattern as scrape-cron-dispatcher).
  // Three in flight × ~10s avg = ~3 Firecrawl req/s sustained, well
  // under the per-second cap. Slow hubs no longer bottleneck the whole tick.
  const queue = [...hubs];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        const r = await dispatchOne(next);
        if (r.ok && typeof r.inserted === "number") totalInserted += r.inserted;
        results.push(r);
      }
    })());
  }
  await Promise.all(workers);

  return json(200, {
    ok: true,
    hubs_processed: results.length,
    total_inserted: totalInserted,
    duration_ms: Date.now() - startedAt,
    concurrency: CONCURRENCY,
    results,
  });
});
