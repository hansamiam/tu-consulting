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
  /* DESIGN NOTE (2026-05-07 rewrite):
   *
   * Pre-rewrite, ~12 countries shared the "blue → rose" palette
   * (US, France, UK, Australia, NZ, Norway, Russia, South Korea,
   * Czechia, Slovakia, Croatia, Romania). Sitting next to each other
   * in a Discover grid they read as identical. The user called this
   * out — "Australia and US look way too similar."
   *
   * The fix: every country in the long-blue cluster gets a *different*
   * mid-stop hue (wine / plum / teal / coral / rust / ochre). Same
   * tonal floor (deep dark base, mid-saturation accent) so the navy
   * card chrome stays consistent and white text reads everywhere.
   * Two countries should never share an exact gradient unless they're
   * intentional regional siblings (Caucasus, Central Asia).
   */
  // ─── North America ─────────────────────────────────────────────
  // US: navy + wine + cream-bronze — patriotic but warmer than the
  //     pre-rewrite plain blue→rose so it stops twinning with AU/UK.
  "United States":       "from-blue-950 via-rose-950 to-amber-900",
  // Canada: red-and-white maple identity — keep red dominance, add
  //          warm cedar mid for forest country feel.
  "Canada":              "from-red-900 via-rose-900 to-orange-900",
  "Mexico":              "from-emerald-900 via-amber-900 to-red-900",
  // ─── UK & Ireland ──────────────────────────────────────────────
  // UK: deep royal — purple/violet keeps the "Crown" reading and
  //     stays distinct from US/France blue.
  "United Kingdom":      "from-violet-950 via-purple-900 to-red-900",
  "Ireland":             "from-emerald-900 via-emerald-800 to-orange-900",
  // ─── Continental Europe ───────────────────────────────────────
  // Germany: black/red/gold flag — keep dark base, gold accent.
  "Germany":             "from-zinc-950 via-red-950 to-amber-800",
  // France: indigo + wine — distinguishes from US (which is now
  //          warmer) and from UK (which leans purple).
  "France":              "from-indigo-950 via-violet-950 to-rose-900",
  "Netherlands":         "from-orange-900 via-amber-800 to-blue-900",
  // Switzerland: deep red + alpine charcoal — was monotone rose.
  "Switzerland":         "from-red-950 via-rose-900 to-zinc-800",
  "Sweden":              "from-blue-900 via-cyan-900 to-amber-800",
  // Norway: wine-leaning red + slate — was duplicate of AU.
  "Norway":              "from-rose-950 via-red-900 to-blue-900",
  "Denmark":             "from-red-950 via-rose-900 to-rose-950",
  "Finland":             "from-sky-900 via-blue-900 to-blue-800",
  "Iceland":             "from-cyan-900 via-blue-900 to-slate-900",
  // Spain: sangre y oro — saturated red→gold.
  "Spain":               "from-red-900 via-orange-900 to-amber-800",
  "Italy":               "from-emerald-900 via-stone-800 to-red-900",
  "Belgium":             "from-zinc-900 via-amber-900 to-red-900",
  "Austria":             "from-red-900 via-stone-800 to-red-900",
  // Czechia: navy + sky + wine — distinguishes from FR by the
  //          sky-blue mid (Czech flag has the lighter blue triangle).
  "Czechia":             "from-blue-950 via-sky-900 to-rose-900",
  "Czech Republic":      "from-blue-950 via-sky-900 to-rose-900",
  "Poland":              "from-stone-800 via-red-900 to-rose-900",
  "Hungary":             "from-red-900 via-stone-800 to-emerald-900",
  "Romania":             "from-blue-900 via-amber-900 to-red-900",
  "Bulgaria":            "from-stone-800 via-emerald-900 to-red-900",
  // Croatia: red+white+blue checkerboard — wine + slate so it stops
  //           reading like AU/NZ.
  "Croatia":             "from-rose-950 via-zinc-800 to-blue-900",
  "Lithuania":           "from-amber-900 via-emerald-900 to-red-900",
  "Latvia":              "from-rose-950 via-stone-900 to-rose-950",
  // Slovakia: tricolor white/blue/red — rose + slate + indigo so it
  //           visually echoes the flag's stripes order.
  "Slovakia":            "from-rose-900 via-slate-800 to-indigo-900",
  "Estonia":             "from-blue-900 via-slate-900 to-stone-800",
  "Greece":              "from-blue-900 via-cyan-900 to-blue-950",
  "Portugal":            "from-emerald-900 via-emerald-800 to-red-900",
  // Russia: was duplicate blue→stone→rose. Now wine-and-gold
  //          (Imperial colors) + slate — distinct from AU/US/FR.
  "Russia":              "from-rose-950 via-stone-900 to-amber-900",
  "Ukraine":             "from-blue-900 via-sky-700 to-amber-700",
  // EU: stars-on-blue — pure deep blue, no rose tail (that's the
  //     unique signature; nothing else is blue→blue).
  "EU":                  "from-blue-950 via-blue-900 to-blue-800",
  "European Union":      "from-blue-950 via-blue-900 to-blue-800",
  // ─── East Asia ─────────────────────────────────────────────────
  "China":               "from-red-900 via-red-800 to-amber-800",
  // Japan: wine + ink + sun — rising-sun warmth.
  "Japan":               "from-rose-950 via-stone-900 to-rose-900",
  // South Korea: indigo + coral — distinct from CZ/FR. Trigrams
  //              hint via warm coral on dark blue (the taegeuk).
  "South Korea":         "from-indigo-950 via-blue-900 to-orange-800",
  "Taiwan":              "from-red-900 via-blue-900 to-blue-800",
  // Hong Kong: bauhinia red + harbour neon teal.
  "Hong Kong":           "from-red-900 via-rose-900 to-teal-900",
  "Macau":               "from-emerald-900 via-emerald-800 to-emerald-900",
  // ─── Southeast Asia & Oceania ─────────────────────────────────
  // Singapore: red+white crescent, harbour at night.
  "Singapore":           "from-red-900 via-rose-900 to-slate-900",
  "Malaysia":            "from-blue-900 via-amber-900 to-red-900",
  "Indonesia":           "from-red-900 via-red-800 to-stone-800",
  "Thailand":            "from-red-900 via-blue-900 to-red-900",
  "Vietnam":             "from-red-900 via-red-800 to-amber-800",
  "Philippines":         "from-blue-900 via-red-900 to-amber-700",
  "Brunei":              "from-amber-900 via-stone-800 to-zinc-900",
  // Australia: deep teal + sunburnt ochre — Great Barrier Reef +
  //            outback. Was a duplicate blue→rose; now visually
  //            unmistakable as Southern Hemisphere.
  "Australia":           "from-teal-900 via-cyan-900 to-orange-800",
  // New Zealand: forest green + silver — silver-fern country.
  "New Zealand":         "from-emerald-950 via-emerald-900 to-slate-700",
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
// Tight aliases for tight cells (card country band, chips). Long
// official names like "United Kingdom" / "United Arab Emirates" /
// "Czech Republic" get truncated mid-word ("United Ki…") inside narrow
// containers; mapping them to recognisable short forms preserves
// meaning without ellipsis. Only high-frequency hosts and obvious
// abbreviations — anything else passes through unchanged so we don't
// invent labels.
const TIGHT_ALIASES: Record<string, string> = {
  "United Kingdom":         "UK",
  "United States":          "USA",
  "United States of America": "USA",
  "United Arab Emirates":   "UAE",
  "New Zealand":            "NZ",
  "South Korea":            "S. Korea",
  "South Africa":           "S. Africa",
  "Czech Republic":         "Czechia",
  "Russian Federation":     "Russia",
  "Republic of Ireland":    "Ireland",
  "Hong Kong SAR":          "Hong Kong",
  "Saudi Arabia":           "Saudi Arabia",
  "European Union":         "EU",
  "European Economic Area": "EEA",
  "Dominican Republic":     "Dominican Rep.",
};

export const shortCountry = (country: string, opts?: { tight?: boolean }): string => {
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
  if (opts?.tight && TIGHT_ALIASES[c]) return TIGHT_ALIASES[c];
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
