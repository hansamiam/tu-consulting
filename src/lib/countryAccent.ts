/* Shared country-accent palette + label helpers.
 *
 * Lives outside Discover.tsx so any surface (Pipeline cards, Brief
 * scholarship chips, public scholarship pages, marketing pages) can
 * carry the same regional identity instead of each surface inventing
 * its own colour scheme. Single source of truth for "what colour
 * gradient does this country get".
 *
 * Returns Tailwind classes for a `bg-gradient-to-r` band. Foreground
 * stays white-ish on every gradient — the gradients are saturated
 * enough that white text reads cleanly on all of them.
 *
 * Lookup is canonicalised (USA / U.S.A. / United States all match the
 * same entry) so the LLM's casing/aliasing variations don't fall to
 * the default and produce visually identical cards.
 *
 * Each country gets a FLAG-INSPIRED or otherwise distinctive gradient
 * so two cards from two different countries never look the same at a
 * glance — the visual identity is the regional identity. The default
 * fallback is a neutral charcoal that's intentionally distinct from
 * any specific country, so unmapped rows are visibly "uncategorised".
 */

export const REGIONAL_ACCENT: Record<string, string> = {
  // ─── North America ─────────────────────────────────────────────
  "United States":       "from-rose-700 via-white to-blue-700",      // flag
  "Canada":              "from-red-600 via-rose-50 to-red-600",      // flag
  "Mexico":              "from-emerald-700 via-stone-50 to-red-700", // flag
  // ─── UK & Ireland ──────────────────────────────────────────────
  "United Kingdom":      "from-violet-800 via-rose-700 to-violet-800",
  "Ireland":             "from-emerald-700 via-stone-50 to-orange-600", // flag
  // ─── Continental Europe ───────────────────────────────────────
  "Germany":             "from-zinc-900 via-rose-700 to-amber-500",  // flag
  "France":              "from-blue-800 via-stone-50 to-rose-700",   // flag
  "Netherlands":         "from-rose-700 via-stone-50 to-blue-700",   // flag
  "Switzerland":         "from-rose-700 via-rose-700 to-stone-50",
  "Sweden":              "from-blue-700 via-blue-600 to-amber-400",  // flag-y
  "Norway":              "from-rose-700 via-blue-800 to-rose-700",
  "Denmark":             "from-rose-700 via-stone-50 to-rose-700",
  "Finland":             "from-stone-50 via-blue-700 to-stone-50",
  "Iceland":             "from-blue-800 via-stone-50 to-rose-700",
  "Spain":               "from-rose-700 via-amber-500 to-rose-700",  // flag
  "Italy":               "from-emerald-700 via-stone-50 to-rose-700", // flag
  "Belgium":             "from-zinc-900 via-amber-500 to-rose-700",  // flag
  "Austria":             "from-rose-700 via-stone-50 to-rose-700",
  "Czechia":             "from-blue-800 via-stone-50 to-rose-700",
  "Czech Republic":      "from-blue-800 via-stone-50 to-rose-700",
  "Poland":              "from-stone-50 via-stone-50 to-rose-700",
  "Hungary":             "from-rose-700 via-stone-50 to-emerald-700",
  "Romania":             "from-blue-800 via-amber-500 to-rose-700",
  "Bulgaria":            "from-stone-50 via-emerald-700 to-rose-700",
  "Croatia":             "from-rose-700 via-stone-50 to-blue-800",
  "Lithuania":           "from-amber-500 via-emerald-700 to-rose-700",
  "Latvia":              "from-rose-900 via-stone-50 to-rose-900",
  "Slovakia":            "from-stone-50 via-blue-800 to-rose-700",
  "Estonia":             "from-blue-700 via-zinc-900 to-stone-50",
  "Greece":              "from-blue-700 via-stone-50 to-blue-700",
  "Portugal":            "from-emerald-800 via-emerald-700 to-rose-700",
  "Russia":              "from-stone-50 via-blue-800 to-rose-700",
  "Ukraine":             "from-blue-700 via-blue-700 to-amber-500",
  "EU":                  "from-blue-800 via-blue-700 to-amber-400",   // EU flag
  "European Union":      "from-blue-800 via-blue-700 to-amber-400",
  // ─── East Asia ─────────────────────────────────────────────────
  "China":               "from-rose-700 via-rose-700 to-amber-400",
  "Japan":               "from-stone-50 via-stone-100 to-rose-600",
  "South Korea":         "from-stone-50 via-blue-700 to-rose-700",
  "Taiwan":              "from-rose-700 via-blue-800 to-stone-50",
  "Hong Kong":           "from-rose-700 via-rose-600 to-rose-700",
  "Macau":               "from-emerald-700 via-emerald-600 to-emerald-700",
  // ─── Southeast Asia & Oceania ─────────────────────────────────
  "Singapore":           "from-rose-700 via-rose-600 to-stone-50",
  "Malaysia":            "from-rose-700 via-amber-400 to-blue-800",
  "Indonesia":           "from-rose-700 via-rose-600 to-stone-50",
  "Thailand":            "from-rose-700 via-blue-800 to-rose-700",
  "Vietnam":             "from-rose-700 via-rose-600 to-amber-400",
  "Philippines":         "from-blue-800 via-stone-50 to-rose-700",
  "Brunei":              "from-amber-500 via-stone-50 to-zinc-900",
  "Australia":           "from-blue-800 via-blue-700 to-rose-700",
  "New Zealand":         "from-blue-800 via-rose-700 to-blue-800",
  // ─── South Asia ───────────────────────────────────────────────
  "India":               "from-orange-600 via-stone-50 to-emerald-700", // flag
  "Pakistan":            "from-emerald-800 via-stone-50 to-emerald-700",
  "Bangladesh":          "from-emerald-700 via-emerald-600 to-rose-700",
  "Sri Lanka":           "from-amber-700 via-emerald-700 to-amber-700",
  "Nepal":               "from-rose-700 via-blue-700 to-rose-700",
  // ─── Central Asia ────────────────────────────────────────────
  "Kazakhstan":          "from-sky-500 via-sky-400 to-amber-400",      // flag
  "Kyrgyzstan":          "from-rose-700 via-amber-400 to-rose-700",
  "Uzbekistan":          "from-blue-700 via-stone-50 to-emerald-700",
  "Tajikistan":          "from-rose-700 via-stone-50 to-emerald-700",
  "Turkmenistan":        "from-emerald-700 via-emerald-600 to-emerald-700",
  "Mongolia":            "from-rose-700 via-blue-800 to-rose-700",
  "Azerbaijan":          "from-sky-600 via-rose-700 to-emerald-700",
  "Armenia":             "from-rose-700 via-blue-700 to-amber-500",
  "Georgia":             "from-stone-50 via-rose-700 to-stone-50",
  // ─── Middle East / North Africa ──────────────────────────────
  "Saudi Arabia":        "from-emerald-800 via-emerald-700 to-emerald-800",
  "United Arab Emirates":"from-emerald-700 via-stone-50 to-zinc-900",
  "UAE":                 "from-emerald-700 via-stone-50 to-zinc-900",
  "Israel":              "from-blue-800 via-stone-50 to-blue-800",
  "Turkey":              "from-rose-700 via-rose-700 to-stone-50",
  "Iran":                "from-emerald-700 via-stone-50 to-rose-700",
  "Iraq":                "from-rose-700 via-stone-50 to-zinc-900",
  "Egypt":               "from-rose-700 via-stone-50 to-zinc-900",
  "Morocco":             "from-rose-700 via-rose-600 to-emerald-700",
  "Qatar":               "from-rose-900 via-rose-800 to-stone-50",
  "Kuwait":              "from-emerald-700 via-stone-50 to-rose-700",
  "Lebanon":             "from-rose-700 via-stone-50 to-rose-700",
  "Jordan":              "from-zinc-900 via-stone-50 to-emerald-700",
  // ─── Sub-Saharan Africa ──────────────────────────────────────
  "South Africa":        "from-emerald-700 via-amber-500 to-blue-700",
  "Kenya":               "from-emerald-700 via-rose-700 to-emerald-700",
  "Nigeria":             "from-emerald-700 via-stone-50 to-emerald-700",
  "Ghana":               "from-rose-700 via-amber-500 to-emerald-700",
  "Ethiopia":            "from-emerald-700 via-amber-500 to-rose-700",
  "Rwanda":              "from-sky-600 via-amber-400 to-emerald-700",
  "Tanzania":            "from-emerald-700 via-zinc-900 to-amber-500",
  "Uganda":              "from-zinc-900 via-amber-500 to-rose-700",
  "Senegal":             "from-emerald-700 via-amber-500 to-rose-700",
  "Cote d'Ivoire":       "from-orange-600 via-stone-50 to-emerald-700",
  // ─── Latin America ───────────────────────────────────────────
  "Brazil":              "from-emerald-700 via-amber-400 to-emerald-700",
  "Argentina":           "from-sky-500 via-stone-50 to-sky-500",
  "Chile":               "from-stone-50 via-rose-700 to-blue-800",
  "Colombia":            "from-amber-400 via-blue-800 to-rose-700",
  "Peru":                "from-rose-700 via-stone-50 to-rose-700",
  "Ecuador":             "from-amber-500 via-blue-800 to-rose-700",
  "Venezuela":           "from-amber-500 via-blue-800 to-rose-700",
  "Cuba":                "from-blue-700 via-stone-50 to-rose-700",
  "Uruguay":             "from-stone-50 via-blue-700 to-stone-50",
  // ─── Multi/global ────────────────────────────────────────────
  "Multiple countries":  "from-violet-700 via-fuchsia-700 to-orange-600",
  "Global":              "from-violet-700 via-fuchsia-700 to-orange-600",
  "Multiple":            "from-violet-700 via-fuchsia-700 to-orange-600",
  "Worldwide":           "from-violet-700 via-fuchsia-700 to-orange-600",
};

/* Default fallback: distinct charcoal that's intentionally NOT a
 * country accent — visually signals "we don't know the country yet"
 * rather than passing for an actual country gradient. */
export const DEFAULT_ACCENT = "from-zinc-700 via-zinc-600 to-zinc-700";

export const accentForCountry = (country: string | null | undefined): string => {
  if (!country) return DEFAULT_ACCENT;
  // Try exact first (covers existing keys), then canonicalised form so
  // "USA"/"U.S.A."/"United States of America" all hit the same accent.
  const exact = REGIONAL_ACCENT[country];
  if (exact) return exact;
  const canon = canonicalCountry(country);
  return REGIONAL_ACCENT[canon] || DEFAULT_ACCENT;
};

/* Database `host_country` values like "Multiple (Japan, Indonesia, ...)"
 * waste card real estate. Compact label keeps the visual rhythm tight. */
export const shortCountry = (country: string): string => {
  const c = country.trim();
  if (/^multiple\s*\(worldwide\)?$/i.test(c)) return "Worldwide";
  if (/^multiple/i.test(c)) {
    const m = c.match(/multiple\s*\(([^,)]+)/i);
    return m ? `${m[1].trim()} +` : "Multiple";
  }
  if (/^global$/i.test(c)) return "Worldwide";
  return c;
};

/* Canonical country bucket for filter dropdowns. The host_country field
 * is LLM-extracted, so the raw values are noisy:
 *   · "Multiple (Japan, Korea, …)"           → Multiple countries
 *   · "Multiple (Worldwide)"                 → Multiple countries
 *   · "Global" / "International" / "Worldwide" → Multiple countries
 *   · "Various (primarily Africa, but also …)"→ Multiple countries
 *   · "South Korea / Multiple"               → South Korea
 *     (the ' / Multiple' is just a hint that scholars can study at
 *     multiple campuses within Korea — drop the suffix)
 *   · "Turkiye"                              → Turkey  (alias)
 *   · "USA" / "U.S.A."                       → United States
 *   · "UK" / "U.K."                          → United Kingdom
 *   · 80-char run-on parentheticals          → first proper-noun chunk
 *
 * Filtering against the canonical form lets one dropdown selection
 * match every variant. */
const COUNTRY_ALIASES: Record<string, string> = {
  "turkiye": "Turkey",
  "türkiye": "Turkey",
  "usa": "United States",
  "u.s.a.": "United States",
  "u.s.": "United States",
  "us": "United States",
  "uk": "United Kingdom",
  "u.k.": "United Kingdom",
  "great britain": "United Kingdom",
  "britain": "United Kingdom",
  "england": "United Kingdom",
  "scotland": "United Kingdom",
  "wales": "United Kingdom",
  "northern ireland": "United Kingdom",
  "uae": "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  "south korea": "South Korea",
  "korea": "South Korea",
  "republic of korea": "South Korea",
  "russian federation": "Russia",
  "kingdom of saudi arabia": "Saudi Arabia",
  "people's republic of china": "China",
  "prc": "China",
  "hk": "Hong Kong",
  "ksa": "Saudi Arabia",
  "kyrgyz republic": "Kyrgyzstan",
  "republic of kazakhstan": "Kazakhstan",
  "republic of uzbekistan": "Uzbekistan",
  "european union": "EU",
  "eu countries": "EU",
};

export const canonicalCountry = (country: string): string => {
  const c = country.trim();
  if (!c) return "Multiple countries";
  // Catch-all multi-country patterns first
  if (/^multiple/i.test(c)) return "Multiple countries";
  if (/^various/i.test(c)) return "Multiple countries";
  if (/^global$/i.test(c) || /^international$/i.test(c) || /^worldwide$/i.test(c)) return "Multiple countries";
  // "Country / Multiple" or "Country (Multiple campuses)" — strip the suffix
  const stripped = c.replace(/\s*[/(]\s*multiple.*$/i, "").trim();
  // Apply alias map (case-insensitive)
  const lower = stripped.toLowerCase();
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
  // Drop trailing parentheticals on overly long values
  if (stripped.length > 28) {
    const noParen = stripped.replace(/\s*\(.*$/, "").trim();
    if (noParen.length > 0 && noParen.length <= 28) {
      const lower2 = noParen.toLowerCase();
      return COUNTRY_ALIASES[lower2] || noParen;
    }
    return "Multiple countries";
  }
  return stripped;
};
