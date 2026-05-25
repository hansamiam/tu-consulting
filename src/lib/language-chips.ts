// Foreign-language chip data for the TopUni AI wizard Step 1.
//
// Deliberately scoped to FOREIGN languages — English + CIS native
// languages (Russian, Kazakh, Kyrgyz, Uzbek, Tajik) are NOT chips.
// This pre-filters the cultural-baseline problem at the form level:
// anything picked is distinctive by definition. A KZ student picking
// Russian + Kazakh + English would be tone-deaf to celebrate ("everyone
// in the region speaks those"). A KZ student picking German or Mandarin
// genuinely IS distinctive. The brief celebrates whatever's stored
// without needing per-nationality baseline filtering.
//
// Per project_topuni_positioning_anti_crimson memory.

export interface LanguageEntry {
  token: string;
  en: string;
  ru: string;
}

export const LANGUAGE_CHIPS: LanguageEntry[] = [
  { token: "french",   en: "French",   ru: "Французский" },
  { token: "spanish",  en: "Spanish",  ru: "Испанский" },
  { token: "german",   en: "German",   ru: "Немецкий" },
  { token: "korean",   en: "Korean",   ru: "Корейский" },
  { token: "mandarin", en: "Mandarin", ru: "Китайский" },
  { token: "japanese", en: "Japanese", ru: "Японский" },
  { token: "arabic",   en: "Arabic",   ru: "Арабский" },
  { token: "italian",  en: "Italian",  ru: "Итальянский" },
  { token: "turkish",  en: "Turkish",  ru: "Турецкий" },
  { token: "other",    en: "Other",    ru: "Другое" },
];

const TOKEN_INDEX = new Map(LANGUAGE_CHIPS.map((l) => [l.token, l]));

export function languageLabel(token: string, language: "en" | "ru"): string {
  const entry = TOKEN_INDEX.get(token);
  if (!entry) return token;
  return language === "ru" ? entry.ru : entry.en;
}

// First-in-family-to-apply-abroad chip set. Single-select. The token
// is what gets stored; cultural-context.ts in the brief generator maps
// the framing per nationality.
//
// 2026-05-25: collapsed siblings_have + parents_have → single "no". The
// brief generator only special-cased "yes" anyway; the rest got the
// same generic line. Legacy tokens are mapped to "no" by consumers.
export interface FirstAbroadOption {
  token: "yes" | "no" | "unsure";
  en: string;
  ru: string;
}

export const FIRST_ABROAD_CHIPS: FirstAbroadOption[] = [
  { token: "yes",     en: "Yes",      ru: "Да" },
  { token: "no",      en: "No",       ru: "Нет" },
  { token: "unsure",  en: "Not sure", ru: "Не знаю" },
];

export function firstAbroadLabel(
  token: FirstAbroadOption["token"], language: "en" | "ru",
): string {
  const entry = FIRST_ABROAD_CHIPS.find((c) => c.token === token);
  if (!entry) return token;
  return language === "ru" ? entry.ru : entry.en;
}
