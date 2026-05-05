// saved-searches-cron
//
// Daily cron at 08:00 UTC. For each enabled saved_search:
//   1. Fetch scholarships added/updated since the search's last_alert_at
//      (or created_at on first run) that are verified+active.
//   2. Apply the saved filter blob in Postgres-side predicates.
//   3. If ≥1 match → send the new-matches-digest email.
//   4. Stamp last_alert_at so tomorrow we don't re-send the same matches.
//
// Honors student_profiles.nudge_opt_out the same way the deadline + weekly
// crons do — single mute control across all email surfaces.
//
// Idempotency: per-day idempotencyKey derived from the search id + ISO
// date; re-running within the same day skips already-sent rows.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = Deno.env.get("PUBLIC_SITE_URL") ?? "https://topuni.org";

interface SavedSearchRow {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  last_alert_at: string | null;
  created_at: string;
}

interface ScholarshipMatch {
  scholarship_id: string;
  scholarship_name: string;
  host_country: string | null;
  coverage_type: string | null;
  application_deadline: string | null;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  official_url: string | null;
  field_of_study: string | null;
  degree_level: string | null;
  selectivity: string | null;
  target_demographics: string[] | null;
  created_at: string;
}

const formatDate = (iso: string | null): string | undefined => {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const formatCoverage = (c: string | null): string | undefined => {
  if (!c) return undefined;
  if (c === "full_ride") return "Full ride";
  if (c === "tuition_only") return "Tuition only";
  if (c === "partial") return "Partial";
  if (c === "stipend") return "Stipend";
  return c;
};

/* The Discover client filter language. Mirror the predicates here so a
 * saved search returns the same rows server-side as it would client-side
 * on /discover. Keep this aligned with the FilterState definition in
 * src/pages/Discover.tsx; if a new key is added there, add it here too. */
function applyFilters(scholarship: ScholarshipMatch, filters: Record<string, unknown>): boolean {
  const f = filters as {
    coverage?: string;
    degree?: string;
    field?: string;
    selectivity?: string;
    hostCountry?: string;
    demographic?: string;
    closingSoon?: boolean;
  };
  if (f.coverage && f.coverage !== "all") {
    if (f.coverage === "partial") {
      if (scholarship.coverage_type !== "partial" && scholarship.coverage_type !== "stipend") return false;
    } else {
      if (scholarship.coverage_type !== f.coverage) return false;
    }
  }
  if (f.degree && f.degree !== "all" && scholarship.degree_level !== f.degree) return false;
  if (f.field && f.field !== "all" && scholarship.field_of_study !== f.field) return false;
  if (f.selectivity && f.selectivity !== "all") {
    // The "Competitive" bucket includes both high + very_high.
    if (f.selectivity === "high") {
      if (scholarship.selectivity !== "high" && scholarship.selectivity !== "very_high") return false;
    } else {
      if (scholarship.selectivity !== f.selectivity) return false;
    }
  }
  if (f.hostCountry && f.hostCountry !== "all" && scholarship.host_country !== f.hostCountry) return false;
  if (f.demographic && f.demographic !== "all") {
    if (!scholarship.target_demographics?.includes(f.demographic)) return false;
  }
  if (f.closingSoon) {
    if (!scholarship.application_deadline) return false;
    const days = Math.ceil((new Date(scholarship.application_deadline).getTime() - Date.now()) / 86400_000);
    if (days < 0 || days > 90) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: searches, error: searchErr } = await supa
    .from("saved_searches")
    .select("id, user_id, name, filters, last_alert_at, created_at")
    .eq("alert_enabled", true)
    .returns<SavedSearchRow[]>();
  if (searchErr) {
    return new Response(JSON.stringify({ error: searchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!searches || searches.length === 0) {
    return new Response(
      JSON.stringify({ searches: 0, sent: 0, duration_ms: Date.now() - startedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Filter out users who muted nudges.
  const userIds = Array.from(new Set(searches.map((s) => s.user_id)));
  const { data: profiles } = await supa
    .from("student_profiles")
    .select("user_id, full_name, email, nudge_opt_out")
    .in("user_id", userIds);
  const profileMap = new Map<string, { full_name: string | null; email: string | null; nudge_opt_out: boolean }>(
    (profiles ?? []).map((p) => [p.user_id, p as any]),
  );

  // Pull a single batch of recent scholarships and apply each user's
  // filters in memory. Far cheaper than running N filtered queries.
  // 30-day window covers the case where the cron has been off for
  // weeks; older rows aren't "new" enough to surface anyway.
  const window = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: recentScholarships } = await supa
    .from("scholarships")
    .select(
      "scholarship_id, scholarship_name, host_country, coverage_type, " +
      "application_deadline, award_amount_text, estimated_total_value_usd, " +
      "official_url, field_of_study, degree_level, selectivity, " +
      "target_demographics, created_at",
    )
    .in("verification_status", ["verified", "stale", "pending"])
    .in("lifecycle_status", ["active", "reopens_annually"])
    .gte("created_at", window)
    .returns<ScholarshipMatch[]>();
  const recent = recentScholarships ?? [];

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const search of searches) {
    const profile = profileMap.get(search.user_id);
    if (!profile?.email) {
      skipped++;
      continue;
    }
    if (profile.nudge_opt_out) {
      skipped++;
      continue;
    }
    const since = search.last_alert_at ? new Date(search.last_alert_at) : new Date(search.created_at);
    const newMatches = recent
      .filter((s) => new Date(s.created_at) > since)
      .filter((s) => applyFilters(s, search.filters));

    if (newMatches.length === 0) {
      skipped++;
      continue;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: profile.email,
          templateName: "new-matches-digest",
          idempotencyKey: `saved-search-${search.id}-${today}`,
          templateData: {
            name: profile.full_name?.split(" ")[0] || undefined,
            searchName: search.name,
            searchUrl: `${SITE}/discover`,
            manageUrl: `${SITE}/account?action=saved-searches`,
            totalNew: newMatches.length,
            matches: newMatches.slice(0, 8).map((m) => ({
              name: m.scholarship_name,
              hostCountry: m.host_country || undefined,
              coverage: formatCoverage(m.coverage_type),
              deadline: formatDate(m.application_deadline),
              url: m.official_url || undefined,
              amount: m.award_amount_text || undefined,
            })),
          },
        },
      });
      if (sendErr) throw new Error(`send-transactional-email: ${sendErr.message}`);

      await supa
        .from("saved_searches")
        .update({ last_alert_at: new Date().toISOString() })
        .eq("id", search.id);

      sent++;
    } catch (e) {
      errors.push(`${search.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(
    JSON.stringify({
      searches: searches.length,
      sent,
      skipped,
      errors_count: errors.length,
      first_errors: errors.slice(0, 5),
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
