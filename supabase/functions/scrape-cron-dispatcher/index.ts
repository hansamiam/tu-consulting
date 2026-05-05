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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrService } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Don't try to scrape more than this in one dispatcher tick — keeps us
// under the 60s function timeout and avoids burning Firecrawl credits
// in a runaway burst.
const MAX_SOURCES_PER_TICK = 20;

// Stop hammering a source once it's failed this many times in a row.
const FAILURE_CIRCUIT_BREAKER = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Supabase env not configured" });

  // Auth: cron (service role) or admin user only.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Manual override (admin can pass { force_all: true } to ignore cadence).
  const body = await req.json().catch(() => ({} as { force_all?: boolean; source_ids?: string[] }));

  // Pick due sources: never-crawled (last_crawled_at IS NULL) or due by cadence.
  // Skip sources that have hit the circuit breaker. Skip quarantined sources
  // entirely (the daily evaluate_source_health() cron flags sources whose
  // auto-publish rate cratered or whose rows keep coming up broken — no
  // point burning Firecrawl/AI budget on them until admin re-enables).
  // 'degraded' sources still scrape but get filtered to half cadence below.
  let query = supa
    .from("scholarship_sources")
    .select("source_id, name, url, last_crawled_at, frequency_hours, consecutive_failures, health_status")
    .eq("is_active", true)
    .neq("health_status", "quarantined")
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

  // Serial fan-out — each scrape-source call is self-contained, and serializing
  // keeps Firecrawl + OpenAI within rate limits without coordination.
  for (const s of due) {
    const t0 = Date.now();
    let status = 0;
    let ok = false;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/scrape-source`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_id: s.source_id }),
      });
      status = r.status;
      ok = r.ok;
    } catch (e) {
      console.error(`Dispatch ${s.name} failed:`, e);
    }
    results.push({ source_id: s.source_id, name: s.name, status, ok, ms: Date.now() - t0 });
  }

  return json(200, {
    ok: true,
    dispatched: results.length,
    duration_ms: Date.now() - startedAt,
    results,
  });
});
