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
 */

export const REGIONAL_ACCENT: Record<string, string> = {
  // North America
  "United States":  "from-rose-600 to-orange-600",
  "USA":            "from-rose-600 to-orange-600",
  "Canada":         "from-red-600 to-rose-700",
  "Mexico":         "from-orange-600 to-rose-700",
  // UK & Ireland
  "United Kingdom": "from-violet-700 to-indigo-700",
  "UK":             "from-violet-700 to-indigo-700",
  "Ireland":        "from-emerald-700 to-teal-700",
  // Continental Europe
  "Germany":        "from-slate-700 to-zinc-800",
  "France":         "from-blue-700 to-indigo-700",
  "Netherlands":    "from-orange-600 to-amber-600",
  "Switzerland":    "from-rose-700 to-red-700",
  "Sweden":         "from-blue-600 to-cyan-700",
  "Norway":         "from-blue-700 to-sky-700",
  "Denmark":        "from-red-700 to-rose-700",
  "Finland":        "from-blue-600 to-sky-700",
  "Iceland":        "from-cyan-700 to-blue-700",
  "Spain":          "from-yellow-600 to-red-700",
  "Italy":          "from-emerald-600 to-red-700",
  "Belgium":        "from-amber-600 to-yellow-700",
  "Austria":        "from-red-600 to-rose-700",
  "Czechia":        "from-blue-700 to-red-700",
  "Poland":         "from-rose-700 to-red-700",
  "Hungary":        "from-emerald-600 to-red-700",
  "Romania":        "from-blue-700 to-yellow-600",
  "Bulgaria":       "from-emerald-600 to-red-700",
  "Croatia":        "from-blue-700 to-red-700",
  "Lithuania":      "from-yellow-600 to-emerald-700",
  "Latvia":         "from-red-700 to-rose-700",
  "Slovakia":       "from-blue-700 to-red-700",
  "Estonia":        "from-blue-700 to-slate-700",
  "EU":             "from-blue-700 to-indigo-700",
  // East Asia
  "China":          "from-rose-700 to-amber-600",
  "Japan":          "from-rose-600 to-pink-600",
  "Korea":          "from-blue-700 to-rose-700",
  "South Korea":    "from-blue-700 to-rose-700",
  "Taiwan":         "from-rose-700 to-blue-700",
  "Hong Kong":      "from-rose-600 to-emerald-700",
  // Southeast Asia & Oceania
  "Singapore":      "from-rose-700 to-pink-700",
  "Malaysia":       "from-amber-600 to-blue-700",
  "Indonesia":      "from-rose-700 to-emerald-700",
  "Thailand":       "from-rose-700 to-blue-700",
  "Vietnam":        "from-rose-700 to-yellow-600",
  "Philippines":    "from-blue-700 to-rose-700",
  "Brunei":         "from-yellow-600 to-rose-700",
  "Australia":      "from-blue-700 to-amber-600",
  "New Zealand":    "from-blue-700 to-emerald-700",
  // South Asia & Middle East
  "India":          "from-orange-600 to-emerald-700",
  "Saudi Arabia":   "from-emerald-700 to-teal-700",
  "UAE":            "from-emerald-700 to-amber-600",
  "Israel":         "from-blue-700 to-cyan-700",
  "Turkey":         "from-rose-700 to-red-800",
  "Egypt":          "from-amber-600 to-rose-700",
  // Latin America
  "Brazil":         "from-emerald-700 to-yellow-600",
  "Argentina":      "from-sky-600 to-blue-700",
  "Chile":          "from-rose-700 to-blue-700",
  // Multi/global
  "Global":         "from-indigo-700 to-purple-700",
  "Multiple":       "from-indigo-700 to-purple-700",
};

export const DEFAULT_ACCENT = "from-slate-700 to-zinc-700";

export const accentForCountry = (country: string | null | undefined): string =>
  (country && REGIONAL_ACCENT[country]) || DEFAULT_ACCENT;

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

/* Canonical country bucket for filter dropdowns. Collapses every variant
 * of "Multiple (Japan, ...)", "Multiple (Worldwide)", "Global", "International"
 * to one "Multiple countries" entry. Filtering against the canonical form
 * lets one dropdown selection match every variant. */
export const canonicalCountry = (country: string): string => {
  const c = country.trim();
  if (/^multiple/i.test(c)) return "Multiple countries";
  if (/^global$/i.test(c) || /^international$/i.test(c) || /^worldwide$/i.test(c)) return "Multiple countries";
  return c;
};
