// audit-deadlines-cron
//
// Nightly-runnable. Picks N rows via public.pick_deadline_audit_candidates()
// (never-audited first, then stalest, tiebreak by nearest deadline) and
// dispatches audit-deadlines on each with a bounded-concurrency worker pool.
//
// The DB self-heals over time: each row gets re-verified roughly once every
// (TOTAL_PUBLISHED / MAX_PER_RUN) days. With ~85 published rows and
// MAX_PER_RUN=15 that's a ~5-6 day refresh cycle — slower than verify-
// scholarship-cron (which has different economics) because deadline auditing
// is the ONLY signal that catches provider-side drift, so we'd rather see
// it every few days than burn the budget faster.
//
// Cost ceiling: 15 × (Firecrawl $0.001 + flash LLM ~$0.002) = ~$0.045/run,
// ~$1.35/month at daily cadence. Trivial.
//
// Returns telemetry per run: candidates / processed / match / mismatch /
// inconclusive / rolling / errors.

import { getDispatchClient } from "../_shared/dispatchClient.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";

const json = (status: number, body: unknown) => respondJson(status, body, corsHeaders);

// Cap per run. 15 rows × ~5s each at concurrency 3 = ~25s wall time
// (deadline-bounded below at 140s). Conservative — bump later if the
// catalog grows past 200 rows.
const MAX_PER_RUN = 15;
const CONCURRENCY = 3;
const RETRIES_ON_FETCH_ERROR = 2;
const RETRY_BACKOFF_MS = [500, 1500];

const RUN_DEADLINE_MS = 140_000;
const WORKER_QUIT_HEADROOM_MS = 5_000;

interface PickRow {
  scholarship_id: string;
  scholarship_name: string;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: auth.reason ?? "unauthorized" });

  let supa;
  try {
    ({ supa } = await getDispatchClient());
  } catch (e) {
    return json(500, { error: `Missing Supabase env: ${(e as Error).message}` });
  }

  // Optional URL params: ?limit=20 overrides MAX_PER_RUN (capped) for
  // backfill runs; ?dry_run=true returns the candidate list without
  // dispatching.
  const u = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(u.searchParams.get("limit") ?? `${MAX_PER_RUN}`, 10) || MAX_PER_RUN, 1),
    50, // hard cap regardless of URL — single run shouldn't exceed ~$0.15
  );
  const dryRun = u.searchParams.get("dry_run") === "true";

  const { data: candidates, error: pickErr } = await supa.rpc(
    "pick_deadline_audit_candidates",
    { p_limit: limit },
  );

  if (pickErr) {
    console.error("[audit-deadlines-cron] candidate query failed", pickErr);
    return json(500, { error: "candidate query failed", reason: pickErr.message });
  }
  if (!candidates || candidates.length === 0) {
    return json(200, { ok: true, candidates: 0, processed: 0, results: emptyCounters() });
  }

  if (dryRun) {
    return json(200, {
      ok: true,
      dry_run: true,
      candidates: candidates.length,
      sample: candidates.slice(0, 5).map((c: PickRow) => ({
        id: c.scholarship_id, name: c.scholarship_name,
      })),
    });
  }

  const counters = emptyCounters();
  const errors: string[] = [];

  const startedAt = Date.now();
  let processed = 0;

  const auditOne = async (c: PickRow) => {
    let lastErr: { message: string; isFetch: boolean } | null = null;

    for (let attempt = 0; attempt <= RETRIES_ON_FETCH_ERROR; attempt++) {
      try {
        const { data, error } = await supa.functions.invoke<{
          ok: boolean;
          status: "match" | "mismatch" | "inconclusive" | "rolling";
          confidence?: number;
        }>("audit-deadlines", { body: { scholarship_id: c.scholarship_id } });

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

  const queue: PickRow[] = [...candidates];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const elapsed = Date.now() - startedAt;
        if (elapsed > RUN_DEADLINE_MS - WORKER_QUIT_HEADROOM_MS) return;
        const next = queue.shift();
        if (!next) return;
        await auditOne(next);
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

function emptyCounters() {
  return {
    match: 0,
    mismatch: 0,
    inconclusive: 0,
    rolling: 0,
    fan_out_failed: 0,
    other: 0,
  };
}
