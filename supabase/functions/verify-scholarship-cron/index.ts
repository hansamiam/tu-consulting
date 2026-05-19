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
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

// Cap per run so a misconfigured deploy can't burn the entire AI/Firecrawl
// budget in one cron tick. 200 × ~$0.0035 = $0.70/day max spend at the
// current every-30-min schedule × 2x bump from 100 — keeps drain time
// at ~7 days for a 2-3k row catalog instead of ~15 days.
const MAX_PER_RUN = 200;

// Concurrent verify-scholarship calls. CONCURRENCY=6 was sized for 3s
// average per call, but real-world latency is 7-15s (Firecrawl + AI),
// so 6 in flight produced ~30 rps of new connections to the same
// internal gateway origin → the gateway dropped ~85% of fan-out
// invokes with "Failed to send a request to the Edge Function"
// (FunctionsFetchError), counted as "other" in the bucket tally.
// Dropped to 3 so the gateway's per-source pool isn't saturated.
const CONCURRENCY = 3;
const RETRIES_ON_FETCH_ERROR = 2;
const RETRY_BACKOFF_MS = [500, 1500];

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
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  // Cron / admin gate. verify_jwt is false for this function (the gateway
  // can't see the cron's sb_secret apikey as a JWT), so it authenticates
  // the caller itself here.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: auth.reason ?? "unauthorized" });

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
  // 2026-05-18: 30-minute grace window before a freshly-discovered row
  // gets re-verified. Pre-fix, verify-scholarship picked up new
  // 'pending' rows within minutes of insertion — and because LLM
  // extractions vary slightly run-to-run, the diff-check almost always
  // produced "material diffs" → status flipped from 'pending' to
  // 'stale' on rows that were minutes old. UX paper cut: brand-new
  // entries appeared with a "stale" verification status. Skip rows
  // created < 30 min ago; they'll be picked up on the next cron tick
  // once the catalog has had a moment to settle.
  const graceCutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, last_verified_at, verification_status, data_completeness_score")
    .not("source_url", "is", null)
    .lt("created_at", graceCutoff)
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
    no_source_url: 0,
    pending: 0,
    fan_out_failed: 0,
    other: 0,
  };
  const errors: string[] = [];

  const startedAt = Date.now();
  let processed = 0;

  const verifyOne = async (c: typeof candidates[number]) => {
    let lastErr: { message: string; isFetch: boolean } | null = null;

    // Retry only the FunctionsFetchError class — transient internal
    // gateway drops. Real per-row errors (parse fail, fetch_failed,
    // etc.) come back in `data.status` with 200 from verify-scholarship
    // and don't fall into this branch.
    for (let attempt = 0; attempt <= RETRIES_ON_FETCH_ERROR; attempt++) {
      try {
        const { data, error } = await supa.functions.invoke<{
          ok: boolean;
          status: string;
          diff_count?: number;
        }>("verify-scholarship", { body: { scholarship_id: c.scholarship_id } });

        if (error) {
          const isFetch = /Failed to send a request/i.test(error.message);
          lastErr = { message: error.message, isFetch };
          if (isFetch && attempt < RETRIES_ON_FETCH_ERROR) {
            await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS[attempt] ?? 1500));
            continue;
          }
          break;
        }

        const status = data?.status ?? "other";
        if (status in counters) counters[status as keyof typeof counters]++;
        else counters.other++;
        return;
      } catch (e) {
        lastErr = { message: (e as Error).message, isFetch: false };
        break;
      }
    }

    if (lastErr) {
      errors.push(`${c.scholarship_name}: ${lastErr.message}`);
      if (lastErr.isFetch) counters.fan_out_failed++;
      else counters.other++;
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
