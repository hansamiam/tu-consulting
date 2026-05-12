// verify-scholarship-cron
//
// Daily-runnable. Picks the N oldest `last_verified_at` rows where the
// scholarship has a source_url + verification_status is not 'broken',
// and dispatches verify-scholarship on each with a sequential throttle.
//
// The DB self-heals over time: every row gets re-verified roughly once
// every (TOTAL_ROWS / MAX_PER_RUN) days. With ~225 rows and MAX_PER_RUN=100
// that's a ~2.25-day refresh cycle — fast enough that deadline drift +
// half-baked-row healing land within days, not weeks. Cost ceiling ~$0.35/day.
//
// Returns telemetry per run: candidates / verified / staged / failed.
//
// Schedule via pg_cron after deploy:
//   select cron.schedule('verify-scholarship-cron', '0 5 * * *',
//     $$ select net.http_post(...) $$);

import { getDispatchClient } from "../_shared/dispatchClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cap per run so a misconfigured deploy can't burn the entire AI/Firecrawl
// budget in one cron tick. 200 × ~$0.0035 = $0.70/day max spend at the
// current every-30-min schedule × 2x bump from 100 — keeps drain time
// at ~7 days for a 2-3k row catalog instead of ~15 days.
const MAX_PER_RUN = 200;

// Concurrent verify-scholarship calls. Each call hits Firecrawl + an
// AI extraction; ~3s avg. CONCURRENCY=6 keeps throughput ~2 verifies/s
// — still under Firecrawl's per-second cap and lets 200 rows fit
// inside the 140s deadline (200/6 × 3s ≈ 100s).
const CONCURRENCY = 6;

// Deadline for the entire run. Supabase edge functions cap at ~150s
// on paid tier; we leave 10s headroom for the JSON response. Pre-fix
// the serial loop with 100 candidates × 1.5s throttle would have
// blown past 450s, so most candidates never got verified before the
// runtime killed the function. Now workers stop claiming new work
// when within 5s of the deadline so already-in-flight verifies have
// time to complete and report back.
const RUN_DEADLINE_MS = 140_000;
const WORKER_QUIT_HEADROOM_MS = 5_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Shared dispatchClient — loads the rotation-resilient dispatch token
  // from private.app_secrets so internal supa.functions.invoke calls
  // hit the gateway with the SAME token pg_cron uses. Avoids the
  // env-injected-SUPABASE_SERVICE_ROLE_KEY-is-stale-legacy-JWT failure
  // mode that has been silently 401ing every internal invoke.
  let supa;
  try {
    ({ supa } = await getDispatchClient());
  } catch (e) {
    return json(500, { error: `Missing Supabase env: ${(e as Error).message}` });
  }

  // Candidates: have a source_url. Order by data_completeness_score ASC
  // first (the migration 20260507190000 index supports this) so
  // low-quality rows get re-verified ahead of already-rich ones —
  // re-verification is the only path by which a thin row can pick up
  // missing data. Then last_verified_at ASC so within an equal-
  // completeness band we prefer the stalest row.
  //
  // Pre-2026-05-12: this query excluded broken rows entirely
  // (.neq verification_status broken). Combined with url-health-cron
  // having a one-way state machine (broken → broken, never broken →
  // stale on recovery), this stranded 47 rows in a permanent dead
  // state. The healing migration 20260512020000 added a trigger that
  // auto-recovers broken → stale when url_consecutive_fails drops to
  // 0, but Firecrawl can scrape JS-rendered pages that the simple
  // fetch in url-health-cron can't, so broken rows often AREN'T
  // genuinely broken — they just fail the simpler check.
  //
  // We now include broken rows in the candidate set so this cron is a
  // SECOND recovery path. Verify-scholarship handles fetch failures
  // gracefully (stamps last_verified_at, doesn't escalate), and on a
  // clean re-extraction promotes back to 'verified'. We keep the cap
  // soft via the existing completeness-score ordering — broken rows
  // typically have low completeness scores, so they naturally bubble
  // to the front of the queue without a special clause.
  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, last_verified_at, verification_status, data_completeness_score")
    .not("source_url", "is", null)
    .order("data_completeness_score", { ascending: true, nullsFirst: true })
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN);

  if (candErr) {
    console.error("[verify-scholarship-cron] candidate query failed", candErr);
    return json(500, { error: "candidate query failed", reason: candErr.message });
  }
  if (!candidates || candidates.length === 0) {
    return json(200, { ok: true, candidates: 0, results: { verified_clean: 0, diffs_staged: 0, low_confidence: 0, fetch_failed: 0 } });
  }

  const counters = {
    verified_clean: 0,
    diffs_staged: 0,
    low_confidence: 0,
    fetch_failed: 0,
    page_too_thin: 0,
    extract_failed: 0,
    other: 0,
  };
  const errors: string[] = [];

  const startedAt = Date.now();
  let processed = 0;

  const verifyOne = async (c: typeof candidates[number]) => {
    try {
      const { data, error } = await supa.functions.invoke<{
        ok: boolean;
        status: string;
        diff_count?: number;
      }>("verify-scholarship", { body: { scholarship_id: c.scholarship_id } });

      if (error) {
        errors.push(`${c.scholarship_name}: ${error.message}`);
        counters.other++;
        return;
      }

      const status = data?.status ?? "other";
      if (status in counters) counters[status as keyof typeof counters]++;
      else counters.other++;
    } catch (e) {
      errors.push(`${c.scholarship_name}: ${(e as Error).message}`);
      counters.other++;
    }
  };

  // Bounded-concurrency worker pool with a soft deadline. Workers
  // stop pulling new jobs when they're about to exceed RUN_DEADLINE_MS,
  // so in-flight verifies have a window to finish and report back
  // before the edge runtime hard-kills the function.
  const queue = [...candidates];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const elapsed = Date.now() - startedAt;
        if (elapsed > RUN_DEADLINE_MS - WORKER_QUIT_HEADROOM_MS) return;
        const next = queue.shift();
        if (!next) return;
        await verifyOne(next);
        processed++;
      }
    })());
  }
  await Promise.all(workers);

  return json(200, {
    ok: true,
    candidates: candidates.length,
    processed,
    deferred: candidates.length - processed,
    duration_ms: Date.now() - startedAt,
    concurrency: CONCURRENCY,
    results: counters,
    errors,
  });
});
