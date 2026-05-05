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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Missing Supabase env" });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Candidates: rows missing ANY of the eight soft fields. Exclude broken
  // rows (per the same contract LLMs use) so we don't burn AI budget
  // enriching content for scholarships we've hidden.
  //
  // The list now includes the three trust-telling fields
  // (common_rejection_reasons / weak_candidate_warning / strategy_notes)
  // — these are what makes the Strategy tab decision-grade rather than
  // generic. Worth re-running across rows that already have the basic
  // five filled but lack these.
  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name")
    .neq("verification_status", "broken")
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
