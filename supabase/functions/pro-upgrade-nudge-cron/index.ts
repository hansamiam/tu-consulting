// pro-upgrade-nudge-cron
//
// Daily cron. For every authed user who:
//   1. Generated a basic-tier brief 5–14 days ago (`last_brief_generated_at`)
//   2. Is NOT a paying member (no active subscription)
//   3. Hasn't already been pro-nudged (`pro_nudge_sent_at IS NULL`)
//
// …this function fires the `pro-upgrade-nudge` email and stamps
// `pro_nudge_sent_at` so re-running the cron the next day doesn't
// double-send.
//
// Why 5–14 days, not earlier:
//   • Day 0–4: too soon — they're still digesting the basic brief.
//   • Day 5–14: the brief is fresh enough they remember reading it,
//     long enough that the "what comes next" question is open.
//   • Day 15+: drift, low conversion, less clean signal that they
//     actually engaged.
//
// Per-user errors logged but don't abort the run (one user with a
// broken email shouldn't stop the rest of the cohort from being
// nudged).
//
// Schedule via pg_cron:
//   select cron.schedule('pro-upgrade-nudge-cron', '0 14 * * *',
//     $$ select net.http_post(
//          url := 'https://<project>.supabase.co/functions/v1/pro-upgrade-nudge-cron',
//          headers := jsonb_build_object(
//            'Authorization', 'Bearer ' || current_setting('app.cron_token', true),
//            'Content-Type', 'application/json'
//          )
//        ) $$);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrService } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

// 5–14 days ago is the nudge window. Tweak if conversion data tells us
// to compress (e.g. nudge at Day 3) or extend (e.g. add a Day 21 v2).
const NUDGE_WINDOW_MIN_DAYS = 5;
const NUDGE_WINDOW_MAX_DAYS = 14;

// Founding cohort gate — flips the email's CTA copy and subject. When
// false, the email still sends but with the standard $39/mo framing.
const FOUNDING_DISCOUNT_ACTIVE = true;

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  major: string | null;
  field_of_study: string | null;
  target_countries: string[] | null;
  last_brief_generated_at: string | null;
  pro_nudge_sent_at: string | null;
  language: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron / admin gate. verify_jwt is false for this function (the gateway
  // can't see the cron's sb_secret apikey as a JWT), so it authenticates
  // the caller itself here.
  const auth = await requireAdminOrService(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.reason ?? "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

  const now = Date.now();
  const minBriefAt = new Date(now - NUDGE_WINDOW_MAX_DAYS * 86400_000).toISOString();
  const maxBriefAt = new Date(now - NUDGE_WINDOW_MIN_DAYS * 86400_000).toISOString();

  // Resolve the candidate cohort: brief age in window, never been pro-nudged.
  const { data: candidates, error: candErr } = await supa
    .from("student_profiles")
    .select("user_id, full_name, email, major, field_of_study, target_countries, last_brief_generated_at, pro_nudge_sent_at, language")
    .gte("last_brief_generated_at", minBriefAt)
    .lte("last_brief_generated_at", maxBriefAt)
    .is("pro_nudge_sent_at", null)
    .not("email", "is", null)
    .returns<ProfileRow[]>();

  if (candErr) {
    console.error("[pro-upgrade-nudge-cron] candidate query failed", candErr);
    return new Response(JSON.stringify({ error: "candidate query failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!candidates || candidates.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0, errors: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter out paying members. The subscriptions table is keyed by user_id;
  // active subscribers are anyone with subscription_tier set and status='active'.
  const userIds = candidates.map(c => c.user_id);
  const { data: payingSubs } = await supa
    .from("subscriptions")
    .select("user_id")
    .in("user_id", userIds)
    .eq("status", "active");
  const paying = new Set((payingSubs ?? []).map(s => s.user_id));

  const eligible = candidates.filter(c => !paying.has(c.user_id));

  let sent = 0;
  let skipped = candidates.length - eligible.length;
  const errors: string[] = [];

  for (const profile of eligible) {
    if (!profile.email) { skipped++; continue; }

    const daysSinceBrief = profile.last_brief_generated_at
      ? Math.floor((now - new Date(profile.last_brief_generated_at).getTime()) / 86400_000)
      : NUDGE_WINDOW_MIN_DAYS;

    try {
      const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: profile.email,
          templateName: "pro-upgrade-nudge",
          // Idempotency key includes the user_id alone so a re-fire on
          // the same user (which shouldn't happen given the IS NULL
          // gate, but safety in depth) is dropped at the queue layer.
          idempotencyKey: `pro-nudge-${profile.user_id}`,
          templateData: {
            firstName: profile.full_name?.split(" ")[0] || undefined,
            briefUrl: profile.language === "ru" ? `${SITE}/topuni-ai/ru` : `${SITE}/topuni-ai`,
            pricingUrl: profile.language === "ru" ? `${SITE}/pricing/ru` : `${SITE}/pricing`,
            major: profile.major ?? profile.field_of_study ?? undefined,
            targetCountries: profile.target_countries ?? [],
            daysSinceBrief,
            foundingDiscountActive: FOUNDING_DISCOUNT_ACTIVE,
            language: profile.language === "ru" ? "ru" : "en",
          },
        },
      });
      if (sendErr) throw new Error(sendErr.message);

      // Stamp pro_nudge_sent_at — if this fails the next run will just
      // re-fire the email, so we treat the stamp as best-effort here too.
      const { error: stampErr } = await supa
        .from("student_profiles")
        .update({ pro_nudge_sent_at: new Date().toISOString() })
        .eq("user_id", profile.user_id);
      if (stampErr) console.warn("[pro-upgrade-nudge-cron] stamp failed", profile.user_id, stampErr);

      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${profile.user_id}: ${msg}`);
      console.error("[pro-upgrade-nudge-cron] send failed", profile.user_id, msg);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, skipped, errors, candidateCount: candidates.length, eligibleCount: eligible.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
