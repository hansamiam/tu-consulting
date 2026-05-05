/**
 * useSemanticScholarshipMatch
 *
 * Calls the match-scholarships edge function once per profile change
 * and exposes a Map<scholarship_id, similarity> the calling component
 * can blend into its own ranking. Returns immediately with `enabled=false`
 * if the profile lacks the minimal fields needed for a meaningful query
 * (no field of study, no target countries, no degree).
 *
 * The hook is deliberately a leaf: it never throws, soft-fails to a
 * disabled state if the endpoint is unreachable or no embeddings exist
 * yet (cold-start). The catalog still ranks via the client heuristic;
 * the similarity score just doesn't blend in.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MatchProfile {
  field?: string;
  major?: string;
  targetCountries?: string[];
  degree?: string;          // 'bachelor' | 'master' | 'phd'
  interests?: string;
  nationality?: string;
  gpa?: number | string;
  ielts?: number | string;
  toefl?: number | string;
  sat?: number | string;
}

export interface SemanticMatch {
  scholarship_id: string;
  similarity: number;             // [0, 1]; higher = more relevant
  passes_eligibility: boolean;
}

interface State {
  enabled: boolean;
  loading: boolean;
  matches: Map<string, SemanticMatch>;
  error: string | null;
  fetchedAt: number | null;
}

const isMeaningful = (p: MatchProfile): boolean => {
  const field = (p.field || p.major || "").trim();
  const tc = (p.targetCountries || []).filter(Boolean);
  const degree = (p.degree || "").trim();
  return field.length > 1 || tc.length > 0 || degree.length > 1;
};

const numOrNull = (v: number | string | undefined): number | null =>
  typeof v === "number" ? v : (parseFloat(String(v || "")) || null);

/* Stable key for the profile so we don't re-fetch on cosmetic re-renders */
const profileKey = (p: MatchProfile): string =>
  JSON.stringify({
    f: (p.field || p.major || "").trim().toLowerCase(),
    c: (p.targetCountries || []).map((s) => s.toLowerCase()).sort(),
    d: (p.degree || "").trim().toLowerCase(),
    i: (p.interests || "").trim().toLowerCase().slice(0, 200),
    n: (p.nationality || "").trim().toLowerCase(),
    g: numOrNull(p.gpa),
    e: numOrNull(p.ielts),
    t: numOrNull(p.toefl),
    s: numOrNull(p.sat),
  });

export function useSemanticScholarshipMatch(profile: MatchProfile, opts?: { limit?: number }): State {
  const [state, setState] = useState<State>({
    enabled: false,
    loading: false,
    matches: new Map(),
    error: null,
    fetchedAt: null,
  });
  // Avoid re-fetching for the same logical profile (function fns return
  // new object refs on every render).
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    const enabled = isMeaningful(profile);
    if (!enabled) {
      setState((s) => ({ ...s, enabled: false, loading: false, matches: new Map() }));
      return;
    }
    const key = profileKey(profile);
    if (key === lastKeyRef.current) return; // already fetched for this profile
    lastKeyRef.current = key;

    let cancelled = false;
    setState((s) => ({ ...s, enabled: true, loading: true, error: null }));

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke<{
          matches: SemanticMatch[];
          query_used: string;
          duration_ms: number;
        }>("match-scholarships", {
          body: {
            profile: {
              field: profile.field || profile.major,
              major: profile.major,
              targetCountries: profile.targetCountries,
              degree: profile.degree,
              interests: profile.interests,
            },
            filters: {
              nationality: profile.nationality,
              min_gpa: numOrNull(profile.gpa) ?? undefined,
              min_ielts: numOrNull(profile.ielts) ?? undefined,
              min_toefl: numOrNull(profile.toefl) ?? undefined,
              min_sat: numOrNull(profile.sat) ?? undefined,
              degree_level: profile.degree,
            },
            limit: Math.min(Math.max(opts?.limit ?? 50, 5), 100),
          },
        });
        if (cancelled) return;
        if (error) {
          // Soft-fail: leave enabled but match map empty so heuristic scoring still runs
          setState({ enabled: true, loading: false, matches: new Map(), error: error.message, fetchedAt: Date.now() });
          return;
        }
        const map = new Map<string, SemanticMatch>();
        for (const m of data?.matches ?? []) map.set(m.scholarship_id, m);
        setState({ enabled: true, loading: false, matches: map, error: null, fetchedAt: Date.now() });
      } catch (e) {
        if (cancelled) return;
        setState({
          enabled: true,
          loading: false,
          matches: new Map(),
          error: e instanceof Error ? e.message : String(e),
          fetchedAt: Date.now(),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally key the effect on the stringified profile so
    // identity-only changes don't refire the network call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey(profile), opts?.limit]);

  return state;
}
