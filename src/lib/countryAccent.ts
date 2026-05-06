/* Shared country-accent palette + label helpers.
 *
 * DESIGN PHILOSOPHY (rewritten 2026-05-05):
 *
 * The earlier flag-inspired palette pushed every country toward its real
 * flag colours, including white/cream stripes. White-stripe gradients
 * washed out white foreground text — "Full ride" became unreadable on
 * cards from US / UK / France / Italy / Mexico / etc. Plus the bold
 * tricolour-mid-stripe look read tacky next to the navy/gold rest of
 * the product.
 *
 * Replaced with a DEEP, MUTED, TONALLY-CONSISTENT palette: every country
 * gets a saturated dark-to-mid gradient that always carries white text
 * cleanly. Differentiation comes from:
 *
 *   1. The country LANDMARK ART (CountryArt.tsx) — Big Ben, Brandenburg,
 *      Khan Shatyr, etc. — already unique per country.
 *   2. The FLAG-PATTERN OVERLAY watermark (FlagPattern.tsx) — horizontal
 *      stripes / vertical stripes / cross / star-and-stripes — drawn at
 *      low opacity over the gradient. Two countries with similar deep-
 *      blue accents are still visually distinguished by their flag
 *      pattern (UK ≠ France ≠ EU ≠ Czechia even though all reach for
 *      blue).
 *   3. The HUE bucket — within "deep blue / deep red / deep green",
 *      countries shift along the spectrum (royal blue / navy / teal /
 *      sky on the blue side) so adjacent countries on the same continent
 *      still look distinct.
 *
 * Net: premium feel, white text always reads, every country still has
 * its own visual identity via landmark + pattern + hue.
 */

const REGIONAL_ACCENT: Record<string, string> = {
  // ─── North America ─────────────────────────────────────────────
  "United States":       "from-blue-900 via-blue-800 to-rose-900",
  "Canada":              "from-rose-900 via-red-800 to-rose-900",
  "Mexico":              "from-emerald-900 via-emerald-800 to-rose-900",
  // ─── UK & Ireland ──────────────────────────────────────────────
  "United Kingdom":      "from-indigo-900 via-violet-900 to-rose-900",
  "Ireland":             "from-emerald-900 via-emerald-800 to-orange-900",
  // ─── Continental Europe ───────────────────────────────────────
  "Germany":             "from-zinc-900 via-stone-900 to-amber-900",
  "France":              "from-blue-900 via-indigo-900 to-rose-900",
  "Netherlands":         "from-orange-900 via-amber-900 to-blue-900",
  "Switzerland":         "from-rose-900 via-rose-800 to-rose-900",
  "Sweden":              "from-blue-900 via-blue-800 to-amber-800",
  "Norway":              "from-blue-950 via-blue-900 to-rose-900",
  "Denmark":             "from-rose-900 via-red-900 to-rose-900",
  "Finland":             "from-sky-900 via-blue-900 to-blue-800",
  "Iceland":             "from-blue-950 via-cyan-900 to-blue-900",
  "Spain":               "from-rose-900 via-amber-900 to-rose-900",
  "Italy":               "from-emerald-900 via-emerald-800 to-rose-900",
  "Belgium":             "from-zinc-900 via-amber-900 to-rose-900",
  "Austria":             "from-rose-900 via-stone-800 to-rose-900",
  "Czechia":             "from-blue-900 via-indigo-900 to-rose-900",
  "Czech Republic":      "from-blue-900 via-indigo-900 to-rose-900",
  "Poland":              "from-stone-800 via-rose-900 to-rose-900",
  "Hungary":             "from-rose-900 via-stone-800 to-emerald-900",
  "Romania":             "from-blue-900 via-amber-900 to-rose-900",
  "Bulgaria":            "from-stone-800 via-emerald-900 to-rose-900",
  "Croatia":             "from-rose-900 via-stone-800 to-blue-900",
  "Lithuania":           "from-amber-900 via-emerald-900 to-rose-900",
  "Latvia":              "from-rose-950 via-rose-900 to-rose-950",
  "Slovakia":            "from-stone-800 via-blue-900 to-rose-900",
  "Estonia":             "from-blue-900 via-zinc-900 to-stone-800",
  "Greece":              "from-blue-900 via-blue-800 to-blue-900",
  "Portugal":            "from-emerald-900 via-emerald-800 to-rose-900",
  "Russia":              "from-blue-900 via-stone-800 to-rose-900",
  "Ukraine":             "from-blue-900 via-blue-800 to-amber-900",
  "EU":                  "from-blue-900 via-blue-800 to-amber-800",
  "European Union":      "from-blue-900 via-blue-800 to-amber-800",
  // ─── East Asia ─────────────────────────────────────────────────
  "China":               "from-rose-900 via-red-900 to-amber-900",
  "Japan":               "from-rose-950 via-rose-900 to-stone-900",
  "South Korea":         "from-blue-900 via-indigo-900 to-rose-900",
  "Taiwan":              "from-rose-900 via-blue-900 to-blue-800",
  "Hong Kong":           "from-rose-900 via-rose-800 to-rose-900",
  "Macau":               "from-emerald-900 via-emerald-800 to-emerald-900",
  // ─── Southeast Asia & Oceania ─────────────────────────────────
  "Singapore":           "from-rose-900 via-rose-800 to-stone-800",
  "Malaysia":            "from-blue-900 via-amber-900 to-rose-900",
  "Indonesia":           "from-rose-900 via-red-900 to-stone-800",
  "Thailand":            "from-blue-900 via-rose-900 to-blue-900",
  "Vietnam":             "from-rose-900 via-red-900 to-amber-900",
  "Philippines":         "from-blue-900 via-rose-900 to-amber-900",
  "Brunei":              "from-amber-900 via-stone-800 to-zinc-900",
  "Australia":           "from-blue-950 via-blue-900 to-rose-900",
  "New Zealand":         "from-blue-950 via-blue-900 to-rose-900",
  // ─── South Asia ───────────────────────────────────────────────
  "India":               "from-orange-900 via-amber-900 to-emerald-900",
  "Pakistan":            "from-emerald-900 via-emerald-800 to-emerald-900",
  "Bangladesh":          "from-emerald-900 via-emerald-800 to-rose-900",
  "Sri Lanka":           "from-amber-900 via-amber-800 to-emerald-900",
  "Nepal":               "from-rose-900 via-blue-900 to-rose-900",
  // ─── Central Asia ────────────────────────────────────────────
  "Kazakhstan":          "from-sky-800 via-cyan-900 to-amber-800",
  "Kyrgyzstan":          "from-rose-900 via-amber-900 to-rose-900",
  "Uzbekistan":          "from-blue-900 via-emerald-900 to-emerald-900",
  "Tajikistan":          "from-rose-900 via-stone-800 to-emerald-900",
  "Turkmenistan":        "from-emerald-900 via-emerald-800 to-emerald-900",
  "Mongolia":            "from-rose-900 via-blue-900 to-rose-900",
  "Azerbaijan":          "from-sky-900 via-rose-900 to-emerald-900",
  "Armenia":             "from-rose-900 via-blue-900 to-amber-900",
  "Georgia":             "from-rose-900 via-stone-800 to-rose-900",
  // ─── Middle East / North Africa ──────────────────────────────
  "Saudi Arabia":        "from-emerald-900 via-emerald-800 to-emerald-900",
  "United Arab Emirates":"from-emerald-900 via-stone-800 to-zinc-900",
  "UAE":                 "from-emerald-900 via-stone-800 to-zinc-900",
  "Israel":              "from-blue-900 via-blue-800 to-blue-900",
  "Turkey":              "from-rose-900 via-red-900 to-stone-800",
  "Iran":                "from-emerald-900 via-stone-800 to-rose-900",
  "Iraq":                "from-rose-900 via-stone-800 to-zinc-900",
  "Egypt":               "from-rose-900 via-stone-800 to-zinc-900",
  "Morocco":             "from-rose-900 via-red-900 to-emerald-900",
  "Qatar":               "from-rose-950 via-rose-900 to-stone-800",
  "Kuwait":              "from-emerald-900 via-stone-800 to-rose-900",
  "Lebanon":             "from-rose-900 via-stone-800 to-rose-900",
  "Jordan":              "from-zinc-900 via-stone-800 to-emerald-900",
  // ─── Sub-Saharan Africa ──────────────────────────────────────
  "South Africa":        "from-emerald-900 via-amber-900 to-blue-900",
  "Kenya":               "from-emerald-900 via-rose-900 to-emerald-900",
  "Nigeria":             "from-emerald-900 via-emerald-800 to-emerald-900",
  "Ghana":               "from-rose-900 via-amber-900 to-emerald-900",
  "Ethiopia":            "from-emerald-900 via-amber-900 to-rose-900",
  "Rwanda":              "from-sky-900 via-amber-900 to-emerald-900",
  "Tanzania":            "from-emerald-900 via-zinc-900 to-amber-900",
  "Uganda":              "from-zinc-900 via-amber-900 to-rose-900",
  "Senegal":             "from-emerald-900 via-amber-900 to-rose-900",
  "Cote d'Ivoire":       "from-orange-900 via-stone-800 to-emerald-900",
  // ─── Latin America ───────────────────────────────────────────
  "Brazil":              "from-emerald-900 via-amber-900 to-emerald-900",
  "Argentina":           "from-sky-900 via-blue-900 to-sky-800",
  "Chile":               "from-blue-900 via-rose-900 to-stone-800",
  "Colombia":            "from-amber-900 via-blue-900 to-rose-900",
  "Peru":                "from-rose-900 via-rose-800 to-rose-900",
  "Ecuador":             "from-amber-900 via-blue-900 to-rose-900",
  "Venezuela":           "from-amber-900 via-blue-900 to-rose-900",
  "Cuba":                "from-blue-900 via-stone-800 to-rose-900",
  "Uruguay":             "from-blue-900 via-stone-800 to-blue-900",
  // ─── Multi/global ────────────────────────────────────────────
  "Multiple countries":  "from-violet-900 via-fuchsia-900 to-rose-900",
  "Global":              "from-violet-900 via-fuchsia-900 to-rose-900",
  "Multiple":            "from-violet-900 via-fuchsia-900 to-rose-900",
  "Worldwide":           "from-violet-900 via-fuchsia-900 to-rose-900",
};

/* Default fallback: distinct deep charcoal — visually signals "we don't
 * know the country yet" rather than passing for any specific country. */
const DEFAULT_ACCENT = "from-zinc-800 via-zinc-700 to-zinc-800";

export const accentForCountry = (country: string | null | undefined): string => {
  if (!country) return DEFAULT_ACCENT;
  const exact = REGIONAL_ACCENT[country];
  if (exact) return exact;
  const canon = canonicalCountry(country);
  return REGIONAL_ACCENT[canon] || DEFAULT_ACCENT;
};

/* Database `host_country` values like "Multiple (Japan, Indonesia, ...)"
 * waste card real estate. Compact label keeps the visual rhythm tight.
 *
 * Some scrapes write essay-length descriptions into host_country (e.g.
 * the Mastercard Foundation row had "Various (primarily Africa, but
 * also includes institutions in North and Central America, Europe,
 * and the Middle East)"). When that hits a chip, the whole row's
 * layout breaks. This helper:
 *   1. Recognises "multiple (...)" patterns and gives them a tight
 *      first-host + plus label.
 *   2. Maps known descriptive prefixes ("Various", "Global", ...)
 *      to compact equivalents.
 *   3. Hard-caps any remaining string at ~18 chars so a runaway
 *      descriptive value can never break a row again. */
export const shortCountry = (country: string): string => {
  const c = country.trim();
  if (/^multiple\s*\(worldwide\)?$/i.test(c)) return "Worldwide";
  if (/^multiple/i.test(c)) {
    const m = c.match(/multiple\s*\(([^,)]+)/i);
    return m ? `${m[1].trim()} +` : "Multiple";
  }
  if (/^global$/i.test(c)) return "Worldwide";
  if (/^various/i.test(c) || /^worldwide/i.test(c) || /^international/i.test(c)) {
    return "Various";
  }
  // Hard cap: anything over 18 chars is descriptive prose, not a
  // country name. Fall back to a generic label rather than rendering
  // a paragraph in a chip.
  if (c.length > 18) return "Various";
  return c;
};

/* Canonical country bucket for filter dropdowns. */
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
  if (/^multiple/i.test(c)) return "Multiple countries";
  if (/^various/i.test(c)) return "Multiple countries";
  if (/^global$/i.test(c) || /^international$/i.test(c) || /^worldwide$/i.test(c)) return "Multiple countries";
  const stripped = c.replace(/\s*[/(]\s*multiple.*$/i, "").trim();
  const lower = stripped.toLowerCase();
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
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

/* Flag pattern archetype per country. Used by FlagPattern.tsx to render
 * a low-opacity flag-shape watermark over the country accent — adds
 * per-country differentiation that doesn't depend on saturated colors.
 *
 * Archetypes:
 *   horizontal — three or two horizontal bands
 *   vertical   — three vertical bands (tricolore)
 *   cross      — Nordic/UK-style cross
 *   stripes    — narrow stripes (US/Greece)
 *   sun        — central disc/sun (Japan/Bangladesh)
 *   star       — single star (China/Vietnam/Cuba/EU/Israel/Turkey/Pakistan)
 *   diagonal   — diagonal split (Tanzania/DRC)
 *   triangle   — hoist triangle (South Africa/Czech/Philippines/Cuba)
 *   chevron    — chevron pattern (Bahrain/Qatar wave)
 */
export type FlagArchetype =
  | "horizontal" | "vertical" | "cross" | "stripes"
  | "sun" | "star" | "diagonal" | "triangle" | "chevron";

const FLAG_ARCHETYPE: Record<string, FlagArchetype> = {
  "United States": "stripes", "Canada": "vertical", "Mexico": "vertical",
  "United Kingdom": "cross", "Ireland": "vertical",
  "Germany": "horizontal", "France": "vertical", "Netherlands": "horizontal",
  "Switzerland": "cross", "Sweden": "cross", "Norway": "cross",
  "Denmark": "cross", "Finland": "cross", "Iceland": "cross",
  "Spain": "horizontal", "Italy": "vertical", "Belgium": "vertical",
  "Austria": "horizontal", "Czechia": "triangle", "Czech Republic": "triangle",
  "Poland": "horizontal", "Hungary": "horizontal", "Romania": "vertical",
  "Bulgaria": "horizontal", "Croatia": "horizontal", "Lithuania": "horizontal",
  "Latvia": "horizontal", "Slovakia": "horizontal", "Estonia": "horizontal",
  "Greece": "stripes", "Portugal": "vertical", "Russia": "horizontal",
  "Ukraine": "horizontal", "EU": "star", "European Union": "star",
  "China": "star", "Japan": "sun", "South Korea": "sun",
  "Taiwan": "star", "Hong Kong": "sun", "Macau": "star",
  "Singapore": "horizontal", "Malaysia": "stripes", "Indonesia": "horizontal",
  "Thailand": "stripes", "Vietnam": "star", "Philippines": "triangle",
  "Brunei": "diagonal", "Australia": "star", "New Zealand": "star",
  "India": "horizontal", "Pakistan": "star", "Bangladesh": "sun",
  "Sri Lanka": "star", "Nepal": "triangle",
  "Kazakhstan": "sun", "Kyrgyzstan": "sun", "Uzbekistan": "horizontal",
  "Tajikistan": "horizontal", "Turkmenistan": "vertical", "Mongolia": "vertical",
  "Azerbaijan": "horizontal", "Armenia": "horizontal", "Georgia": "cross",
  "Saudi Arabia": "horizontal", "United Arab Emirates": "horizontal",
  "UAE": "horizontal", "Israel": "horizontal", "Turkey": "star",
  "Iran": "horizontal", "Iraq": "horizontal", "Egypt": "horizontal",
  "Morocco": "star", "Qatar": "chevron", "Kuwait": "horizontal",
  "Lebanon": "horizontal", "Jordan": "triangle",
  "South Africa": "diagonal", "Kenya": "horizontal", "Nigeria": "vertical",
  "Ghana": "horizontal", "Ethiopia": "horizontal", "Rwanda": "horizontal",
  "Tanzania": "diagonal", "Uganda": "stripes", "Senegal": "vertical",
  "Cote d'Ivoire": "vertical",
  "Brazil": "diagonal", "Argentina": "horizontal", "Chile": "horizontal",
  "Colombia": "horizontal", "Peru": "vertical", "Ecuador": "horizontal",
  "Venezuela": "horizontal", "Cuba": "stripes", "Uruguay": "stripes",
  "Multiple countries": "star", "Global": "star",
  "Multiple": "star", "Worldwide": "star",
};

export const flagArchetypeFor = (country: string | null | undefined): FlagArchetype => {
  if (!country) return "star";
  const exact = FLAG_ARCHETYPE[country];
  if (exact) return exact;
  const canon = canonicalCountry(country);
  return FLAG_ARCHETYPE[canon] ?? "star";
};
