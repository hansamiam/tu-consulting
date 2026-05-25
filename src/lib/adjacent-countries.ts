/**
 * Country adjacency for "You might also fit" suggestions.
 * Manually curated for CIS-origin students.
 * Adjacent = similar tier, similar entry requirements, similar
 * tuition+visa profile. Not pure geography — e.g. UK→Ireland,
 * Germany→Netherlands/Austria/Czechia, US→Canada.
 */

export type CountryISO = string;
export type Tier = "T1" | "T2" | "T3";

interface CountryProfile {
  /** Tier 1 = elite Anglosphere, T2 = mainland EU + AU/NZ, T3 = emerging hubs */
  tier: Tier;
  /** Up to 4 adjacent countries, ordered by closeness of fit */
  adjacent: CountryISO[];
}

export const COUNTRY_ADJACENCY: Record<CountryISO, CountryProfile> = {
  DEU: { tier: "T2", adjacent: ["NLD", "AUT", "CZE", "DNK"] },
  NLD: { tier: "T2", adjacent: ["DEU", "BEL", "SWE", "AUT"] },
  GBR: { tier: "T1", adjacent: ["IRL", "NLD", "DEU", "AUS"] },
  USA: { tier: "T1", adjacent: ["CAN", "GBR", "AUS", "NLD"] },
  CAN: { tier: "T1", adjacent: ["USA", "GBR", "AUS", "IRL"] },
  AUS: { tier: "T1", adjacent: ["NZL", "CAN", "GBR", "SGP"] },
  IRL: { tier: "T2", adjacent: ["GBR", "NLD", "DEU", "CAN"] },
  TUR: { tier: "T3", adjacent: ["HUN", "POL", "CZE", "ITA"] },
  HUN: { tier: "T3", adjacent: ["POL", "CZE", "AUT", "DEU"] },
  POL: { tier: "T3", adjacent: ["HUN", "CZE", "DEU", "NLD"] },
  CZE: { tier: "T3", adjacent: ["DEU", "AUT", "HUN", "POL"] },
  AUT: { tier: "T2", adjacent: ["DEU", "CZE", "CHE", "NLD"] },
  CHE: { tier: "T2", adjacent: ["DEU", "AUT", "FRA", "NLD"] },
  FRA: { tier: "T2", adjacent: ["BEL", "NLD", "CHE", "DEU"] },
  ITA: { tier: "T2", adjacent: ["ESP", "FRA", "AUT", "DEU"] },
  ESP: { tier: "T2", adjacent: ["PRT", "ITA", "FRA", "NLD"] },
  SWE: { tier: "T2", adjacent: ["NOR", "DNK", "FIN", "NLD"] },
  NOR: { tier: "T2", adjacent: ["SWE", "DNK", "FIN", "NLD"] },
  DNK: { tier: "T2", adjacent: ["SWE", "NOR", "NLD", "DEU"] },
  FIN: { tier: "T2", adjacent: ["SWE", "NOR", "EST", "NLD"] },
  SGP: { tier: "T1", adjacent: ["AUS", "GBR", "CAN", "NZL"] },
  JPN: { tier: "T2", adjacent: ["KOR", "SGP", "AUS", "USA"] },
  KOR: { tier: "T2", adjacent: ["JPN", "SGP", "AUS", "USA"] },
};

/** Returns up to N adjacent country ISOs, or empty array if unknown. */
export const getAdjacentCountries = (iso: CountryISO, limit = 3): CountryISO[] =>
  (COUNTRY_ADJACENCY[iso]?.adjacent ?? []).slice(0, limit);

/** Country names by ISO (subset of above + the adjacents they reference). */
export const COUNTRY_NAMES: Record<CountryISO, { en: string; ru: string }> = {
  DEU: { en: "Germany", ru: "Германия" },
  NLD: { en: "Netherlands", ru: "Нидерланды" },
  GBR: { en: "United Kingdom", ru: "Великобритания" },
  USA: { en: "United States", ru: "США" },
  CAN: { en: "Canada", ru: "Канада" },
  AUS: { en: "Australia", ru: "Австралия" },
  NZL: { en: "New Zealand", ru: "Новая Зеландия" },
  IRL: { en: "Ireland", ru: "Ирландия" },
  TUR: { en: "Türkiye", ru: "Турция" },
  HUN: { en: "Hungary", ru: "Венгрия" },
  POL: { en: "Poland", ru: "Польша" },
  CZE: { en: "Czechia", ru: "Чехия" },
  AUT: { en: "Austria", ru: "Австрия" },
  CHE: { en: "Switzerland", ru: "Швейцария" },
  FRA: { en: "France", ru: "Франция" },
  ITA: { en: "Italy", ru: "Италия" },
  ESP: { en: "Spain", ru: "Испания" },
  PRT: { en: "Portugal", ru: "Португалия" },
  SWE: { en: "Sweden", ru: "Швеция" },
  NOR: { en: "Norway", ru: "Норвегия" },
  DNK: { en: "Denmark", ru: "Дания" },
  FIN: { en: "Finland", ru: "Финляндия" },
  EST: { en: "Estonia", ru: "Эстония" },
  BEL: { en: "Belgium", ru: "Бельгия" },
  SGP: { en: "Singapore", ru: "Сингапур" },
  JPN: { en: "Japan", ru: "Япония" },
  KOR: { en: "South Korea", ru: "Южная Корея" },
};

/**
 * Maps country tokens/names as used by the intake wizard and brief payload
 * (full English names, not ISO codes) → ISO codes.
 * Covers the country-chips.ts COUNTRY_MASTER tokens + common variants.
 */
export const COUNTRY_TOKEN_TO_ISO: Record<string, CountryISO> = {
  // Intake wizard tokens (from country-chips.ts)
  "USA": "USA",
  "UK": "GBR",
  "United Kingdom": "GBR",
  "Canada": "CAN",
  "Germany": "DEU",
  "Netherlands": "NLD",
  "South Korea": "KOR",
  "Singapore": "SGP",
  "Hungary": "HUN",
  "Türkiye": "TUR",
  "Turkey": "TUR",
  "Australia": "AUS",
  "Japan": "JPN",
  "Czech Republic": "CZE",
  "Czechia": "CZE",
  "Poland": "POL",
  "Italy": "ITA",
  "France": "FRA",
  "Spain": "ESP",
  "Ireland": "IRL",
  "New Zealand": "NZL",
  "Sweden": "SWE",
  "Finland": "FIN",
  "Denmark": "DNK",
  "Norway": "NOR",
  "Switzerland": "CHE",
  "Belgium": "BEL",
  "Austria": "AUT",
  "Estonia": "EST",
  // Brief payload variants (AI may use slightly different forms)
  "United States": "USA",
  "United States of America": "USA",
  "U.S.": "USA",
  "U.S.A.": "USA",
  "Britain": "GBR",
  "Great Britain": "GBR",
  "Portugal": "PRT",
  "South Korea (Korea)": "KOR",
  "Korea": "KOR",
};

/**
 * Normalizes a country token or name to an ISO code.
 * Case-insensitive. Returns null when unknown.
 */
export const tokenToIso = (token: string): CountryISO | null => {
  const direct = COUNTRY_TOKEN_TO_ISO[token];
  if (direct) return direct;
  // Case-insensitive fallback
  const lower = token.toLowerCase().trim();
  for (const [k, v] of Object.entries(COUNTRY_TOKEN_TO_ISO)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
};
