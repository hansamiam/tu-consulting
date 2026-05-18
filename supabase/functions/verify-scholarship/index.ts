// verify-scholarship
//
// Self-healing verification pass. Takes a scholarship_id, re-fetches its
// `source_url`, re-extracts the structured fields via the AI gateway with
// the same schema scrape-source uses, then DIFFs against the stored row.
//
// Outcomes:
//   · Source URL unreachable               → verification_status='broken'
//   · Re-extracted matches stored          → verification_status='verified',
//                                             last_verified_at=now()
//   · Re-extracted differs (deadline/value/
//     coverage/etc.)                       → log diff to scrape_runs +
//                                             write the new values to a
//                                             scholarships_staging row for
//                                             admin review (don't auto-
//                                             overwrite — operator gates)
//   · LLM confidence too low / parse fail  → verification_status stays as-is,
//                                             last_verified_at NOT advanced
//                                             (so this row is picked up
//                                             again next pass)
//
// Used by:
//   · /admin/scholarships-verification "Re-verify" button (interactive)
//   · verify-scholarship-cron daily self-heal (batch)
//
// Auth: admin OR service-role only. Never anon.

import { chatCompletions } from "../_shared/ai-gateway.ts";
import { firecrawlScrape, FIRECRAWL_COST_PER_SCRAPE_USD } from "../_shared/firecrawl.ts";
import { requireAdminOrService } from "../_shared/auth.ts";
import {
  cleanScholarshipName,
  cleanProvider,
  cleanTargetFields,
  cleanHostCountry,
  cleanAwardText,
  cleanEligibleCountries,
  cleanCitizenshipRequirements,
  cleanTargetDemographics,
  extractDemographicsFromCitizenship,
  stripUserRelative,
  inferHostCountryFromNames,
  isKnownAnnualProgram,
  knownProgramValueUsd,
  inferDegreeLevelsFromNames,
} from "../_shared/scholarshipFields.ts";
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import type { Json } from "../_shared/database.types.ts";

const json = (status: number, body: unknown) =>
  respondJson(status, body, corsHeaders);

const COST_ESTIMATE_USD = 0.0015 + FIRECRAWL_COST_PER_SCRAPE_USD;
const MAX_MARKDOWN_CHARS = 25_000;
const MIN_CONFIDENCE_TO_TRUST = 0.7;

/* Field-level diff threshold rules. We don't flag micro-changes (case
   diffs, trailing whitespace) — only material drift the user would
   notice. */
const DIFF_FIELDS = [
  "application_deadline",
  "deadline_type",
  "coverage_type",
  "award_amount_text",
  "estimated_total_value_usd",
  "min_gpa",
  "min_ielts",
  "min_toefl",
  "min_sat",
  "essay_required",
  "recommendation_letters_required",
  "interview_required",
] as const;

/* Fields where NULL→value (additive backfill) is silently applied
 * instead of staged for review. These are "we didn't know, now we do"
 * additions rather than contradictions, so writing them directly
 * progressively heals the catalog without admin intervention. Existing-
 * value → different-value transitions on these fields are NOT silently
 * overwritten — they go through the staging diff flow if added to
 * DIFF_FIELDS. We keep DIFF_FIELDS focused on the user-facing surface
 * (deadlines / amounts / requirements); the backfill set covers
 * structured matching inputs that the eligibility predicate uses. */
const BACKFILL_NULL_FIELDS = [
  "eligible_countries",
  "target_fields",
  "target_degree_level",
  "target_demographics",
  "partner_universities",
] as const;

/* Prose fields where NULL/empty → substantive value is silently
 * backfilled too. The Discover Overview tab has been showing thin
 * "funds X..." stubs because legacy rows landed without the prose
 * eligibility / citizenship / award text and the verify pass was
 * staging the additive backfill instead of writing it. Treating
 * NULL→value as additive (not a contradiction) heals the catalog
 * without admin review, while NULL→short or value→different still
 * goes through the staging flow. Min length 40 weeds out noise like
 * "Apply now" / "Funded" / "TBA" stubs that are technically
 * non-empty but aren't real overview content. */
const BACKFILL_NULL_PROSE_FIELDS = [
  "eligibility_requirements",
  "citizenship_requirements",
  "award_amount_text",
  "host_country",
  "language_requirements",
  "duration_text",
] as const;
const PROSE_BACKFILL_MIN_LEN = 40;

type DiffField = typeof DIFF_FIELDS[number];

interface ExtractedFields {
  scholarship_name?: string;
  provider_name?: string;
  host_country?: string;
  application_deadline?: string | null;
  deadline_type?: string | null;
  coverage_type?: string;
  award_amount_text?: string | null;
  estimated_total_value_usd?: number | null;
  min_gpa?: number | null;
  min_ielts?: number | null;
  min_toefl?: number | null;
  min_sat?: number | null;
  essay_required?: boolean | null;
  recommendation_letters_required?: number | null;
  interview_required?: boolean | null;
  citizenship_requirements?: string | null;
  eligibility_requirements?: string | null;
  // Prose fields used by the Overview tab. Were previously left out of
  // the extract schema, so legacy rows landed without them and the
  // overview rendered as thin chips. Now requested explicitly so verify
  // can backfill substantive content.
  language_requirements?: string | null;
  duration_text?: string | null;
  // Structured matching inputs — used by the eligibility predicate.
  // Often missing on legacy rows; verify pass progressively backfills.
  target_fields?: string[] | null;
  target_degree_level?: string[] | null;
  eligible_countries?: string[] | null;
  target_demographics?: string[] | null;
  partner_universities?: string[] | null;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an expert scholarship verifier. Given a web page that PREVIOUSLY described a known scholarship, re-extract its structured fields. Return STRICT JSON only — no prose, no fences. If the page no longer describes the scholarship clearly (404, redirected to unrelated content, paywall), set confidence < 0.5 and leave fields as null/empty. NEVER guess; missing data should remain missing.`;

const USER_PROMPT = (knownName: string, knownProvider: string | null, sourceUrl: string, markdown: string) => `
Scholarship being verified:
  · name: ${knownName}
  · provider: ${knownProvider ?? "(unknown)"}
  · source URL: ${sourceUrl}

Re-extract from the page content below. Fields to populate (or leave null):

{
  "scholarship_name": "...",
  "provider_name": "...",
  "host_country": "...",
  "application_deadline": "YYYY-MM-DD or null",
  "deadline_type": "rolling | annual | one-time | unknown",
  "coverage_type": "full_ride | partial | tuition_only | stipend | other",
  "award_amount_text": "Concrete prose listing every funding component. EXAMPLE: 'Full tuition fees plus a monthly living stipend of approximately £1,400, return economy airfare from home country, visa fee reimbursement, and a one-time arrival allowance of £700.' Aim for 2-3 sentences. NEVER write 'Funded' / 'Funding amount varies' / 'Apply now' — those are useless. If the page only says 'covers tuition', write the literal phrase the page uses.",
  "estimated_total_value_usd": 50000,
  "min_gpa": 3.5,
  "min_ielts": 7.0,
  "min_toefl": 100,
  "min_sat": 1450,
  "essay_required": true,
  "recommendation_letters_required": 2,
  "interview_required": true,
  "citizenship_requirements": "Concrete sentence naming who can apply by citizenship/residency. Example: 'Open to citizens of any Commonwealth or former Commonwealth country who are currently resident in their home country at the time of application.' Avoid stubs like 'See website' or 'Various'.",
  "eligibility_requirements": "RICH 2-4 sentence prose summary of all eligibility criteria the page lists: degree level, GPA / language tests if any, work experience, age limits, fields of study, demographic constraints, OTHER conditions. Synthesize across the page; don't copy a single sentence verbatim if the page has more. If the page is genuinely thin, write what's there in proper prose. Never just 'Funds X...' — that's not enough.",
  "language_requirements": "e.g. 'IELTS 7.0 with no band below 6.5' or 'Native or near-native English'",
  "duration_text": "e.g. '1 year (taught master's)' or '2-4 years depending on degree'",
  "target_fields": ["Computer Science"],
  "target_degree_level": ["master","phd"],
  "target_demographics": [],
  // ↑ Empty by default. Only add a tag from this CONSTRAINED SET when the
  //   program EXPLICITLY restricts to that group: "women","men","lgbtq",
  //   "first-generation","low-income","refugee","displaced","indigenous",
  //   "underrepresented-stem","underrepresented-minority","disability",
  //   "military-veteran","rural","mature-student". Diversity / equal-
  //   opportunity language ("welcomes underrepresented applicants",
  //   "encourages women to apply") is NOT a restriction — leave the
  //   array empty. Tagging a flagship merit award like Knight-Hennessy
  //   as {women, first-generation} from boilerplate diversity language
  //   has been the single biggest source of bad cards on /discover.
  "eligible_countries": ["India","Pakistan"],
  "partner_universities": ["Harvard University","MIT"],
  "confidence": 0.92
}

QUALITY BAR for the prose fields (award_amount_text, eligibility_requirements, citizenship_requirements):
- Write FULL sentences, not labels.
- Synthesize across the whole page; don't truncate to one clause.
- If the page is genuinely silent on a field, leave it null. NEVER write "varies" / "TBA" / "see website" / "apply for details" — those are useless to the reader.

Page content (markdown, may be truncated):
---
${markdown}
---
`;

/** Roll a past annual-cycle date forward by whole years until >= today.
 *  Returns the original string for null / unparseable / already-future
 *  inputs. Mirrors public.next_annual_occurrence (migration 20260510090000)
 *  so the write-time path matches what the scheduled SQL function does. */
function rollForwardAnnualDeadline(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const date = new Date(ms);
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  while (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) < todayUTC) {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }
  return date.toISOString().slice(0, 10);
}

function extractJson(s: string): unknown {
  let t = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

function diffMaterial(stored: Record<string, unknown>, fresh: ExtractedFields): { field: DiffField; was: unknown; now: unknown }[] {
  const diffs: { field: DiffField; was: unknown; now: unknown }[] = [];
  for (const f of DIFF_FIELDS) {
    const a = stored[f];
    const b = (fresh as unknown as Record<string, unknown>)[f];
    if (b === undefined || b === null) continue;
    // NULL/empty stored → fresh value is additive, not a contradiction.
    // Backfill set already silently writes prose-field NULL→value; we
    // mirror that here for the diff path so award_amount_text (which
    // is in BOTH lists) doesn't double-report as a diff to be staged.
    const storedEmpty =
      a === null ||
      a === undefined ||
      (typeof a === "string" && a.trim().length === 0);
    if (storedEmpty) continue;
    if (typeof a === "string" && typeof b === "string") {
      if (a.trim().toLowerCase() !== b.trim().toLowerCase()) diffs.push({ field: f, was: a, now: b });
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ field: f, was: a, now: b });
    }
  }
  return diffs;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return json(401, { error: `Unauthorized: ${auth.reason}` });

  let body: { scholarship_id?: string };
  try { body = await req.json(); }
  catch { return json(400, { error: "Invalid JSON body" }); }
  if (!body.scholarship_id) return json(400, { error: "scholarship_id required" });

  const supa = createServiceClient();

  const { data: stored, error: loadErr } = await supa
    .from("scholarships")
    .select(
      `scholarship_id, scholarship_name, provider_name, host_country, application_deadline, deadline_type, coverage_type, award_amount_text, estimated_total_value_usd, min_gpa, min_ielts, min_toefl, min_sat, essay_required, recommendation_letters_required, interview_required, citizenship_requirements, eligibility_requirements, language_requirements, duration_text, target_fields, target_degree_level, eligible_countries, target_demographics, partner_universities, why_this_fits, how_to_win, ideal_candidate_profile, what_to_prepare_first, strategy_notes, weak_candidate_warning, source_url, official_url, verification_status, last_verified_at`
    )
    .eq("scholarship_id", body.scholarship_id)
    .maybeSingle();

  if (loadErr || !stored) return json(404, { error: "Scholarship not found" });

  // ─── Progressive self-clean on load ─────────────────────────────
  // Apply the same hygiene cleaners to the stored name + provider.
  // If they differ from the canonical form (because the row was
  // ingested before the cleaners existed, or the LLM slipped through
  // an older prompt), normalize them in-place. The canonical_key
  // trigger fires on UPDATE OF scholarship_name/provider_name and
  // recomputes — so cleaning the name also re-collapses the dedup
  // key. Every verify pass heals more legacy rows.
  const cleanedStoredName = cleanScholarshipName(stored.scholarship_name);
  const cleanedStoredProvider = cleanProvider(stored.provider_name);
  const selfCleanUpdate: Record<string, unknown> = {};
  if (cleanedStoredName && cleanedStoredName !== stored.scholarship_name) {
    selfCleanUpdate.scholarship_name = cleanedStoredName;
  }
  if (cleanedStoredProvider && cleanedStoredProvider !== stored.provider_name) {
    selfCleanUpdate.provider_name = cleanedStoredProvider;
  }
  // Citizenship miscategorization — drop "Women" / "LGBTQ+" / etc when
  // they're the entire field, BUT first recover an implicit
  // target_demographics tag so we don't lose the eligibility signal.
  if (typeof stored.citizenship_requirements === "string") {
    const recovered = extractDemographicsFromCitizenship(stored.citizenship_requirements);
    const cleanedCitizenship = cleanCitizenshipRequirements(stored.citizenship_requirements);
    if (cleanedCitizenship !== stored.citizenship_requirements) {
      selfCleanUpdate.citizenship_requirements = cleanedCitizenship;
    }
    if (recovered) {
      const existing = Array.isArray((stored as any).target_demographics)
        ? (stored as any).target_demographics as string[]
        : [];
      const merged = Array.from(new Set([...existing, recovered]));
      // Only update if it's actually different (avoid touching updated_at
      // for no reason).
      if (merged.length !== existing.length || merged.some((t, i) => t !== existing[i])) {
        selfCleanUpdate.target_demographics = merged;
      }
    }
  }
  // Strip user-relative phrasing from already-stored soft fields.
  for (const f of ["why_this_fits", "how_to_win", "ideal_candidate_profile",
                   "what_to_prepare_first", "strategy_notes", "weak_candidate_warning"] as const) {
    const v = (stored as Record<string, unknown>)[f];
    if (typeof v === "string") {
      const cleaned = stripUserRelative(v);
      if (cleaned !== v) selfCleanUpdate[f] = cleaned;
    }
  }
  if (Object.keys(selfCleanUpdate).length > 0) {
    // 2026-05-18: error-check. A silently-failing self-clean (e.g. RLS
    // surprise, type coercion error on target_demographics array)
    // means user-relative phrasing keeps getting served to users
    // forever and the diff loop computes the same "name needs cleaning"
    // diff on every verify-cron tick — wasted LLM spend with no row
    // ever moving.
    const { error: selfCleanErr } = await supa.from("scholarships")
      .update(selfCleanUpdate as never)
      .eq("scholarship_id", stored.scholarship_id);
    if (selfCleanErr) {
      console.warn("[verify-scholarship] self-clean update failed", selfCleanErr.message, "id=", stored.scholarship_id);
    } else {
      // Reflect locally so downstream LLM prompt + diff comparison use
      // the cleaned values too — otherwise we'd compute a name diff on
      // every pass.
      if (typeof selfCleanUpdate.scholarship_name === "string") stored.scholarship_name = selfCleanUpdate.scholarship_name;
      if (typeof selfCleanUpdate.provider_name === "string") stored.provider_name = selfCleanUpdate.provider_name;
    }
  }

  // ─── Authoritative-source override ──────────────────────────────
  // For rows linked to a registered famous funder (provider_id matches
  // a row in provider_authoritative_facts), prefer the registry's
  // canonical_url over the row's source_url. Rationale: source_url is
  // wherever we first scraped the row from (often an aggregator, often
  // partial). canonical_url is the funder's own authoritative page —
  // verifying against it catches LLM hallucinations + aggregator drift
  // that the original source_url verification would miss.
  let authoritativeUrl: string | null = null;
  try {
    const { data: provLink } = await supa
      .from("scholarships")
      .select("provider_id")
      .eq("scholarship_id", stored.scholarship_id)
      .maybeSingle();
    const providerId = (provLink as { provider_id?: string } | null)?.provider_id ?? null;
    if (providerId) {
      const { data: paf } = await supa
        .from("provider_authoritative_facts")
        .select("canonical_url, providers!inner(provider_id)")
        .eq("providers.provider_id", providerId)
        .maybeSingle();
      if (paf && (paf as { canonical_url?: string }).canonical_url) {
        authoritativeUrl = (paf as { canonical_url: string }).canonical_url;
      }
    }
  } catch {
    // Soft-fail; we'll fall back to source_url below.
  }

  const targetUrl = authoritativeUrl || stored.source_url || stored.official_url;
  if (!targetUrl) {
    // Nothing to verify against — leave status alone but stamp last_verified_at
    // to push this row to the back of the queue for next cron pass.
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, { ok: true, status: "no_source_url", scholarship_id: stored.scholarship_id });
  }

  // ─── Fetch the source page ──────────────────────────────────────
  let pageMarkdown = "";
  try {
    const result = await firecrawlScrape({ url: targetUrl, onlyMainContent: true });
    pageMarkdown = result.markdown ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Source unreachable → mark broken but only after enough consecutive misses.
    // We let scholarship-url-health-cron own the consecutive-fails counter so
    // a single transient timeout doesn't break a row. Just stamp the attempt.
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, { ok: false, status: "fetch_failed", error: msg });
  }

  if (!pageMarkdown.trim() || pageMarkdown.length < 200) {
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, { ok: false, status: "page_too_thin", scholarship_id: stored.scholarship_id });
  }

  // ─── Re-extract via LLM ──────────────────────────────────────────
  let fresh: ExtractedFields | null = null;
  try {
    const resp = await chatCompletions({
      tier: "flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT(stored.scholarship_name, stored.provider_name, targetUrl, pageMarkdown.slice(0, MAX_MARKDOWN_CHARS)) },
      ],
      stream: false,
    });
    if (!resp.ok) throw new Error(`AI HTTP ${resp.status}`);
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content as string | undefined;
    if (!text) throw new Error("Empty completion");
    fresh = extractJson(text) as ExtractedFields;
    if (typeof fresh?.confidence !== "number") throw new Error("Missing confidence");
    // Defensive cleanup — same hygiene applied at scrape ingest. The
    // verify pass goes through the SAME LLM and is just as susceptible
    // to "Various", "Trustees of...", "Apply now" suffixes etc.
    if (fresh.scholarship_name) fresh.scholarship_name = cleanScholarshipName(fresh.scholarship_name);
    if (fresh.provider_name) fresh.provider_name = cleanProvider(fresh.provider_name) ?? undefined;
    if (fresh.host_country) fresh.host_country = cleanHostCountry(fresh.host_country) ?? undefined;
    // Country inference fallback — same logic as scrape-source. If the
    // re-extract left host_country empty but the program name is one
    // of the well-known patterns (Chevening, DAAD, Fulbright, etc.),
    // infer the country so the row stops rendering against the generic
    // "Multiple countries" globe. Stored.host_country may already have
    // a value from a previous extraction; we only fill `fresh` when it's
    // blank, so the diff-vs-stored path still detects real changes.
    if (!fresh.host_country) {
      const inferred = inferHostCountryFromNames(
        fresh.scholarship_name ?? stored.scholarship_name,
        fresh.provider_name ?? stored.provider_name,
      );
      if (inferred) fresh.host_country = inferred;
    }
    // Deadline-type override — same heuristic as scrape-source. The LLM
    // re-extract is just as prone to defaulting to "rolling" when the
    // page doesn't list a date. Force "annual" for known-annual programs
    // so re-verification doesn't regress a correctly-tagged row.
    if (fresh.deadline_type === null || fresh.deadline_type === "rolling" || fresh.deadline_type === "unknown" || fresh.deadline_type === undefined) {
      if (isKnownAnnualProgram(
        fresh.scholarship_name ?? stored.scholarship_name,
        fresh.provider_name ?? stored.provider_name,
      )) {
        fresh.deadline_type = "annual";
      }
    }
    // Annual roll-forward — if the LLM re-extracted an old date because
    // the program page hadn't refreshed for the new cycle yet, push it
    // to the next future occurrence. The diff path then sees the rolled-
    // forward date as the canonical fresh value, so a 2024-11-05 stored
    // row + 2025-11-05 LLM extract + 2026-current calendar collapses
    // into 2026-11-05 silently instead of staging a stale-vs-stale diff.
    if (
      typeof fresh.application_deadline === "string" &&
      (fresh.deadline_type === "annual" || fresh.deadline_type === undefined || fresh.deadline_type === null)
    ) {
      fresh.application_deadline = rollForwardAnnualDeadline(fresh.application_deadline);
    }
    // Financial floor — same fallback as scrape-source. If the
    // re-extract returned NULL/0 for estimated_total_value_usd but
    // we know the canonical figure for this program, write it back
    // so re-verifying a row doesn't blank out the value we previously
    // backfilled.
    if (fresh.estimated_total_value_usd == null || fresh.estimated_total_value_usd === 0) {
      const known = knownProgramValueUsd(
        fresh.scholarship_name ?? stored.scholarship_name,
        fresh.provider_name ?? stored.provider_name,
      );
      if (known) fresh.estimated_total_value_usd = known;
    }
    // Degree-level inference — same fallback as scrape-source.
    if (!Array.isArray(fresh.target_degree_level) || fresh.target_degree_level.length === 0) {
      const inferred = inferDegreeLevelsFromNames(
        fresh.scholarship_name ?? stored.scholarship_name,
        fresh.provider_name ?? stored.provider_name,
      );
      if (inferred.length > 0) fresh.target_degree_level = inferred;
    }
    if (fresh.award_amount_text) fresh.award_amount_text = cleanAwardText(fresh.award_amount_text);
    if (Array.isArray(fresh.target_fields)) {
      const cleaned = cleanTargetFields(fresh.target_fields);
      fresh.target_fields = cleaned.length > 0 ? cleaned : null;
    }
    if (Array.isArray(fresh.eligible_countries)) {
      const cleaned = cleanEligibleCountries(fresh.eligible_countries);
      fresh.eligible_countries = cleaned.length > 0 ? cleaned : null;
    }
    if (Array.isArray(fresh.target_demographics)) {
      const cleaned = cleanTargetDemographics(fresh.target_demographics);
      fresh.target_demographics = cleaned.length > 0 ? cleaned : null;
    }
  } catch (e) {
    console.warn("[verify-scholarship] re-extract failed", (e as Error).message);
    return json(200, { ok: false, status: "extract_failed", error: (e as Error).message });
  }

  if (fresh.confidence < MIN_CONFIDENCE_TO_TRUST) {
    // Page exists but the LLM isn't sure it still describes the same scholarship.
    // Don't overwrite anything; don't advance verification status. Stamp the
    // attempt so this row gets revisited later.
    await supa.from("scholarships")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("scholarship_id", stored.scholarship_id);
    return json(200, {
      ok: true,
      status: "low_confidence",
      confidence: fresh.confidence,
      scholarship_id: stored.scholarship_id,
    });
  }

  // ─── Opportunistic backfill of structured matching inputs ────────
  // For BACKFILL_NULL_FIELDS: NULL/empty stored value + non-empty fresh
  // value = silent additive backfill. These are the inputs the
  // eligibility predicate uses (eligible_countries / target_fields /
  // target_degree_level), and most legacy rows have them NULL even
  // though the scholarship's actual page lists them. Treating absence-
  // → presence as "no contradiction, just new info" lets the verify
  // cron progressively heal the catalog without admin work, while
  // never silently overwriting an existing value.
  const backfillUpdates: Record<string, unknown> = {};
  for (const f of BACKFILL_NULL_FIELDS) {
    const a = (stored as Record<string, unknown>)[f];
    const b = (fresh as unknown as Record<string, unknown>)[f];
    const storedEmpty = a === null || a === undefined || (Array.isArray(a) && a.length === 0);
    const freshNonEmpty = Array.isArray(b) && b.length > 0;
    if (storedEmpty && freshNonEmpty) backfillUpdates[f] = b;
  }
  // Prose fields — NULL or stub → substantive value is silently
  // applied. "Stub" = anything below PROSE_BACKFILL_MIN_LEN, since
  // those rows render as "funds X..." filler on Overview. We only
  // upgrade the shorter→longer direction; no overwrites of real
  // existing prose.
  for (const f of BACKFILL_NULL_PROSE_FIELDS) {
    const a = (stored as Record<string, unknown>)[f];
    const b = (fresh as unknown as Record<string, unknown>)[f];
    if (typeof b !== "string") continue;
    const trimmed = b.trim();
    if (trimmed.length < PROSE_BACKFILL_MIN_LEN) continue;
    const storedThin =
      a === null ||
      a === undefined ||
      (typeof a === "string" && a.trim().length < PROSE_BACKFILL_MIN_LEN);
    if (storedThin) backfillUpdates[f] = trimmed;
  }

  // Re-embed when any field that feeds the embedding's source_text
  // changes. eligible_countries doesn't flow into source_text so doesn't
  // trigger; eligibility_requirements does. Per the
  // scholarships_needing_embedding view, embedding IS NULL is sufficient
  // to enqueue.
  const embeddingFieldsBackfilled =
    "target_fields" in backfillUpdates ||
    "target_degree_level" in backfillUpdates ||
    "eligibility_requirements" in backfillUpdates;
  if (embeddingFieldsBackfilled) {
    backfillUpdates.embedding = null;
    backfillUpdates.embedded_at = null;
  }

  // ─── Compare stored vs. fresh ────────────────────────────────────
  const diffs = diffMaterial(stored, fresh);
  const now = new Date().toISOString();

  if (diffs.length === 0) {
    // No material changes — clean re-verify. Promote to 'verified',
    // bump the timestamp, AND apply any opportunistic backfill so the
    // additive learnings don't sit unused. 2026-05-18: error-check the
    // promote — silently failing here means the row stays at 'pending'
    // or 'stale' forever despite passing verification, blocking it from
    // surfacing in user-facing results.
    const { error: promoteErr } = await supa.from("scholarships")
      .update({
        verification_status: "verified",
        last_verified_at: now,
        verified: true,
        // Refresh confidence on every clean re-verify so the trust
        // calibration in match_scholarships sees the LLM's most-recent
        // read of how well-grounded this row is. Counts as a quality
        // update, not a material diff (no DIFF_FIELDS membership).
        confidence: fresh.confidence,
        ...backfillUpdates,
      })
      .eq("scholarship_id", stored.scholarship_id);
    if (promoteErr) {
      console.error("[verify-scholarship] verified-promote failed", promoteErr.message, "id=", stored.scholarship_id);
      return json(500, { error: `promote_failed: ${promoteErr.message}` });
    }

    // ─── Record evidence — re-verification keeps the source warm ───
    // Bumps last_confirmed_at on the scholarship_evidence row so the
    // consensus_score reflects continued source attestation. New URL?
    // It lands as a fresh evidence row, growing the source diversity.
    if (targetUrl) {
      try {
        const confirms: string[] = [];
        if (fresh.application_deadline) confirms.push("application_deadline");
        if (fresh.estimated_total_value_usd != null || fresh.award_amount_text) confirms.push("amount");
        if (fresh.eligible_countries?.length || fresh.citizenship_requirements) confirms.push("eligibility");
        if (fresh.target_degree_level?.length) confirms.push("degree");
        if (fresh.target_fields?.length) confirms.push("fields");
        await supa.rpc("record_scholarship_source", {
          p_scholarship_id: stored.scholarship_id,
          p_source_url: targetUrl,
          p_source_hint: undefined,
          p_confirms: confirms.length > 0 ? confirms : undefined,
          p_confidence: typeof fresh.confidence === "number" ? fresh.confidence : undefined,
        });
      } catch (e) {
        console.warn("[verify-scholarship] record_scholarship_source failed", (e as Error).message);
      }
    }

    return json(200, {
      ok: true,
      status: "verified_clean",
      scholarship_id: stored.scholarship_id,
      cost_estimate_usd: COST_ESTIMATE_USD,
      backfilled: Object.keys(backfillUpdates),
    });
  }

  // ─── Diffs found — stage for admin review, don't auto-overwrite ──
  // Land the fresh extraction in scholarships_staging with a needs_review
  // status so an admin can compare + accept. Don't promote verification_status
  // yet — keep at 'stale' so it shows up in the queue.
  // scholarships_staging.source_id/fingerprint are typed as required by the
  // generated schema; for self-heal stages there's no upstream source row,
  // so cast the row through `as never` to bypass the typed-insert check.
  // Runtime is fine — the columns are nullable in Postgres.
  // 2026-05-18: error-check the staging insert. Pre-fix a silent failure
  // here meant the diff was LOST (admin never sees it in the queue),
  // while the main row update below still marked status='stale' and
  // bumped confidence — leaving the user-facing row in a "you've been
  // verified-but-stale-with-no-pending-diff" zombie state.
  const { error: stagingErr } = await supa.from("scholarships_staging").insert({
    source_id: null,
    scholarship_id: stored.scholarship_id,
    fingerprint: null,
    raw_text: pageMarkdown.slice(0, 2000),
    parsed_data: fresh as unknown as Json,
    confidence: fresh.confidence,
    diff_summary: diffs.map(d => `${d.field}: ${JSON.stringify(d.was)} → ${JSON.stringify(d.now)}`).join("; "),
    status: "pending",
  } as never).select("staging_id").maybeSingle();
  if (stagingErr) {
    console.error("[verify-scholarship] staging insert failed", stagingErr.message, "id=", stored.scholarship_id);
    return json(500, { error: `staging_insert_failed: ${stagingErr.message}` });
  }

  const { error: staleUpdateErr } = await supa.from("scholarships")
    .update({
      verification_status: "stale",
      last_verified_at: now,
      // Refresh confidence on diff-staged path too — even when
      // material diffs are queued for admin review, the LLM's read
      // of "how grounded was this extraction" is independent and
      // should keep current.
      confidence: fresh.confidence,
      // Apply opportunistic backfill even when material diffs exist —
      // a row that has BOTH a deadline drift AND a previously-missing
      // eligible_countries should still get the additive backfill;
      // those are independent changes.
      ...backfillUpdates,
    })
    .eq("scholarship_id", stored.scholarship_id);
  if (staleUpdateErr) {
    console.error("[verify-scholarship] stale-update failed", staleUpdateErr.message, "id=", stored.scholarship_id);
    // Don't return 500 — the diff already landed in staging, which is the
    // important record for admin review. Mark this attempt and move on.
  }

  return json(200, {
    ok: true,
    status: "diffs_staged",
    scholarship_id: stored.scholarship_id,
    diff_count: diffs.length,
    diffs,
    cost_estimate_usd: COST_ESTIMATE_USD,
  });
});
