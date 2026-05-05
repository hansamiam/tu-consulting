/* Server-side mirror of src/lib/scholarshipFields.ts.
 *
 * Exists because Deno edge functions can't import from the Vite tree
 * (different module systems). Keep this file IN LOCKSTEP with
 * src/lib/scholarshipFields.ts — when one changes, change the other.
 *
 * Used by:
 *   · scrape-source — defensive cleanup at ingest, so LLM slip-ups never
 *     reach the DB (three-layer defense: SYSTEM_PROMPT → server clean →
 *     client clean).
 *   · og-scholarship — every share-card preview renders the cleaned name.
 *
 * Pure functions, no DOM, no React. */

const FIELD_JUNK = /^(any|all|open|various|n\/a|none|—|-|other|misc|miscellaneous)$/i;
const PROVIDER_JUNK = /^(various|multiple|several|n\/a|none|unknown|—|-|tbd|to be determined)/i;

export function cleanScholarshipName(name: string): string {
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
}

/** Returns null when the value is junk (Various / Multiple / TBD …) so
 *  the caller can drop the field rather than persist garbage. */
export function cleanProvider(raw: string | null | undefined): string | null {
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
}

/** Split comma-list run-ons inside a single entry, drop junk values,
 *  cap entry length. Returns [] if nothing survives the filter so the
 *  caller can OMIT the field rather than persist a junk array. */
export function cleanTargetFields(fields: unknown): string[] {
  if (!Array.isArray(fields)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of fields) {
    if (typeof raw !== "string") continue;
    const pieces = raw.split(/\s*[,/;]\s*/).filter(Boolean);
    for (const p of pieces) {
      const trimmed = p.trim();
      if (!trimmed || FIELD_JUNK.test(trimmed) || trimmed.length > 60) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

/** Normalize host_country to either a single value or exactly
 *  "Multiple countries". Drops "Various (…)" / "X / Multiple" patterns
 *  the SYSTEM_PROMPT forbids. */
export function cleanHostCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  // Multi-country shortcuts
  if (/^various\b/i.test(t)) return "Multiple countries";
  if (/^multiple/i.test(t)) return "Multiple countries";
  if (/\bmultiple\b/i.test(t) && /\//.test(t)) return "Multiple countries";
  // Strip parenthetical hints like "USA (and Canada)"
  const noParen = t.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return noParen || t;
}

/** Split comma-list run-ons inside a single eligible_countries entry,
 *  drop empties and known junk values, dedupe case-insensitively.
 *  Without this, an LLM that emitted ["Russia, Belarus, Ukraine"] as a
 *  single element would silently fail the server-side `= ANY()`
 *  eligibility check for any of the three countries. */
export function cleanEligibleCountries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const JUNK = /^(any|all|open|various|n\/a|none|—|-)$/i;
  for (const e of raw) {
    if (typeof e !== "string") continue;
    // Strip parentheticals like "Indonesia (primary)" → "Indonesia"
    const noParen = e.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const pieces = noParen.split(/\s*[,;/]\s+|\s+and\s+|\s+\&\s+/i).filter(Boolean);
    for (const p of pieces) {
      const trimmed = p.trim().replace(/^and\s+/i, "");
      if (!trimmed || JUNK.test(trimmed) || trimmed.length > 60) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out;
}

/** Strip user-relative phrasing from LLM-generated static text.
 *  The Discover/Detail pages are read by visitors from anywhere, but
 *  enrichment LLMs sometimes write copy that assumes the reader is a
 *  specific nationality ("without leaving the country", "back home",
 *  "students like you"). That reads broken to anyone outside the
 *  imagined audience.
 *
 *  Rather than reject the whole field (the rest of the sentence is
 *  often useful), we clip the offending clause and tidy the seam.
 *  Returns null if the cleaned result is too short to be useful.
 */
const USER_RELATIVE_PATTERNS: RegExp[] = [
  /\s*[—,;.]?\s*without leaving\s+(the|your)\s+country\b/gi,
  /\s*[—,;.]?\s*without (?:having to )?leaving home\b/gi,
  /\s*[—,;.]?\s*for students like you(rself)?\b/gi,
  /\s*[—,;.]?\s*for applicants like you(rself)?\b/gi,
  /\s*[—,;.]?\s*international students like yourself\b/gi,
  /\s*[—,;.]?\s*in your (?:situation|case|position)\b/gi,
  /\s*[—,;.]?\s*given your (?:background|profile|situation)\b/gi,
  /\s*[—,;.]?\s*applicants from your (?:region|country|background)\b/gi,
  /\s*[—,;.]?\s*from your home country\b/gi,
  /\s*[—,;.]?\s*back home\b/gi,
  /\s*[—,;.]?\s*coming from\s+\w+,\s+/gi,  // "coming from Kazakhstan, ..."
];
export function stripUserRelative(raw: string | null | undefined): string | null {
  if (!raw) return raw ?? null;
  let t = raw;
  for (const re of USER_RELATIVE_PATTERNS) t = t.replace(re, "");
  // Collapse double-punctuation and whitespace artefacts
  t = t.replace(/\s*([,;.])\s*\1+/g, "$1");
  t = t.replace(/\s{2,}/g, " ").trim();
  // Re-tidy sentence-ending punctuation
  t = t.replace(/\s+([.,;!?])/g, "$1");
  if (!t || t.length < 8) return null;
  return t;
}

/** Citizenship_requirements should describe COUNTRY/NATIONALITY eligibility
 *  only. The LLM occasionally puts gender-only or other-attribute-only
 *  values there ("Women", "Female applicants", "LGBTQ+", "First-generation",
 *  "Low-income"). These are real eligibility constraints but they belong on
 *  separate fields, not citizenship. Until we have those fields, refuse to
 *  persist the misclassification — null means "no citizenship constraint
 *  on file" which is more honest than mis-attributing a gender constraint
 *  as a country one. Returns the cleaned text or null to drop. */
const NON_CITIZENSHIP_ONLY = /^\s*(women|female applicants?|female\b|men|male applicants?|male\b|lgbtq[+]?|queer|trans|first-generation|first generation|low[- ]income|underrepresented|disabled|disability|indigenous|refugees?|displaced|veterans?)\s*\.?\s*$/i;
export function cleanCitizenshipRequirements(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (NON_CITIZENSHIP_ONLY.test(t)) return null;
  return t;
}

/** Trim award text to a single concise phrase under 80 chars; drop
 *  trailing parentheticals that don't contain numerical detail. */
export function cleanAwardText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let t = raw.trim();
  if (!t) return null;
  // If a trailing parenthetical has no digits, drop it.
  t = t.replace(/\s*\(([^)]*)\)\s*$/, (m, inner) => /\d/.test(inner) ? m : "").trim();
  if (t.length > 200) t = t.slice(0, 198).trimEnd() + "…";
  return t;
}
