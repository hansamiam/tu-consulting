// Named scholarship chips for the TopUni AI wizard Step 3.
//
// "Any scholarships already on your radar?" — optional chip multi-select.
// Picking surfaces user awareness; the brief generator leads with what
// the student already knows rather than introducing every program from
// scratch. Per the 2026-05-27 competitor audit, no consulting platform
// (Crimson / Empowerly / ApplyBoard / AdmitYogi / Polygence) asks this
// question at intake — Top Uni's positioning play.
//
// Chip set sourced from scholarships table where is_featured=true AND
// the name is a recognised international program for CIS-region
// applicants. Keep the list short (≤10) to avoid a wall-of-chips moment.
// Order: KZ-grown first (Bolashak as anchor), then alphabetic by program.

export interface KnownScholarshipEntry {
  /** Stable token persisted to localStorage + sent to the brief generator.
   *  Matches the canonical scholarship_name as close as possible so a
   *  later JOIN against scholarships.scholarship_name works exactly. */
  token: string;
  en: string;
  ru: string;
  /** Flag emoji for the host country — keeps the chip row readable when
   *  multiple programs share a country. */
  flag: string;
}

export const KNOWN_SCHOLARSHIP_CHIPS: KnownScholarshipEntry[] = [
  { token: "Bolashak International Scholarship", en: "Bolashak", ru: "Болашак", flag: "🇰🇿" },
  { token: "Chevening Scholarships",             en: "Chevening", ru: "Chevening", flag: "🇬🇧" },
  { token: "Eiffel Excellence Scholarship Program", en: "Eiffel Excellence", ru: "Eiffel Excellence", flag: "🇫🇷" },
  { token: "Fulbright Foreign Student Program",  en: "Fulbright", ru: "Fulbright", flag: "🇺🇸" },
  { token: "Gates Cambridge Scholarships",       en: "Gates Cambridge", ru: "Gates Cambridge", flag: "🇬🇧" },
  { token: "Knight-Hennessy Scholars",           en: "Knight-Hennessy", ru: "Knight-Hennessy", flag: "🇺🇸" },
  { token: "Schwarzman Scholars",                en: "Schwarzman", ru: "Schwarzman", flag: "🇨🇳" },
  { token: "Stipendium Hungaricum",              en: "Stipendium Hungaricum", ru: "Stipendium Hungaricum", flag: "🇭🇺" },
  { token: "Turkiye Burslari",                   en: "Türkiye Bursları", ru: "Türkiye Bursları", flag: "🇹🇷" },
];

const TOKEN_INDEX = new Map(KNOWN_SCHOLARSHIP_CHIPS.map((c) => [c.token, c]));

export function knownScholarshipLabel(token: string, language: "en" | "ru"): string {
  const entry = TOKEN_INDEX.get(token);
  if (!entry) return token;
  return language === "ru" ? entry.ru : entry.en;
}
