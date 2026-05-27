/* ISO 3166-1 alpha-2 ↔ display-country helpers.
 *
 * Vercel's geolocation header (x-vercel-ip-country) returns ISO codes
 * like "KZ" / "US" / "DE". Our matcher (matchesNationality) and our
 * UI (the wizard, the disclosure pill) work with country *names*
 * ("Kazakhstan", "United States", "Germany"). Bridging the two without
 * shipping a 200-row name table is done by decoding the flag emoji
 * already present on every row in src/data/countries.ts — each flag
 * is two regional-indicator code points that correspond to the ISO
 * alpha-2 letters of the country.
 *
 *   🇰🇿 = U+1F1F0 (K) + U+1F1FF (Z) = "KZ" = Kazakhstan
 */
import { ALL_COUNTRIES } from "@/data/countries";

const REGIONAL_INDICATOR_BASE = 0x1f1e6; // U+1F1E6 = regional indicator "A"

/** Convert a flag emoji like "🇰🇿" to its ISO 3166-1 alpha-2 code "KZ".
 *  Returns null if the input isn't a well-formed flag emoji. */
const flagToIso = (flag: string | undefined | null): string | null => {
  if (!flag) return null;
  const chars = Array.from(flag);
  if (chars.length !== 2) return null;
  const cps = chars.map(c => c.codePointAt(0) ?? 0);
  if (cps.some(cp => cp < REGIONAL_INDICATOR_BASE || cp > REGIONAL_INDICATOR_BASE + 25)) return null;
  return cps.map(cp => String.fromCharCode(0x41 + (cp - REGIONAL_INDICATOR_BASE))).join("");
};

let cachedIsoIndex: Map<string, { name: string; flag: string }> | null = null;
const isoIndex = (): Map<string, { name: string; flag: string }> => {
  if (cachedIsoIndex) return cachedIsoIndex;
  const m = new Map<string, { name: string; flag: string }>();
  for (const c of ALL_COUNTRIES) {
    const iso = flagToIso(c.f);
    if (iso) m.set(iso, { name: c.v, flag: c.f });
  }
  cachedIsoIndex = m;
  return m;
};

/** "KZ" → { name: "Kazakhstan", flag: "🇰🇿" }. Returns null when the
 *  ISO code isn't represented in the app's country list. */
export const isoToCountry = (iso: string | null | undefined): { name: string; flag: string } | null => {
  if (!iso) return null;
  return isoIndex().get(iso.toUpperCase()) ?? null;
};
