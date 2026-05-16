// canonical-extract-cron — daily picker for canonical-extract.
//
// Picks rows where canonical_overview_at IS NULL (never extracted)
// or older than 90 days (stale), and dispatches canonical-extract on
// each with bounded concurrency. Same shape as verify-scholarship-cron.
//
// Cost ceiling: MAX_PER_RUN × ~$0.0035 = ~$0.18/run at 50 rows/day.
// Schedule daily 04:00 UTC (after verify-scholarship-cron at 05:00,
// so canonical extraction reads from rows that just got verified).
//
// pg_cron schedule (set after migration applies):
//   select cron.schedule('canonical-extract-cron', '0 4 * * *',
//     $$ select net.http_post(...) $$);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

const MAX_PER_RUN  = 50;
const CONCURRENCY  = 3;
const RUN_DEADLINE_MS       = 140_000;
const WORKER_QUIT_HEADROOM  = 8_000;
const STALE_THRESHOLD_DAYS  = 90;

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  // Cron / admin gate. verify_jwt is false for this function (the gateway
  // can't see the cron's sb_secret apikey as a JWT), so it authenticates
  // the caller itself here.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: auth.reason ?? "unauthorized" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "missing supabase env" });
  // Bootstrap client — used to load the rotation-resilient dispatch
  // token from private.app_secrets. Same source pg_cron uses, so
  // every fan-out fetch in this run hits the gateway with a value
  // that matches the cron token under any rotation state.
  const bootstrap = createClient(SUPABASE_URL, SERVICE_ROLE);
  let DISPATCH_TOKEN: string = SERVICE_ROLE;
  try {
    const { data: tokenRpc } = await bootstrap.rpc("app_cron_token");
    if (typeof tokenRpc === "string" && tokenRpc.length > 10) DISPATCH_TOKEN = tokenRpc;
  } catch { /* fall back to env-derived SERVICE_ROLE */ }
  // Real client uses the dispatch token so supa.functions.invoke()
  // calls below send the correct apikey to the gateway. Re-creating
  // the client (rather than mutating) keeps supabase-js's internal
  // headers in sync with the new apikey.
  const supa = createClient(SUPABASE_URL, DISPATCH_TOKEN);

  const staleCutoff = new Date(Date.now() - STALE_THRESHOLD_DAYS * 86400_000).toISOString();

  /* Candidate selection:
       (a) canonical_overview_at IS NULL  → never extracted
       (b) canonical_overview_at < 90d ago → stale, refresh
     Order: nulls first (so brand-new rows get a canonical asap), then
     oldest-first within stale. Skip rows with no usable URL — those
     would early-return "no_clean_url" and waste the cron slot.

     Verification gate: keep rows the catalog shows (verified, stale,
     pending, NULL) and exclude 'broken'. Pre-fix .neq("verification_
     status", "broken") silently dropped NULL-status rows too because
     SQL evaluates `NULL <> 'broken'` as NULL, which WHERE treats as
     FALSE — leaving any row inserted before the column existed in a
     permanent canonical-extract dead zone. */
  const { data: nullRows, error: nullErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, canonical_overview_at")
    .or("official_url.not.is.null,source_url.not.is.null,canonical_official_url.not.is.null")
    .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
    .is("canonical_overview_at", null)
    .limit(MAX_PER_RUN);

  if (nullErr) return json(500, { error: "candidate query failed (null)", reason: nullErr.message });

  let candidates = nullRows ?? [];

  // Top up with stale rows if there's room left in the budget.
  if (candidates.length < MAX_PER_RUN) {
    const remaining = MAX_PER_RUN - candidates.length;
    const { data: staleRows } = await supa
      .from("scholarships")
      .select("scholarship_id, scholarship_name, canonical_overview_at")
      .or("official_url.not.is.null,source_url.not.is.null,canonical_official_url.not.is.null")
      .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
      .lt("canonical_overview_at", staleCutoff)
      .order("canonical_overview_at", { ascending: true })
      .limit(remaining);
    if (staleRows) candidates = [...candidates, ...staleRows];
  }

  if (candidates.length === 0) {
    return json(200, { ok: true, candidates: 0, message: "no rows to extract" });
  }

  const counters = { extracted: 0, no_clean_url: 0, low_confidence: 0, scrape_failed: 0, llm_failed: 0, other: 0 };
  const errors: string[] = [];

  const startedAt = Date.now();
  let processed = 0;

  const extractOne = async (c: typeof candidates[number]) => {
    try {
      const { data, error } = await supa.functions.invoke<{
        ok: boolean;
        reason?: string;
        changed?: string[];
      }>("canonical-extract", { body: { scholarship_id: c.scholarship_id } });

      if (error) { errors.push(`${c.scholarship_name}: ${error.message}`); counters.other++; return; }
      if (!data) { counters.other++; return; }

      if (data.ok) {
        counters.extracted++;
      } else {
        const r = data.reason ?? "other";
        if (r === "no_clean_url")        counters.no_clean_url++;
        else if (r === "low_confidence") counters.low_confidence++;
        else if (r === "scrape_failed" || r === "thin_content") counters.scrape_failed++;
        else if (r === "llm_http_error" || r === "llm_parse_failed" || r === "llm_empty_extraction") counters.llm_failed++;
        else counters.other++;
      }
    } catch (e) {
      errors.push(`${c.scholarship_name}: ${(e as Error).message}`);
      counters.other++;
    }
  };

  const queue = [...candidates];
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const elapsed = Date.now() - startedAt;
        if (elapsed > RUN_DEADLINE_MS - WORKER_QUIT_HEADROOM) return;
        const next = queue.shift();
        if (!next) return;
        await extractOne(next);
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
    errors: errors.slice(0, 20),
  });
});
