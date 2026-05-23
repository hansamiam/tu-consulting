/**
 * Single source of truth for known scholarship-aggregator hostnames.
 *
 * Before this module existed there were THREE inline domain lists:
 *   - public.is_aggregator_url() Postgres function (8 domains)
 *   - canonical-extract/index.ts AGGREGATOR_DOMAINS (8 domains)
 *   - verify-scholarship/index.ts AGGREGATOR_HOSTS (25 domains, added 2026-05-23)
 *   - discover-from-hub-backfill/index.ts OFFICIAL_URL_REJECT_PATTERNS
 *
 * They drifted. The Postgres function and canonical-extract kept matching
 * each other (8 stale entries) while the gate-backfill regex grew to 13+
 * and verify-scholarship's list grew to 25. Result: canonical-extract
 * silently wrote iefa.org / fastweb.com URLs into scholarships.canonical_official_url
 * because its 8-domain list didn't recognize them as aggregators — then the
 * G3b gate (which uses the broader regex) correctly rejected those rows,
 * but the data was already poisoned.
 *
 * Update this file when adding aggregator hostnames. ALSO update the
 * Postgres function `public.is_aggregator_url(text)` in a new migration
 * (see 20260523000000_expand_is_aggregator_url_domains.sql for the
 * pattern). The two stay in sync because they're both consulted —
 * Postgres for SQL gate evaluation, this file for edge-function checks.
 *
 * To minimize sync drift: each addition should mention WHY (which row
 * the LLM found polluting the catalog) so we can audit later.
 */

export const AGGREGATOR_HOSTS: ReadonlyArray<string> = [
  // Original 8 — covered in the legacy Postgres function
  "scholars4dev.com",
  "opportunitiesforyouth.org",
  "opportunitiestracker.ug",
  "opportunitydesk.org",
  "scholarshipsdb.net",
  "scholarship-positions.com",
  "after12.in",
  "buddy4study.com",
  // Added 2026-05-23 after audit found 16 catalog rows with these as official_url
  "opportunitiesforafricans.com",
  "scholarshippanda.com",
  "iefa.org",            // International Education Financial Aid (polluted 7+ catalog rows)
  "mladiinfo.eu",
  "profellow.com",
  "fastweb.com",         // polluted Colonel Aaron Burgstein Memorial Scholarship + others
  "scholarshipportal.com",
  "scholarshipsads.com",
  "opportunitiescorner.info",
  "afterschoolafrica.com",
  "topuniversities.com",
  "studyportals.com",
  "iie.org",
  // Added 2026-05-23 from broader audit / extra Postgres function additions
  "erudera.com",
  "studyabroad.com",
  "opportunitiesforinternationalstudents.com",
  "studyabroadaid.com",
  // 2026-05-06 variant of opportunitiestracker.ug — wrong-domain seed that was
  // later corrected (see migration 20260522210000) but the row still lives in
  // scholarship_sources as the wrong-domain entry. Treat the variant as an
  // aggregator so we don't accidentally re-promote it.
  "opportunitytracker.ug",
];

/**
 * Returns true if the URL's hostname is a known aggregator.
 * Strips leading "www." and matches both root and subdomain.
 * Returns false for null/empty/malformed URLs (fail-open is safer here
 * than fail-closed — a malformed URL fails G3 anyway).
 */
export function isAggregatorHostname(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return AGGREGATOR_HOSTS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}
