/* Aggregator domain detection — shared client helper.
 *
 * Mirrors the SQL function public.is_aggregator_url() from migration
 * 20260506200000_aggregator_url_flag.sql. Whenever a scholarship's
 * official_url points at one of these third-party round-up sites
 * (scholars4dev, opportunitiesforyouth, etc.), we suppress / downgrade
 * the "Apply on official site" CTA so we don't pretend the aggregator
 * is the actual provider.
 *
 * Round 32 introduced the check inside Discover.tsx; round 41
 * extracted it here so ScholarshipDetail (the public SEO page) +
 * any other future surface can reuse the same list without
 * duplication. The DB trigger keeps a server-side flag in sync;
 * this helper is for client-side render gating where the flag
 * isn't already on the row. */

const AGGREGATOR_DOMAINS = new Set<string>([
  "scholars4dev.com",
  "opportunitiesforyouth.org",
  "opportunitiestracker.ug",
  "opportunitydesk.org",
  "scholarshipsdb.net",
  "scholarship-positions.com",
  "after12.in",
  "buddy4study.com",
]);

export const domainFor = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export const isAggregatorUrl = (url: string | null | undefined): boolean => {
  const d = domainFor(url);
  if (!d) return false;
  // Direct match + subdomain match (catches news.scholars4dev.com etc.)
  for (const agg of AGGREGATOR_DOMAINS) {
    if (d === agg || d.endsWith(`.${agg}`)) return true;
  }
  return false;
};
