// enrich-universities-cron
//
// Daily-runnable. Picks up universities that haven't been enriched in the
// last 180 days (or never), fans out to enrich-university with sequential
// throttling so we don't burst the AI gateway.
//
// Returns telemetry per run: how many candidates, how many enriched, how
// many errored, how many fields filled across the cohort.
//
// Schedule via pg_cron after deploy:
//   select cron.schedule('enrich-universities-cron', '0 3 * * *',
//     $$ select net.http_post(
//          url := '<fn-url>/enrich-universities-cron',
//          headers := jsonb_build_object(
//            'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
//            'Content-Type', 'application/json'
//          )
//        ) $$);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Per-run cap so a misconfigured deploy can't burn the entire AI budget.
// Adjust upward as we get comfortable with the per-row cost (~$0.0015).
const MAX_PER_RUN = 25;
// Staleness window — re-enrich rows older than this.
const STALENESS_DAYS = 180;
// Sequential throttle — sleep N ms between enrich-university calls so we
// stay below burst caps on the AI gateway.
const THROTTLE_MS = 2000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json(500, { error: "Missing Supabase env" });

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Find candidates: enriched_at IS NULL OR enriched_at < now() - 180 days.
  const stalenessCutoff = new Date(Date.now() - STALENESS_DAYS * 86400_000).toISOString();
  const { data: candidates, error: candErr } = await supa
    .from("universities")
    .select("university_id, university_name, enriched_at")
    .or(`enriched_at.is.null,enriched_at.lt.${stalenessCutoff}`)
    .order("enriched_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN);

  if (candErr) {
    console.error("[enrich-universities-cron] candidate query failed", candErr);
    return json(500, { error: "candidate query failed", reason: candErr.message });
  }
  if (!candidates || candidates.length === 0) {
    return json(200, { ok: true, candidates: 0, enriched: 0, errors: [] });
  }

  let enriched = 0;
  const errors: string[] = [];
  let totalUniFields = 0;
  let totalAdmFields = 0;
  let totalAppFields = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    try {
      // Throttle — but not before the first one.
      if (i > 0) await new Promise(r => setTimeout(r, THROTTLE_MS));

      const { data, error } = await supa.functions.invoke<{
        ok: boolean;
        fields_updated: { university: number; admission_requirements: number; applications: number };
      }>("enrich-university", { body: { university_id: c.university_id } });

      if (error) {
        errors.push(`${c.university_name}: ${error.message}`);
        continue;
      }
      if (!data?.ok) {
        errors.push(`${c.university_name}: enrich-university returned not-ok`);
        continue;
      }
      enriched++;
      totalUniFields += data.fields_updated?.university ?? 0;
      totalAdmFields += data.fields_updated?.admission_requirements ?? 0;
      totalAppFields += data.fields_updated?.applications ?? 0;
    } catch (e) {
      errors.push(`${c.university_name}: ${(e as Error).message}`);
    }
  }

  return json(200, {
    ok: true,
    candidates: candidates.length,
    enriched,
    fields_filled: {
      university:             totalUniFields,
      admission_requirements: totalAdmFields,
      applications:           totalAppFields,
    },
    errors,
  });
});
