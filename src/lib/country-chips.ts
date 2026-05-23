// Country chip data for the TopUni AI wizard Step 2.
//
// 11 default chips + "Other" render on Step 2. "Other" opens a typeahead
// modal backed by COUNTRY_MASTER. The default set is intentionally wider
// than the Anglo-elite track (UK/US/Canada) — Hungary, Türkiye, China
// teach the user that Top Uni serves a broader world than Crimson does.
// Per project_topuni_positioning_anti_crimson memory.

export interface CountryEntry {
  /** Stable English token persisted to localStorage + sent to the brief
   *  generator. Never localized — the UI label maps via the en/ru fields. */
  token: string;
  en: string;
  ru: string;
}

/** Token of the synthetic "Other" chip that opens the typeahead. */
export const OTHER_TOKEN = "__other__";

/** Default 11 chips that render on Step 2 (plus an "Other" chip
 *  appended in the wizard JSX so the typeahead trigger is part of the
 *  chip row). Order is curated: aspirational + accessible mixed. */
export const COUNTRY_DEFAULT_CHIPS: string[] = [
  "USA",
  "UK",
  "Canada",
  "Germany",
  "Netherlands",
  "South Korea",
  "Singapore",
  "Hungary",
  "Türkiye",
  "Australia",
  "China",
];

/** Master list backing the typeahead. Includes every default + 19 more
 *  for the long tail. Adding entries here makes them searchable without
 *  changing the default chip row. */
export const COUNTRY_MASTER: CountryEntry[] = [
  { token: "USA",             en: "USA",             ru: "США" },
  { token: "UK",              en: "UK",              ru: "Великобритания" },
  { token: "Canada",          en: "Canada",          ru: "Канада" },
  { token: "Germany",         en: "Germany",         ru: "Германия" },
  { token: "Netherlands",     en: "Netherlands",     ru: "Нидерланды" },
  { token: "South Korea",     en: "South Korea",     ru: "Южная Корея" },
  { token: "Singapore",       en: "Singapore",       ru: "Сингапур" },
  { token: "Hungary",         en: "Hungary",         ru: "Венгрия" },
  { token: "Türkiye",         en: "Türkiye",         ru: "Турция" },
  { token: "Australia",       en: "Australia",       ru: "Австралия" },
  { token: "China",           en: "China",           ru: "Китай" },
  { token: "Japan",           en: "Japan",           ru: "Япония" },
  { token: "Malaysia",        en: "Malaysia",        ru: "Малайзия" },
  { token: "Czech Republic",  en: "Czech Republic",  ru: "Чехия" },
  { token: "Poland",          en: "Poland",          ru: "Польша" },
  { token: "Italy",           en: "Italy",           ru: "Италия" },
  { token: "France",          en: "France",          ru: "Франция" },
  { token: "Spain",           en: "Spain",           ru: "Испания" },
  { token: "Ireland",         en: "Ireland",         ru: "Ирландия" },
  { token: "New Zealand",     en: "New Zealand",     ru: "Новая Зеландия" },
  { token: "Hong Kong",       en: "Hong Kong",       ru: "Гонконг" },
  { token: "Sweden",          en: "Sweden",          ru: "Швеция" },
  { token: "Finland",         en: "Finland",         ru: "Финляндия" },
  { token: "Denmark",         en: "Denmark",         ru: "Дания" },
  { token: "Norway",          en: "Norway",          ru: "Норвегия" },
  { token: "UAE",             en: "UAE",             ru: "ОАЭ" },
  { token: "Russia",          en: "Russia",          ru: "Россия" },
  { token: "Switzerland",     en: "Switzerland",     ru: "Швейцария" },
  { token: "Belgium",         en: "Belgium",         ru: "Бельгия" },
  { token: "Austria",         en: "Austria",         ru: "Австрия" },
  { token: "Estonia",         en: "Estonia",         ru: "Эстония" },
  { token: "India",           en: "India",           ru: "Индия" },
  { token: "South Africa",    en: "South Africa",    ru: "ЮАР" },
  { token: "Brazil",          en: "Brazil",          ru: "Бразилия" },
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

/** Cap enforced by the chip row + typeahead. Matches the brief-plan
 *  countryBuckets slice (top 3 → primary buckets). */
export const COUNTRY_PICK_CAP = 3;
