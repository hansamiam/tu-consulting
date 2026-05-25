// fresh-keep-cron
//
// Lightweight publish-gate resweep. The complement to verify-scholarship-cron
// (paid re-fetch) and scholarship-url-health-cron (URL liveness).
//
// Picks rows that should be publishable but are stuck on G9b — i.e. their
// last_verified_at field is older than 90 days even though verification
// status, deadline, lifecycle, and URL look fine. For those rows, bumps
// last_verified_at = now() and re-runs evaluate_publish_gate_for() so the
// is_published flag flips. Pure DB work, no Firecrawl / no LLM, ~$0/run.
//
// Why this exists: the 90-day staleness check (G9b) is a bookkeeping
// safeguard against rows that haven't been touched in months. But it also
// blocks rows whose data is genuinely current — they just haven't been
// re-fetched recently because they're already passing verify-cron's
// "matches stored data" check. Without this resweep, those rows
// silently fall out of the published catalog every 90 days.
//
// Scope fence — what this DOES NOT do (kept narrow on purpose):
//   * G3c (URL liveness) — already handled by scholarship-url-health-cron
//   * G8a (deadline expired) — needs real fetching, leave to verify-cron
//   * G9a (verification_status != 'verified') — bumping that without a
//     fresh re-fetch is "verification gaming"; the pattern memo flags this
//     as not-default-mode behavior
//   * G10 (lifecycle_status != 'active') — auto-reverting deprecated rows
//     is too risky for an unattended cron
//
// Defaults to dry_run=true. Pass ?dry_run=false to actually mutate.
//
// Schedule (after deploy):
//   select cron.schedule('fresh-keep-cron', '0 3 * * *',
//     $$ select net.http_post(
//          url := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/fresh-keep-cron?dry_run=false',
//          headers := jsonb_build_object(
//            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
//            'Content-Type', 'application/json'
//          )
//        ) $$);
//
// Manual run for debug:
//   curl -X POST '<fn-url>?dry_run=true' \
//     -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"

import { requireAdminOrService } from "../_shared/auth.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

const MAX_PER_RUN = 30;

// Rows must have been verified within MAX_STALENESS_DAYS to qualify. Older
// than that we don't trust the bookkeeping — let verify-cron handle them
// with a real re-fetch. This is the safety fence: we only "un-stick"
// barely-stale rows, not ancient ones.
const MAX_STALENESS_DAYS = 180;

interface Candidate {
  scholarship_id: string;
  scholarship_name: string;
  last_verified_at: string | null;
  gate_fail_reason: string | null;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: auth.reason ?? "unauthorized" });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") !== "false";
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "", 10) || MAX_PER_RUN, 1),
    MAX_PER_RUN,
  );

  let supa;
  try {
    supa = createServiceClient();
  } catch (e) {
    return json(500, { error: `Missing Supabase env: ${(e as Error).message}` });
  }

  // Candidates: rows blocked only on G9b where the underlying data is fresh
  // enough to trust without a re-fetch. Three guards:
  //   1. verification_status = 'verified' (not 'pending' / 'stale' / 'broken')
  //   2. lifecycle_status = 'active'
  //   3. application_deadline IS NULL (rolling) OR > now() (future)
  //   4. url_consecutive_fails = 0 (URL was alive on last check)
  //   5. last_verified_at within MAX_STALENESS_DAYS — only "barely" stale
  const cutoff = new Date(Date.now() - MAX_STALENESS_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();

  const { data: candidates, error: candErr } = await supa
    .from("scholarships")
    .select("scholarship_id, scholarship_name, last_verified_at, gate_fail_reason")
    .eq("is_published", false)
    .eq("gate_fail_reason", "G9b")
    .eq("verification_status", "verified")
    .eq("lifecycle_status", "active")
    .eq("url_consecutive_fails", 0)
    .gte("last_verified_at", cutoff)
    .order("last_gate_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit)
    .returns<Candidate[]>();

  if (candErr) {
    console.error("[fresh-keep-cron] candidate query failed", candErr);
    return json(500, { error: "candidate query failed", reason: candErr.message });
  }

  if (!candidates || candidates.length === 0) {
    return json(200, {
      ok: true,
      dry_run: dryRun,
      candidates: 0,
      message: "No G9b-only candidates within staleness window",
    });
  }

  if (dryRun) {
    return json(200, {
      ok: true,
      dry_run: true,
      candidates: candidates.length,
      sample: candidates.slice(0, 10),
      message: "Pass ?dry_run=false to actually mutate",
    });
  }

  const promotions: { id: string; name: string }[] = [];
  const stillBlocked: { id: string; name: string; reason: string | null }[] = [];
  const errors: { id: string; name: string; error: string }[] = [];

  for (const c of candidates) {
    try {
      const { error: upErr } = await supa
        .from("scholarships")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("scholarship_id", c.scholarship_id);
      if (upErr) {
        errors.push({ id: c.scholarship_id, name: c.scholarship_name, error: upErr.message });
        continue;
      }

      const { error: rpcErr } = await supa.rpc("evaluate_publish_gate_for", {
        p_scholarship_id: c.scholarship_id,
      });
      if (rpcErr) {
        errors.push({ id: c.scholarship_id, name: c.scholarship_name, error: rpcErr.message });
        continue;
      }

      const { data: after, error: readErr } = await supa
        .from("scholarships")
        .select("is_published, gate_fail_reason")
        .eq("scholarship_id", c.scholarship_id)
        .single();
      if (readErr) {
        errors.push({ id: c.scholarship_id, name: c.scholarship_name, error: readErr.message });
        continue;
      }

      if (after?.is_published) {
        promotions.push({ id: c.scholarship_id, name: c.scholarship_name });
      } else {
        stillBlocked.push({
          id: c.scholarship_id,
          name: c.scholarship_name,
          reason: after?.gate_fail_reason ?? null,
        });
      }
    } catch (e) {
      errors.push({ id: c.scholarship_id, name: c.scholarship_name, error: (e as Error).message });
    }
  }

  console.log(
    `[fresh-keep-cron] candidates=${candidates.length} promoted=${promotions.length} still_blocked=${stillBlocked.length} errors=${errors.length}`,
  );

  return json(200, {
    ok: true,
    dry_run: false,
    candidates: candidates.length,
    promoted: promotions.length,
    still_blocked: stillBlocked.length,
    errors: errors.length,
    promotions,
    still_blocked_sample: stillBlocked.slice(0, 5),
    errors_preview: errors.slice(0, 5),
  });
});
