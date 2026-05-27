/* Shared display-side cleanup helpers for noisy LLM-extracted
 * scholarship fields. Used across Discover, ScholarshipDetail,
 * SharedBrief, and any future surface that renders scholarship rows.
 *
 * The scrape pipeline's prompt (supabase/functions/scrape-source) was
 * sharpened to produce cleaner data going forward, but legacy rows
 * still carry noise — site branding in titles, "Trustees of …" formal
 * provider names, comma-list fields, junk patterns ("Various",
 * "Multiple"). These helpers normalise on render so the UI stays
 * clean regardless of upstream quality.
 *
 * Pure functions, no React, no DOM. Safe to use in edge functions
 * (e.g. og-scholarship preview cards) too. */

/* ─── Field-of-study helpers ─────────────────────────────────────── */

/* FIELD_JUNK — values that are "no field info" rather than a real field.
 * Catches both bare junk ("any", "—") and the "all fields / all subjects /
 * open to all" cohort that conveys nothing to the user. When this matches,
 * the card omits the field chip entirely rather than showing "All Fields"
 * as the most prominent meta after the deadline. */
export const FIELD_JUNK = /^(any|all|open|various|n\/a|none|—|-|other|misc|miscellaneous|all\s*fields?|all\s*subjects?|all\s*disciplines?|open\s+to\s+all(\s+fields?)?|multiple)$/i;
const FIELD_ACRONYMS = /^(IT|AI|ML|CS|MBA|PhD|STEM|UX|UI|HR|R&D|GIS|IoT|VR|AR)$/i;
const FIELD_CONNECTORS = /^(of|and|the|in|for|to|with|on|at|a|an)$/i;

export const titleCaseField = (s: string) => s
  .replace(/\w\S*/g, (w) => {
    if (FIELD_ACRONYMS.test(w)) return w.toUpperCase();
    if (FIELD_CONNECTORS.test(w)) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  })
  .replace(/^./, (c) => c.toUpperCase());

/* Degree-level display map. The DB stores compact lowercase tokens
 * ("phd", "master", "undergraduate"); rendering them raw in chips
 * looks unfinished. Used wherever target_degree_level renders. */
const DEGREE_LABELS: Record<string, string> = {
  phd: "PhD",
  doctorate: "Doctorate",
  postdoc: "Postdoc",
  master: "Master's",
  masters: "Master's",
  "master's": "Master's",
  graduate: "Graduate",
  bachelor: "Bachelor's",
  bachelors: "Bachelor's",
  "bachelor's": "Bachelor's",
  undergraduate: "Undergraduate",
  diploma: "Diploma",
  certificate: "Certificate",
  non_degree: "Non-degree",
  "non-degree": "Non-degree",
};
export const humanizeDegreeLabel = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const k = raw.toLowerCase().trim();
  if (DEGREE_LABELS[k]) return DEGREE_LABELS[k];
  // Fall back to title-case for unrecognised tokens.
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

/* General-purpose label humanizer for snake_case / kebab-case enum
 * values. Pure: no domain mapping, just whitespace + casing. */
const HUMANIZE_STOP = new Set(["and", "or", "of", "the", "in", "for", "to"]);
const humanizeLabel = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().split(" ")
    .map((w, i) => i > 0 && HUMANIZE_STOP.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

/* Demographic tag display. Each canonical tag has a curated label (to
 * keep the UI consistent) and a short helper for accessibility. */
const DEMOGRAPHIC_LABEL: Record<string, string> = {
  "women": "Women",
  "men": "Men",
  "lgbtq": "LGBTQ+",
  // "first-gen" removed 2026-05-27: tag was conflating Top Uni's CIS
  // audience (parents often college-educated; the wizard's "first in
  // family to apply abroad" is about going-abroad-first, not first-gen
  // college). Sam called this out as inaccurate.
  "low-income": "Need-based",
  "refugee": "Refugees",
  "displaced": "Displaced",
  "indigenous": "Indigenous",
  "underrepresented-stem": "Women in STEM",
  "underrepresented-minority": "Underrepresented",
  "disability": "Disability",
  "military-veteran": "Veterans",
  "rural": "Rural",
  "mature-student": "Mature students",
};
export const humanizeDemographic = (tag: string): string =>
  DEMOGRAPHIC_LABEL[tag] ?? humanizeLabel(tag);

/** Pretty single-field label for compact card displays. Skips junk
 *  values, takes the first piece of comma-list run-ons, and drops
 *  unreasonably long entries. Returns null when nothing's worth
 *  showing so callers can hide the chip. */
export const displayField = (fields: string[] | null | undefined): string | null => {
  if (!Array.isArray(fields) || fields.length === 0) return null;
  for (const raw of fields) {
    if (!raw) continue;
    const first = raw.split(/\s*[,/;]\s*/).filter(Boolean)[0];
    if (!first) continue;
    const trimmed = first.trim();
    if (!trimmed || FIELD_JUNK.test(trimmed) || trimmed.length > 42) continue;
    return titleCaseField(trimmed.replace(/[-_]+/g, " ").replace(/\s+/g, " "));
  }
  return null;
};

/* ─── Scholarship name helpers ───────────────────────────────────── */

/** Strip site-branding suffixes from a noisy LLM-extracted page title.
 *  "Schwarzman Scholars | Tsinghua University - Apply Now" → "Schwarzman Scholars".
 *  Real continuations like "Erasmus Mundus - Joint Master's" stay intact. */
export const cleanScholarshipName = (name: string): string => {
  if (!name) return name;
  let n = name.trim();
  for (const sep of [" | ", "|", " — ", " – ", " - "]) {
    const idx = n.indexOf(sep);
    if (idx > 8 && idx < n.length - 4) {
      const right = n.slice(idx + sep.length).trim().toLowerCase();
      if (/(apply|home|bulletin|sign up|details|study in|admissions|undergraduate|graduate|university|website|official site|2025|2026|2027)/.test(right)) {
        n = n.slice(0, idx).trim();
        break;
      }
    }
  }
  n = n.replace(/\s*\((apply|bulletin|home|details|website|official|sign\s*up).*$/i, "").trim();
  n = n.replace(/\s+[-–—]?\s+(apply\s*now|apply|sign\s*up|details|home|bulletin)\s*$/i, "").trim();
  return n;
};

/* ─── Provider name helpers ──────────────────────────────────────── */

const PROVIDER_JUNK = /^(various|multiple|several|n\/a|none|unknown|—|-|tbd|to be determined)/i;

/** Clean a provider name for compact display. Returns null for junk
 *  patterns so callers can hide the line entirely. */
export const cleanProvider = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  let p = raw.trim();
  if (!p || PROVIDER_JUNK.test(p)) return null;

  // Strip ANY trailing " <sep> <junk>" tail. Real cases that this
  // catches: "Mastercard Foundation · Various (primarily Africa...)",
  // "DAAD | Apply now", "Schwarzman Scholars — Bulletin 2026". We
  // walk the seps in order of strength so " · " is handled even when
  // the legitimate provider also contains a hyphen.
  for (const sep of [" · ", " | ", "|", " — ", " – ", " - "]) {
    const idx = p.indexOf(sep);
    if (idx > 8 && idx < p.length - 1) {
      const rightRaw = p.slice(idx + sep.length).trim();
      const right = rightRaw.toLowerCase();
      const isJunk =
        PROVIDER_JUNK.test(rightRaw) ||
        /^(various|multiple|several)\b/i.test(rightRaw) ||
        /(apply|home|bulletin|sign up|admissions|website|official|primarily|includes|institutions in|across|throughout|countries|countries\.|\b\d{4}\b)/.test(right);
      if (isJunk) {
        p = p.slice(0, idx).trim();
        break;
      }
    }
  }

  // Strip trailing parentheticals — they're almost always location
  // lists, "(apply now)", or commentary that doesn't belong in the
  // provider name proper.
  p = p.replace(/\s*\([^)]*\)\s*$/, "").trim();

  // Strip ", funded by ..." / ", administered by ..." / ", in partnership with ..."
  // descriptive tails. Frequent in aggregator data — they bleed the
  // funder description into provider_name and produce truncated text
  // like "Commonwealth Scholarship Commission in the UK (CSC), funde…".
  p = p.replace(/,\s*(funded|administered|run|operated|managed|sponsored|supported|hosted)\s+by\b.*$/i, "").trim();
  p = p.replace(/\s+(funded|administered|run|operated|managed|sponsored)\s+by\s+the\s+.*$/i, "").trim();
  p = p.replace(/\s+in\s+partnership\s+with\b.*$/i, "").trim();
  p = p.replace(/\s+together\s+with\b.*$/i, "").trim();

  // Strip "in the UK" / "in the United Kingdom" / "in <Country>" tails —
  // host country shows alongside the provider name in card headers, so
  // duplicating "in the UK" inside the provider line is noise.
  p = p.replace(/\s+in\s+the\s+(uk|united\s+kingdom|usa|united\s+states|us|eu|european\s+union)\s*$/i, "").trim();

  // Drop the trailing " (CSC)" / " (DAAD)" parenthetical-acronym tails
  // that survive earlier cleaning when no separator was present.
  p = p.replace(/\s*\([A-Z]{2,8}\)\s*$/, "").trim();

  // After tail-stripping, re-check the junk gate. "Mastercard Foundation"
  // alone is fine, but if all that survived is "Various" or similar
  // we should null the whole thing.
  if (PROVIDER_JUNK.test(p)) return null;

  p = p.replace(/^(The\s+)?(Trustees|Board|Council|Office)\s+of\s+(the\s+)?/i, "");

  // Soft length cap — push to 80 chars so legitimate longer names
  // ("U.S. Department of State Bureau of Educational and Cultural
  // Affairs") survive. CSS line-clamp-2 in callers handles wrap.
  if (p.length > 80) p = p.slice(0, 78).trimEnd() + "…";
  return p;
};

/* User-relative content cleanup + citizenship_requirements gating live
 * on the server side now (supabase/functions/_shared/scholarshipFields.ts) —
 * applied at scrape/verify time so the DB is clean. The client-side
 * copies of stripUserRelative + cleanCitizenshipRequirements were
 * removed in round 43 since nothing in src/ called them anymore. */

/* ─── Award helpers ──────────────────────────────────────────────── */

interface AwardSource {
  coverage_type: string | null;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
}

/** Reality bound for a single-recipient scholarship's lifetime value.
 *  Even Schwarzman / Knight-Hennessy / MIT-tier full rides top out at
 *  ~$400K-$600K over 2-4 years. Anything north of $2M is the LLM
 *  picking up the program's endowment, total budget, or aggregate
 *  funding — not the per-recipient award. We refuse to display those
 *  numbers. The display falls back to the coverage label, which is
 *  almost always meaningful and never misleading. */
const REASONABLE_AWARD_USD = 2_000_000;

/** Compact award label for the grid card. Returns a tight label that
 *  always fits without truncation: "Full ride" / "$80K" / "Tuition
 *  covered" / etc. Long award_amount_text bodies live in the detail
 *  surface, not the card chip. */
export const compactAward = (s: AwardSource): string | null => {
  // The migration's CHECK constraint allows several legacy aliases
  // alongside the canonical 4 values: full_tuition (alias of full_ride
  // for tuition+living), stipend_only (alias of stipend), unknown.
  // Older rows may carry the aliases so handle them explicitly
  // instead of letting them fall through to a null label.
  const cov = s.coverage_type;
  // "Full ride" label retired 2026-05-27 (user direction: "completely
  // get rid of every single one because of edge cases"). For full_ride
  // / full_tuition rows we now fall through to the $-figure / award
  // text; if neither exists we return null and the chip silently drops.
  // coverage_type stays in DB and still drives ranking + filters.
  if (s.award_amount_text) {
    const m = s.award_amount_text.match(/\$\s?([\d,.]+)\s?([KMkm])?/);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) {
        const suffix = m[2]?.toUpperCase();
        const usd = suffix === "M" ? n * 1_000_000
                  : suffix === "K" ? n * 1000
                  : n;
        // Skip suspiciously large dollar references — the LLM has
        // mistaken an endowment / total fund / aggregate budget for the
        // per-recipient award. Fall through to the coverage label.
        if (usd <= REASONABLE_AWARD_USD) {
          if (suffix === "M" || n >= 1_000_000) return `$${(suffix === "M" ? n : n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
          if (suffix === "K" || n >= 1000) return `$${Math.round(suffix === "K" ? n : n / 1000)}K`;
          return `$${Math.round(n).toLocaleString()}`;
        }
      }
    }
  }
  if (cov === "tuition_only") return "Tuition covered";
  if (cov === "stipend" || cov === "stipend_only") return "Stipend";
  if (cov === "partial") return "Partial funding";
  if (s.estimated_total_value_usd && s.estimated_total_value_usd >= 1000 && s.estimated_total_value_usd <= REASONABLE_AWARD_USD) {
    const v = s.estimated_total_value_usd;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    return `$${Math.round(v / 1000)}K`;
  }
  if (s.award_amount_text) {
    // Strip absurd $XXM/$XXXM references from the trailing fallback
    // text so we don't display "$80M scholarship fund" verbatim.
    const sanitized = s.award_amount_text.replace(/\$\s?\d+\s?[Mm]\b/g, "").replace(/\s+/g, " ").trim();
    const noParen = sanitized.replace(/\s*\([^)]*\)?/g, "").trim();
    if (noParen.length > 0 && noParen.length <= 28) return noParen;
    if (noParen.length > 28) return noParen.slice(0, 26).trimEnd() + "…";
  }
  return null;
};
