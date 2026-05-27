/* useInferredCountry — IP-derived country guess for cold visitors.
 *
 * Cold-visitor problem: a user lands on /discover with no profile, so
 * scoreScholarship can only rank by funding + selectivity + popularity.
 * Country-match (+15 for citizenship-targeted programs) is the strongest
 * single boost; without it the hero + Selections row is generic.
 *
 * Pragmatic fix: ask Vercel's edge for the visitor's IP-derived country
 * once per session (7-day localStorage cache), and use it as a SOFT
 * profile placeholder. Always shown via a disclosure pill — the user
 * sees "Showing matches for 🇰🇿 Kazakhstan · change" and can swap.
 *
 * Trust level: country_source === "ip" means the score function should
 * apply the +15 / +7 *positive* boosts but skip the -40 not-eligible
 * penalty (a Kazakh student browsing from a UK IP would otherwise be
 * told Commonwealth scholarships aren't for them — wrong). See
 * src/pages/Discover.tsx scoreScholarship for the gate.
 */
import { useEffect, useState } from "react";
import { isoToCountry } from "@/lib/iso-country";

const STORAGE_KEY = "topuni_inferred_country_v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  iso: string | null;
  name: string | null;
  flag: string | null;
  ts: number;
}

export interface InferredCountry {
  name: string | null;
  flag: string | null;
  iso: string | null;
  /** True while the fetch is in flight on first load. */
  loading: boolean;
}

const readCache = (): CacheEntry | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (entry: CacheEntry) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Quota / private mode — fall through, we'll just re-fetch next visit.
  }
};

export const useInferredCountry = (): InferredCountry => {
  const [state, setState] = useState<InferredCountry>(() => {
    const cached = readCache();
    if (cached) return { name: cached.name, flag: cached.flag, iso: cached.iso, loading: false };
    return { name: null, flag: null, iso: null, loading: true };
  });

  useEffect(() => {
    if (!state.loading) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/geo", { credentials: "omit" });
        if (!res.ok) throw new Error(`geo ${res.status}`);
        const { country: iso } = (await res.json()) as { country: string | null };
        const lookup = isoToCountry(iso);
        const entry: CacheEntry = {
          iso: iso ?? null,
          name: lookup?.name ?? null,
          flag: lookup?.flag ?? null,
          ts: Date.now(),
        };
        writeCache(entry);
        if (!cancelled) setState({ name: entry.name, flag: entry.flag, iso: entry.iso, loading: false });
      } catch {
        // Network blip / dev-server with no /api route — fail soft.
        // The cold-visitor experience falls back to no country boost,
        // which is the prior behaviour, not a regression.
        if (!cancelled) setState({ name: null, flag: null, iso: null, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [state.loading]);

  return state;
};
