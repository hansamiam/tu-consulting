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

export const FIELD_JUNK = /^(any|all|open|various|n\/a|none|—|-|other|misc|miscellaneous)$/i;
const FIELD_ACRONYMS = /^(IT|AI|ML|CS|MBA|PhD|STEM|UX|UI|HR|R&D|GIS|IoT|VR|AR)$/i;
const FIELD_CONNECTORS = /^(of|and|the|in|for|to|with|on|at|a|an)$/i;

export const titleCaseField = (s: string) => s
  .replace(/\w\S*/g, (w) => {
    if (FIELD_ACRONYMS.test(w)) return w.toUpperCase();
    if (FIELD_CONNECTORS.test(w)) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  })
  .replace(/^./, (c) => c.toUpperCase());

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
  for (const sep of [" | ", "|", " — ", " – ", " - "]) {
    const idx = p.indexOf(sep);
    if (idx > 8 && idx < p.length - 4) {
      const right = p.slice(idx + sep.length).trim().toLowerCase();
      if (/(apply|home|bulletin|sign up|admissions|website|official|2025|2026|2027)/.test(right)) {
        p = p.slice(0, idx).trim();
        break;
      }
    }
  }
  p = p.replace(/\s*\([^)]*\)\s*$/, "").trim();
  p = p.replace(/^(The\s+)?(Trustees|Board|Council|Office)\s+of\s+(the\s+)?/i, "");
  if (p.length > 60) p = p.slice(0, 58).trimEnd() + "…";
  return p;
};

/* ─── Award helpers ──────────────────────────────────────────────── */

interface AwardSource {
  coverage_type: string | null;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
}

/** Compact award label for the grid card. Returns a tight label that
 *  always fits without truncation: "Full ride" / "$80K" / "Tuition
 *  covered" / etc. Long award_amount_text bodies live in the detail
 *  surface, not the card chip. */
export const compactAward = (s: AwardSource): string | null => {
  if (s.coverage_type === "full_ride") return "Full ride";
  if (s.award_amount_text) {
    const m = s.award_amount_text.match(/\$\s?([\d,.]+)\s?([KMkm])?/);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) {
        const suffix = m[2]?.toUpperCase();
        if (suffix === "M" || n >= 1_000_000) return `$${(suffix === "M" ? n : n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
        if (suffix === "K" || n >= 1000) return `$${Math.round(suffix === "K" ? n : n / 1000)}K`;
        return `$${Math.round(n).toLocaleString()}`;
      }
    }
  }
  if (s.coverage_type === "tuition_only") return "Tuition covered";
  if (s.coverage_type === "stipend") return "Stipend";
  if (s.coverage_type === "partial") return "Partial funding";
  if (s.estimated_total_value_usd && s.estimated_total_value_usd >= 1000) {
    const v = s.estimated_total_value_usd;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    return `$${Math.round(v / 1000)}K`;
  }
  if (s.award_amount_text) {
    const noParen = s.award_amount_text.replace(/\s*\([^)]*\)?/g, "").trim();
    if (noParen.length > 0 && noParen.length <= 28) return noParen;
    if (noParen.length > 28) return noParen.slice(0, 26).trimEnd() + "…";
  }
  return null;
};
