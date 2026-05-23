// Compute the top-N host countries from a batch of matched scholarship
// rows. Used as the Card 02 fallback when the student didn't pick any
// targetCountries — instead of inventing destinations or falling back
// to broken ["Open"], we recommend the countries where this nationality
// has the most matched-eligible scholarships right now.
//
// Pure function — no DB call. Reads the already-fetched scholarshipRows
// that the pathway computes for every brief request. Cost: zero extra
// queries, ~O(n) over ~25 rows.

interface MinimalScholarshipRow {
  host_country?: string | null;
  // Some scholarship rows carry an array of host countries (multi-
  // country programs like Erasmus Mundus). Count each country once
  // per row to avoid double-weighting consortium programs.
  host_countries?: string[] | null;
}

/** Return the top-N host countries by frequency in the provided rows.
 *  Empty input → empty array (caller should fall back to GLOBAL_DEFAULT). */
export function topCountriesFromScholarships(
  rows: MinimalScholarshipRow[] | null | undefined,
  n = 3,
): string[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const seen = new Set<string>();
    const list = Array.isArray(row.host_countries)
      ? row.host_countries
      : (row.host_country ? [row.host_country] : []);
    for (const raw of list) {
      if (!raw || typeof raw !== "string") continue;
      const country = raw.trim();
      if (!country || seen.has(country)) continue;
      seen.add(country);
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([country]) => country);
}

/** Generic fallback when the matched scholarship set is too thin to
 *  derive a top-N (e.g., zero rows). Top-3 scholarship-volume countries
 *  globally — covers >60% of all study-abroad scholarship volume. */
export const GLOBAL_DEFAULT_COUNTRIES = ["USA", "UK", "Canada"] as const;

/** Convenience helper: returns top-3 from rows or GLOBAL_DEFAULT if rows
 *  are empty or yield fewer than 1 country. Always returns 3 entries. */
export function topCountriesOrDefault(
  rows: MinimalScholarshipRow[] | null | undefined,
): string[] {
  const top = topCountriesFromScholarships(rows, 3);
  if (top.length === 0) return [...GLOBAL_DEFAULT_COUNTRIES];
  // Top-up with GLOBAL_DEFAULT entries we haven't already named, to
  // guarantee 3 total even if rows only contributed 1 or 2.
  for (const c of GLOBAL_DEFAULT_COUNTRIES) {
    if (top.length >= 3) break;
    if (!top.includes(c)) top.push(c);
  }
  return top;
}
