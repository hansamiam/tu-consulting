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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cap per run so a misconfigured deploy can't burn the entire AI/Firecrawl
// budget in one cron tick. 100 × ~$0.0035 = $0.35/day max spend.
const MAX_PER_RUN = 100;
// Throttle between calls so the AI gateway and Firecrawl don't see
// burst traffic.
const THROTTLE_MS = 1500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Missing Supabase env" });
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Candidates: have a source_url, not currently broken, ordered by oldest
  // verification timestamp first (NULLs first → never-verified rows are
  // top of queue).
  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, last_verified_at, verification_status")
    .not("source_url", "is", null)
    .neq("verification_status", "broken")
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
    errors,
  });
});
