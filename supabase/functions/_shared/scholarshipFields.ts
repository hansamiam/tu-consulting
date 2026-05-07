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

  // Strip trailing " <sep> <junk>" tails. Catches the LLM wedging a
  // country list / "Various (...)" / apply-cta after the real provider
  // ("Mastercard Foundation · Various (primarily Africa...)").
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
  p = p.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (PROVIDER_JUNK.test(p)) return null;
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
 *  values there. cleanCitizenshipRequirements null-ifies pure-category
 *  values; extractDemographicsFromCitizenship recovers the implied
 *  target_demographics tag so the data isn't lost. */
const NON_CITIZENSHIP_ONLY = /^\s*(women|female applicants?|female\b|men|male applicants?|male\b|lgbtq[+]?|queer|trans|first-generation|first generation|low[- ]income|underrepresented|disabled|disability|indigenous|refugees?|displaced|veterans?)\s*\.?\s*$/i;
export function cleanCitizenshipRequirements(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (NON_CITIZENSHIP_ONLY.test(t)) return null;
  return t;
}

/** Extract a canonical target_demographics tag from a misclassified
 *  citizenship_requirements value. Returns null when no recognised tag.
 *  Used by scrape-source / verify-scholarship to recover signals that
 *  cleanCitizenshipRequirements would otherwise silently drop. */
export function extractDemographicsFromCitizenship(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.toLowerCase().trim();
  if (/^(women|female( applicants?)?)\.?$/.test(t)) return "women";
  if (/^(men|male( applicants?)?)\.?$/.test(t)) return "men";
  if (/^(lgbtq[+]?|queer|trans)\.?$/.test(t)) return "lgbtq";
  if (/^(first-generation|first generation)\.?$/.test(t)) return "first-generation";
  if (/^low[- ]income\.?$/.test(t)) return "low-income";
  if (/^(refugees?|asylum seekers?)\.?$/.test(t)) return "refugee";
  if (/^displaced\.?$/.test(t)) return "displaced";
  if (/^indigenous\.?$/.test(t)) return "indigenous";
  if (/^(disabled|disability|deaf|blind)\.?$/.test(t)) return "disability";
  if (/^veterans?\.?$/.test(t)) return "military-veteran";
  if (/^underrepresented\.?$/.test(t)) return "underrepresented-minority";
  return null;
}

/** Validates an array of demographic tags against the canonical set.
 *  Returns only the recognised values. Used to coerce LLM output. */
const VALID_DEMOGRAPHICS = new Set([
  "women", "men", "lgbtq", "first-generation", "low-income", "refugee",
  "displaced", "indigenous", "underrepresented-stem", "underrepresented-minority",
  "disability", "military-veteran", "rural", "mature-student",
]);
export function cleanTargetDemographics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const aliasMap: Record<string, string> = {
    "lgbtq+": "lgbtq", "lgbt": "lgbtq",
    "first_generation": "first-generation", "firstgen": "first-generation", "first-gen": "first-generation",
    "low_income": "low-income", "lowincome": "low-income",
    "veteran": "military-veteran", "veterans": "military-veteran", "military": "military-veteran",
    "underrepresented": "underrepresented-minority", "minority": "underrepresented-minority", "minorities": "underrepresented-minority",
    "stem-women": "underrepresented-stem", "women-stem": "underrepresented-stem", "women-in-stem": "underrepresented-stem",
    "disabled": "disability", "deaf": "disability", "blind": "disability",
    "asylum": "refugee", "asylum-seeker": "refugee", "refugees": "refugee",
    "female": "women", "girls": "women",
    "male": "men", "boys": "men",
    "first-nations": "indigenous", "native-american": "indigenous", "aboriginal": "indigenous", "maori": "indigenous", "tribal": "indigenous",
    "rural-area": "rural", "rural-background": "rural",
    "mature": "mature-student", "adult-learner": "mature-student", "returning-student": "mature-student",
  };
  for (const e of raw) {
    if (typeof e !== "string") continue;
    const norm = e.toLowerCase().trim().replace(/\s+/g, "-");
    const final = aliasMap[norm] ?? norm;
    if (!VALID_DEMOGRAPHICS.has(final)) continue;
    if (seen.has(final)) continue;
    seen.add(final);
    out.push(final);
  }
  return out;
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

/* ─────────────────────────────────────────────────────────────────────────
 * Country inference from program / provider name
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The LLM extractor sometimes leaves host_country empty even when the
 * scholarship's name screams its country (Chevening = UK, DAAD = Germany,
 * Fulbright = US, MEXT = Japan, East-West Center = US/Hawaii). This
 * function pattern-matches the well-known program names + provider name
 * keywords to backfill a country when the LLM left it blank.
 *
 * Returned value is the canonical country name as it appears in
 * REGIONAL_ACCENT (countryAccent.ts) so the silhouette + palette resolve
 * correctly. Returns null if no high-confidence pattern matches — better
 * to leave host_country empty than to mis-attribute a row.
 *
 * Used by:
 *   · scrape-source: post-LLM fallback when extracted host_country is
 *     null or empty (defensive).
 *   · 20260507150000_backfill_host_country.sql: one-shot backfill of
 *     existing rows via the SQL mirror of these patterns.
 *
 * If you add a pattern here, add the same pattern to the SQL function
 * in the migration so backfill stays in sync. */

interface CountryPattern {
  /** Regex to match against `${name} | ${provider}`. Case-insensitive. */
  pattern: RegExp;
  /** Canonical host_country value to write. */
  country: string;
}

// Patterns ordered by specificity — most-specific first so e.g.
// "American University in Cairo" matches Egypt before the generic
// "American" → US fallback.
const COUNTRY_PATTERNS: CountryPattern[] = [
  // ─── Programs whose names are 1:1 with their host country ────────
  { pattern: /\bchevening\b/i,                          country: "United Kingdom" },
  { pattern: /\bgates cambridge\b/i,                    country: "United Kingdom" },
  { pattern: /\brhodes scholar/i,                       country: "United Kingdom" },
  { pattern: /\bclarendon\b/i,                          country: "United Kingdom" },
  { pattern: /\bweidenfeld[\-\s]?hoffmann/i,            country: "United Kingdom" },
  { pattern: /\bcommonwealth scholarship/i,             country: "United Kingdom" },
  { pattern: /\bmarshall scholar/i,                     country: "United Kingdom" },
  { pattern: /\boxford\b|\bcambridge\b/i,               country: "United Kingdom" }, // generic university
  { pattern: /\bbritish\s+council\b/i,                  country: "United Kingdom" },
  { pattern: /\bcambridge trust\b/i,                    country: "United Kingdom" },

  { pattern: /\bdaad\b|\bdeutscher? akademisch/i,       country: "Germany" },
  { pattern: /\bheinrich b[oö]ll\b/i,                   country: "Germany" },
  { pattern: /\bkonrad[\-\s]?adenauer\b/i,              country: "Germany" },
  { pattern: /\bfriedrich[\-\s]?ebert\b/i,              country: "Germany" },
  { pattern: /\brosa luxemburg\b/i,                     country: "Germany" },
  { pattern: /\bhans[\-\s]?b[oö]ckler\b/i,              country: "Germany" },
  { pattern: /\bhumboldt\b.*scholar|stipend|fellow/i,   country: "Germany" },
  { pattern: /\bdeutschlandstipendium\b/i,              country: "Germany" },

  { pattern: /\bfulbright\b/i,                          country: "United States" },
  { pattern: /\beast[\-\s]?west center\b/i,             country: "United States" },
  { pattern: /\bknight[\-\s]?hennessy\b/i,              country: "United States" },
  { pattern: /\bp\.?d\.?soros\b|\bpaul.{0,4}daisy soros\b/i, country: "United States" },
  { pattern: /\bjack kent cooke\b/i,                    country: "United States" },
  { pattern: /\bgates millennium\b/i,                   country: "United States" },
  { pattern: /\bcoca[\-\s]?cola scholar/i,              country: "United States" },
  { pattern: /\bhispanic scholarship fund\b/i,          country: "United States" },
  { pattern: /\b(harvard|yale|princeton|stanford|mit|columbia|cornell|dartmouth|brown|penn|nyu|ucla|berkeley|chicago|northwestern|duke)\b/i,
                                                        country: "United States" },

  { pattern: /\beiffel\s+excellence\b|\beiffel\s+scholar/i,   country: "France" },
  { pattern: /\bcampus\s?france\b/i,                    country: "France" },
  { pattern: /\bsorbonne\b|\bpsl\b|\bsciences\s+po\b/i, country: "France" },

  { pattern: /\bmext\b|\bmonbukagakusho\b/i,            country: "Japan" },
  { pattern: /\bjasso\b/i,                              country: "Japan" },
  { pattern: /\b(tokyo|kyoto|osaka|waseda|keio)\s+university\b/i, country: "Japan" },

  { pattern: /\bschwarzman\s+scholar/i,                 country: "China" },
  { pattern: /\byenching\s+(academy|scholar)\b/i,       country: "China" },
  { pattern: /\b(tsinghua|peking|fudan|shanghai jiao tong)\b/i, country: "China" },
  { pattern: /\b(chinese|china)\s+government\s+scholarship\b/i, country: "China" },

  { pattern: /\bkgsp\b|\bkorean? government scholarship\b|\bglobal korea scholarship\b/i, country: "South Korea" },
  { pattern: /\b(seoul national|kaist|postech|yonsei)\b/i, country: "South Korea" },

  { pattern: /\bvanier\s+canada\b|\bvanier\s+scholar/i, country: "Canada" },
  { pattern: /\btrudeau\s+(scholar|foundation)\b/i,     country: "Canada" },
  { pattern: /\b(university of toronto|mcgill|ubc|waterloo)\b/i, country: "Canada" },

  { pattern: /\baustralia\s+awards?\b|\bdfat\b.*scholar/i, country: "Australia" },
  { pattern: /\b(university of melbourne|sydney|anu|monash|unsw|uq\b|queensland)\b/i, country: "Australia" },

  { pattern: /\b(swiss\s+government|eth\s+z[uü]rich|epfl)\b/i, country: "Switzerland" },
  { pattern: /\bswedish\s+institute\b/i,                country: "Sweden" },
  { pattern: /\borange\s+knowledge\b|\bholland\s+scholar/i, country: "Netherlands" },
  { pattern: /\b(asean|nus\b|ntu\b|smu)\s+(scholar|fellow)/i, country: "Singapore" },
  { pattern: /\b(singapore international|nus|smu)\b/i,  country: "Singapore" },

  { pattern: /\bnew zealand\s+(government|aid|scholar)/i, country: "New Zealand" },
  { pattern: /\b(university of auckland|otago|victoria university of wellington)\b/i, country: "New Zealand" },

  { pattern: /\bfapesp\b|\bcapes\b|\bcnpq\b/i,          country: "Brazil" },

  { pattern: /\bkhazanah\b/i,                           country: "Malaysia" },
  { pattern: /\b(national university of singapore|nanyang technological)\b/i, country: "Singapore" },

  // ─── Multi-country / EU programs — explicit Multiple ────────────
  { pattern: /\berasmus\s+mundus\b/i,                   country: "Multiple countries" },
  { pattern: /\baga\s+khan\s+(foundation|development)/i, country: "Multiple countries" },
  { pattern: /\brotary\s+peace\s+(fellow|scholar)/i,    country: "Multiple countries" },
  { pattern: /\bmastercard\s+foundation\s+scholar/i,    country: "Multiple countries" },

  // ─── Generic provider keywords (lowest specificity, last) ────────
  // These fire when the more-specific named-program patterns above
  // didn't match. Catches e.g. "Government of Ireland Postgraduate
  // Scholarship Programme" without a named-program brand.
  { pattern: /\b(government of |republic of )?ireland\b/i,    country: "Ireland" },
  { pattern: /\b(government of |united states of )?(america|usa)\b/i, country: "United States" },
];

/** Infer host_country from the scholarship + provider name when the LLM
 *  left it empty. Returns null if no high-confidence pattern matches. */
export function inferHostCountryFromNames(
  scholarshipName: string | null | undefined,
  providerName: string | null | undefined,
): string | null {
  const haystack = `${scholarshipName ?? ""} | ${providerName ?? ""}`.trim();
  if (haystack.length < 4) return null;
  for (const { pattern, country } of COUNTRY_PATTERNS) {
    if (pattern.test(haystack)) return country;
  }
  return null;
}
