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

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

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
  /* Real scholarships-table columns. Earlier this interface declared
   * `field_of_study` / `degree_level` / `selectivity` which are columns
   * on the `programs` table — silently NULL on scholarship rows, so
   * the corresponding filters in applyFilters() were no-ops and users
   * got digests of rows that did not match their saved filter. */
  target_fields: string[] | null;
  target_degree_level: string[] | null;
  selectivity_level: string | null;
  target_demographics: string[] | null;
  data_completeness_score: number | null;
  created_at: string;
}

const formatDate = (iso: string | null, lang: "en" | "ru" = "en"): string | undefined => {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
};

const COVERAGE_LABELS = {
  en: { full_ride: "Full ride", tuition_only: "Tuition only", partial: "Partial", stipend: "Stipend" },
  ru: { full_ride: "Полное покрытие", tuition_only: "Только обучение", partial: "Частичное", stipend: "Стипендия" },
} as const;

const formatCoverage = (c: string | null, lang: "en" | "ru" = "en"): string | undefined => {
  if (!c) return undefined;
  const labels = COVERAGE_LABELS[lang];
  return (labels as Record<string, string>)[c] ?? c;
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
  // Degree filter — match if the scholarship's target_degree_level array
  // contains the requested level. Empty/null means "any" → pass.
  if (f.degree && f.degree !== "all") {
    const levels = scholarship.target_degree_level ?? [];
    if (levels.length > 0 && !levels.includes(f.degree)) return false;
  }
  // Field filter — match against ANY entry in target_fields. Both sides
  // case-insensitive so "Computer Science" / "computer science" match.
  // The catalog is canonicalized to Title Case via 20260507200000 so
  // a direct case-insensitive compare is sufficient.
  if (f.field && f.field !== "all") {
    const fields = scholarship.target_fields ?? [];
    const want = f.field.toLowerCase();
    if (fields.length > 0 && !fields.some((v) => typeof v === "string" && v.toLowerCase() === want)) return false;
  }
  if (f.selectivity && f.selectivity !== "all") {
    // The "Competitive" bucket includes both high + very_high.
    if (f.selectivity === "high") {
      if (scholarship.selectivity_level !== "high" && scholarship.selectivity_level !== "very_high") return false;
    } else {
      if (scholarship.selectivity_level !== f.selectivity) return false;
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
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return respondError(405, "POST only", corsHeaders);

  const startedAt = Date.now();
  const supa = createServiceClient();

  const { data: searches, error: searchErr } = await supa
    .from("saved_searches")
    .select("id, user_id, name, filters, last_alert_at, created_at")
    .eq("alert_enabled", true)
    .returns<SavedSearchRow[]>();
  if (searchErr) return respondError(500, searchErr.message, corsHeaders);
  if (!searches || searches.length === 0) {
    return respondJson(200, { searches: 0, sent: 0, duration_ms: Date.now() - startedAt }, corsHeaders);
  }

  // Filter out users who muted nudges.
  const userIds = Array.from(new Set(searches.map((s) => s.user_id)));
  // student_profiles has no `language` column — selecting it was 400-ing
  // the whole query, so this cron was likely never sending. Default to
  // English; a per-user language preference can be added later (would
  // need an ALTER TABLE + the wizard to capture it on signup).
  const { data: profiles } = await supa
    .from("student_profiles")
    .select("user_id, full_name, email, nudge_opt_out")
    .in("user_id", userIds);
  const profileMap = new Map<string, { full_name: string | null; email: string | null; nudge_opt_out: boolean }>(
    (profiles ?? []).map((p) => [p.user_id, p]),
  );

  // Pull a single batch of recent scholarships and apply each user's
  // filters in memory. Far cheaper than running N filtered queries.
  // 30-day window covers the case where the cron has been off for
  // weeks; older rows aren't "new" enough to surface anyway.
  const window = new Date(Date.now() - 30 * 86400_000).toISOString();
  // Match the Discover read filter exactly. .in() drops NULL rows, but
  // the catalog query in Discover explicitly includes NULL — leaving
  // NULL-status rows visible in the UI but invisible to saved-search
  // alerts, so a user can browse-and-save a scholarship that will
  // NEVER show up in their digest.
  const { data: recentScholarships } = await supa
    .from("scholarships")
    .select(
      "scholarship_id, scholarship_name, host_country, coverage_type, " +
      "application_deadline, award_amount_text, estimated_total_value_usd, " +
      "official_url, target_fields, target_degree_level, selectivity_level, " +
      "target_demographics, data_completeness_score, created_at",
    )
    .or("verification_status.is.null,verification_status.in.(verified,stale,pending)")
    .or("lifecycle_status.is.null,lifecycle_status.in.(active,reopens_annually)")
    // Quality floor — only digest rows that carry enough information to
    // be useful in an email subject line. Matches the Discover min-info
    // gate intent (≥2 substantive signals beyond name+provider+country).
    // Filters out the thinnest aggregator-derived rows that would
    // otherwise pad the digest with nothing-to-evaluate entries.
    .or("data_completeness_score.gte.10,data_completeness_score.is.null")
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
      const userLang: "en" | "ru" = "en";
      const ru = false;
      const { error: sendErr } = await supa.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: profile.email,
          templateName: "new-matches-digest",
          idempotencyKey: `saved-search-${search.id}-${today}`,
          templateData: {
            name: profile.full_name?.split(" ")[0] || undefined,
            searchName: search.name,
            searchUrl: `${SITE}${ru ? "/discover/ru" : "/discover"}`,
            manageUrl: `${SITE}${ru ? "/account/ru" : "/account"}?action=saved-searches`,
            totalNew: newMatches.length,
            matches: newMatches.slice(0, 8).map((m) => ({
              name: m.scholarship_name,
              hostCountry: m.host_country || undefined,
              coverage: formatCoverage(m.coverage_type, userLang),
              deadline: formatDate(m.application_deadline, userLang),
              url: m.official_url || undefined,
              amount: m.award_amount_text || undefined,
            })),
            language: userLang,
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

  return respondJson(200, {
    searches: searches.length,
    sent,
    skipped,
    errors_count: errors.length,
    first_errors: errors.slice(0, 5),
    duration_ms: Date.now() - startedAt,
  }, corsHeaders);
});
