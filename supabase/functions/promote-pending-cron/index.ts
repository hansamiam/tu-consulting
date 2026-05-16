// promote-pending-cron
//
// Drains the pending-scholarship queue into verified status, automatically,
// without compromising accuracy. For each pending row that has a source_url,
// invokes verify-scholarship — which re-fetches the URL via Firecrawl,
// re-extracts the structured data via pro-tier LLM, and either:
//
//   · auto-promotes to verified if the re-extraction matches stored data
//     (verification_status='verified', last_verified_at=now)
//   · stages the row in scholarships_staging if differences are found
//     (admin reviews diffs in /admin/queue, then promotes)
//   · marks broken if the URL is unreachable on this attempt
//   · leaves pending if extraction fails or content is too thin
//
// The accuracy guard: a pending row only promotes if a fresh re-fetch
// of its source URL produces data that matches the stored row. Same
// quality bar verified rows clear on every daily verify-cycle.
//
// Why a separate cron instead of just expanding verify-scholarship-cron:
// pending rows compete with the normal "re-check the oldest verified
// row" workload for the same 50/day slot. With 178 pending rows + the
// daily verified-row recheck, draining the pending queue would take
// 8+ days. This dedicated cron processes 80/run, focused only on
// pending rows, so the queue drains in ~3 days.
//
// Idempotent: rows that successfully promote are no longer pending,
// so re-runs only ever process the still-pending residual.
//
// Cost: ~80 × $0.005 (pro-tier verify call) = $0.40/day cap.

import { getDispatchClient } from "../_shared/dispatchClient.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

const MAX_PER_RUN = 80;
const THROTTLE_MS = 1200;

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  // Cron / admin gate. verify_jwt is false for this function (the gateway
  // can't see the cron's sb_secret apikey as a JWT), so it authenticates
  // the caller itself here.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: auth.reason ?? "unauthorized" });

  // dispatchClient — see verify-scholarship-cron for the auth-rotation
  // rationale. The supa.functions.invoke("verify-scholarship") fan-out
  // below uses the dispatch token from private.app_secrets.
  let supa;
  try {
    ({ supa } = await getDispatchClient());
  } catch (e) {
    return json(500, { error: `Missing Supabase env: ${(e as Error).message}` });
  }

  // Candidates: pending rows that have a source_url so we can verify
  // them by re-fetching. Pending rows without source_url require manual
  // review — they're left in the admin queue.
  //
  // Order: oldest created_at first so older legacy data drains before
  // newly-scraped pending rows that were just added.
  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, source_url")
    .eq("verification_status", "pending")
    .not("source_url", "is", null)
    .order("created_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN);

  if (candErr) {
    console.error("[promote-pending-cron] candidate query failed", candErr);
    return json(500, { error: "candidate query failed", reason: candErr.message });
  }
  if (!candidates || candidates.length === 0) {
    // Surface separately how many pending rows EXIST but have no source_url
    // — those are the residual that needs manual admin attention.
    const { count: orphaned } = await supa
      .from("scholarships")
      .select("scholarship_id", { count: "exact", head: true })
      .eq("verification_status", "pending")
      .is("source_url", null);
    return json(200, {
      ok: true,
      candidates: 0,
      orphaned_no_source_url: orphaned ?? 0,
      message: "Pending queue drained or all remaining rows lack source_url",
    });
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

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (i > 0) await new Promise(r => setTimeout(r, THROTTLE_MS));

    try {
      const { data, error } = await supa.functions.invoke<{
        ok: boolean;
        status: string;
        diff_count?: number;
      }>("verify-scholarship", { body: { scholarship_id: c.scholarship_id } });

      if (error) {
        errors.push(`${c.scholarship_name}: ${error.message}`);
        counters.other++;
        continue;
      }

      const status = data?.status ?? "other";
      if (status in counters) {
        counters[status as keyof typeof counters]++;
      } else {
        counters.other++;
      }
    } catch (e) {
      errors.push(`${c.scholarship_name}: ${(e as Error).message}`);
      counters.other++;
    }
  }

  return json(200, {
    ok: true,
    candidates: candidates.length,
    results: counters,
    errors_preview: errors.slice(0, 5),
  });
});
