// enrich-scholarships-content-cron
//
// Daily-runnable. Picks up to MAX_PER_RUN scholarships that are missing
// any of the soft descriptive fields (why_this_fits, ideal_candidate_
// profile, how_to_win, what_to_prepare_first, best_for_tags) and fills
// them via enrich-scholarship-content.
//
// One-shot or scheduled. MAX_PER_RUN=100 drains the existing
// missing-soft-fields backlog in ~2 daily passes. After backlog is
// gone, new rows from scrape-source enter pending and naturally flow
// through this cron at the same per-day cap.
//
// Cost shape: 100 × ~$0.0008 = $0.08/day cap on AI spend.

import { getDispatchClient } from "../_shared/dispatchClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_PER_RUN = 100;
const THROTTLE_MS = 1200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // dispatchClient loads the rotation-resilient apikey from
  // private.app_secrets — supa.functions.invoke below then succeeds
  // against the API gateway even when the env-injected service-role
  // key is the legacy JWT format (which the gateway now rejects).
  let supa;
  try {
    ({ supa } = await getDispatchClient());
  } catch (e) {
    return json(500, { error: `Missing Supabase env: ${(e as Error).message}` });
  }

  // Candidates: rows missing ANY of the eight soft fields. Exclude broken
  // rows (per the same contract LLMs use) so we don't burn AI budget
  // enriching content for scholarships we've hidden.
  //
  // The list now includes the three trust-telling fields
  // (common_rejection_reasons / weak_candidate_warning / strategy_notes)
  // — these are what makes the Strategy tab decision-grade rather than
  // generic. Worth re-running across rows that already have the basic
  // five filled but lack these.
  // Filter to the same gate the read-side uses: verified, stale, pending,
  // or NULL — anything except 'broken'. Pre-fix .neq("verification_status",
  // "broken") silently excluded rows with NULL verification_status because
  // PostgreSQL evaluates `NULL <> 'broken'` as NULL (unknown → FALSE in
  // WHERE). The catalog still renders those rows (Discover's read query
  // includes them explicitly), so the user sees thin rows that this cron
  // would never enrich — a permanent enrichment dead zone.
  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name")
    .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
    .or(
      "why_this_fits.is.null,ideal_candidate_profile.is.null," +
      "how_to_win.is.null,what_to_prepare_first.is.null,best_for_tags.is.null," +
      "common_rejection_reasons.is.null,weak_candidate_warning.is.null,strategy_notes.is.null"
    )
    .limit(MAX_PER_RUN);

  if (candErr) {
    console.error("[enrich-scholarships-content-cron] candidate query failed", candErr);
    return json(500, { error: "candidate query failed", reason: candErr.message });
  }
  if (!candidates || candidates.length === 0) {
    return json(200, { ok: true, candidates: 0, filled: 0 });
  }

  let filled = 0;
  let alreadyFull = 0;
  let failed = 0;
  const errors: string[] = [];
  let totalFieldsFilled = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (i > 0) await new Promise(r => setTimeout(r, THROTTLE_MS));

    try {
      const { data, error } = await supa.functions.invoke<{
        ok: boolean;
        status?: string;
        filled: string[];
      }>("enrich-scholarship-content", { body: { scholarship_id: c.scholarship_id } });

      if (error) {
        errors.push(`${c.scholarship_name}: ${error.message}`);
        failed++;
        continue;
      }
      if (data?.status === "already_full") alreadyFull++;
      else if (data?.filled && data.filled.length > 0) {
        filled++;
        totalFieldsFilled += data.filled.length;
      } else {
        failed++;
      }
    } catch (e) {
      errors.push(`${c.scholarship_name}: ${(e as Error).message}`);
      failed++;
    }
  }

  return json(200, {
    ok: true,
    candidates: candidates.length,
    filled,
    fields_filled_total: totalFieldsFilled,
    already_full: alreadyFull,
    failed,
    errors,
  });
});
