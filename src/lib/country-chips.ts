// Country chip data for the TopUni AI wizard Step 3.
//
// 11 default chips + "Other" render on Step 3. "Other" opens a typeahead
// modal backed by COUNTRY_MASTER. The default set is intentionally wider
// than the Anglo-elite track (UK/US/Canada) — Hungary, Türkiye, China
// teach the user that Top Uni serves a broader world than Crimson does.
// Per project_topuni_positioning_anti_crimson memory.
//
// 2026-05-25: added a `flag` field (regional-indicator emoji) so the
// chip row renders a tiny flag next to the label. Pure visual; the
// label still reads after the emoji on systems without emoji support.

export interface CountryEntry {
  /** Stable English token persisted to localStorage + sent to the brief
   *  generator. Never localized — the UI label maps via the en/ru fields. */
  token: string;
  en: string;
  ru: string;
  /** Emoji flag rendered next to the label. */
  flag: string;
}

/** Token of the synthetic "Other" chip that opens the typeahead. */
export const OTHER_TOKEN = "__other__";

/** Default 11 chips that render on Step 3 (plus an "Other" chip
 *  appended in the wizard JSX so the typeahead trigger is part of the
 *  chip row). Order is curated: aspirational + accessible mixed. */
export const COUNTRY_DEFAULT_CHIPS: string[] = [
  // 2026-05-30 default-chip audit — swapped 3 chips per Samuel:
  //   Netherlands → Czech Republic (closer to Top Uni's CIS / budget-EU
  //     positioning; Netherlands skewed Anglo-aspirational)
  //   Australia   → Japan          (real far-east aspirational track
  //     with strong scholarship infra)
  //   Singapore   → Poland         (regional cousin of Hungary; cheap
  //     EU degree path most students don't know about)
  "USA",
  "UK",
  "Canada",
  "Germany",
  "Czech Republic",
  "South Korea",
  "Poland",
  "Hungary",
  "Türkiye",
  "Japan",
  "China",
];

/** Master list backing the typeahead. Includes every default + 19 more
 *  for the long tail. Adding entries here makes them searchable without
 *  changing the default chip row. */
export const COUNTRY_MASTER: CountryEntry[] = [
  { token: "USA",             en: "USA",             ru: "США",            flag: "🇺🇸" },
  { token: "UK",              en: "UK",              ru: "Великобритания", flag: "🇬🇧" },
  { token: "Canada",          en: "Canada",          ru: "Канада",         flag: "🇨🇦" },
  { token: "Germany",         en: "Germany",         ru: "Германия",       flag: "🇩🇪" },
  { token: "Netherlands",     en: "Netherlands",     ru: "Нидерланды",     flag: "🇳🇱" },
  { token: "South Korea",     en: "South Korea",     ru: "Южная Корея",    flag: "🇰🇷" },
  { token: "Singapore",       en: "Singapore",       ru: "Сингапур",       flag: "🇸🇬" },
  { token: "Hungary",         en: "Hungary",         ru: "Венгрия",        flag: "🇭🇺" },
  { token: "Türkiye",         en: "Türkiye",         ru: "Турция",         flag: "🇹🇷" },
  { token: "Australia",       en: "Australia",       ru: "Австралия",      flag: "🇦🇺" },
  { token: "China",           en: "China",           ru: "Китай",          flag: "🇨🇳" },
  { token: "Japan",           en: "Japan",           ru: "Япония",         flag: "🇯🇵" },
  { token: "Malaysia",        en: "Malaysia",        ru: "Малайзия",       flag: "🇲🇾" },
  { token: "Czech Republic",  en: "Czech Republic",  ru: "Чехия",          flag: "🇨🇿" },
  { token: "Poland",          en: "Poland",          ru: "Польша",         flag: "🇵🇱" },
  { token: "Italy",           en: "Italy",           ru: "Италия",         flag: "🇮🇹" },
  { token: "France",          en: "France",          ru: "Франция",        flag: "🇫🇷" },
  { token: "Spain",           en: "Spain",           ru: "Испания",        flag: "🇪🇸" },
  { token: "Ireland",         en: "Ireland",         ru: "Ирландия",       flag: "🇮🇪" },
  { token: "New Zealand",     en: "New Zealand",     ru: "Новая Зеландия", flag: "🇳🇿" },
  { token: "Hong Kong",       en: "Hong Kong",       ru: "Гонконг",        flag: "🇭🇰" },
  { token: "Sweden",          en: "Sweden",          ru: "Швеция",         flag: "🇸🇪" },
  { token: "Finland",         en: "Finland",         ru: "Финляндия",      flag: "🇫🇮" },
  { token: "Denmark",         en: "Denmark",         ru: "Дания",          flag: "🇩🇰" },
  { token: "Norway",          en: "Norway",          ru: "Норвегия",       flag: "🇳🇴" },
  { token: "UAE",             en: "UAE",             ru: "ОАЭ",            flag: "🇦🇪" },
  { token: "Russia",          en: "Russia",          ru: "Россия",         flag: "🇷🇺" },
  { token: "Switzerland",     en: "Switzerland",     ru: "Швейцария",      flag: "🇨🇭" },
  { token: "Belgium",         en: "Belgium",         ru: "Бельгия",        flag: "🇧🇪" },
  { token: "Austria",         en: "Austria",         ru: "Австрия",        flag: "🇦🇹" },
  { token: "Estonia",         en: "Estonia",         ru: "Эстония",        flag: "🇪🇪" },
  { token: "India",           en: "India",           ru: "Индия",          flag: "🇮🇳" },
  { token: "South Africa",    en: "South Africa",    ru: "ЮАР",            flag: "🇿🇦" },
  { token: "Brazil",          en: "Brazil",          ru: "Бразилия",       flag: "🇧🇷" },
];

const TOKEN_INDEX: Map<string, CountryEntry> = new Map(
  COUNTRY_MASTER.map((c) => [c.token, c]),
);

/** Resolve the localized display label for a token. Returns the raw
 *  token when no entry exists — protects against legacy/unknown drafts. */
export function countryLabel(token: string, language: "en" | "ru"): string {
  const entry = TOKEN_INDEX.get(token);
  if (!entry) return token;
  return language === "ru" ? entry.ru : entry.en;
}

/** Emoji flag for a token. Empty string when unknown. */
export function countryFlag(token: string): string {
  return TOKEN_INDEX.get(token)?.flag ?? "";
}

/** Cap enforced by the chip row + typeahead. Matches the brief-plan
 *  countryBuckets slice (top 3 → primary buckets). */
export const COUNTRY_PICK_CAP = 3;
