/**
 * Premium-tier scholarship list — the hand-curated set of high-value
 * scholarships that receive richer deep-dive grounding. For these,
 * the scholarship-deep-dive edge function calls Tavily for third-
 * party article context in addition to the official URL Firecrawl
 * + Path A backfilled fields.
 *
 * Selection criterion: scholarships where (a) prestige + competition
 * justifies extra inference cost, (b) third-party "how to win"
 * advice exists in volume online, and (c) members research these
 * most before applying. Expand cautiously — each entry adds ~2-3s
 * to first-gen latency for that scholarship's bucket cells.
 *
 * Matching is slug-based, checking both `provider_name` and
 * `scholarship_name` (the provider field is sometimes a generic
 * issuer like "U.S. Department of State" while the name field
 * carries the brand).
 *
 * Admin override without redeploy: set the
 * PREMIUM_SCHOLARSHIP_SLUGS_OVERRIDE env var to a JSON array of
 * additional or replacement slugs. The override REPLACES the
 * default list — to extend, set the array to your superset.
 */

const DEFAULT_PREMIUM_SLUGS = new Set<string>([
  "chevening",
  "fulbright",
  "stipendium-hungaricum",
  "erasmus-mundus",
  "rhodes-trust",
  "daad",
  "mext",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveRuntimeSlugs(): Set<string> {
  try {
    const raw = Deno.env.get("PREMIUM_SCHOLARSHIP_SLUGS_OVERRIDE");
    if (!raw) return DEFAULT_PREMIUM_SLUGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_PREMIUM_SLUGS;
    }
    return new Set(parsed.map((s) => slugify(String(s))));
  } catch {
    return DEFAULT_PREMIUM_SLUGS;
  }
}

const RUNTIME_SLUGS = resolveRuntimeSlugs();

export function isPremium(scholarship: {
  provider_name?: string | null;
  scholarship_name?: string | null;
}): boolean {
  const provider = slugify(scholarship.provider_name ?? "");
  if (provider && RUNTIME_SLUGS.has(provider)) return true;

  const name = slugify(scholarship.scholarship_name ?? "");
  for (const slug of RUNTIME_SLUGS) {
    if (name.includes(slug)) return true;
  }
  return false;
}

export { DEFAULT_PREMIUM_SLUGS };
