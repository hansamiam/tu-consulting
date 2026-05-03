import { useCallback, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useScholarshipTracking — fire-and-forget event tracker for the
 * Activity & Signal Engine.
 *
 * Every meaningful interaction (view, save, dismiss, click, share) becomes
 * a row in public.scholarship_events via the track_scholarship_event RPC.
 * Anon visitors are tracked via a stable localStorage UUID; authed users
 * are tracked by user_id (the RPC reads auth.uid() server-side, so we
 * don't pass it from the client).
 *
 * Privacy: we do not store IP, fingerprint, or PII. The anonymous_id is a
 * random UUID minted on first visit and stored only in localStorage.
 *
 * Usage:
 *   const track = useScholarshipTracking();
 *   useEffect(() => { track(scholarshipId, "viewed", "detail"); }, [scholarshipId]);
 *
 * Dedup: per-(scholarshipId × event_type × source) we suppress repeats
 * within a 60-second window via an in-memory ref. Prevents StrictMode
 * double-mount and rapid re-renders from inflating counts.
 */

const ANON_KEY = "topuni-anon-id-v1";
const DEDUP_WINDOW_MS = 60_000;

function getOrMintAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    // crypto.randomUUID is widely supported; fall back to a manual UUID v4
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : "anon-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
    localStorage.setItem(ANON_KEY, id);
    return id;
  } catch {
    return "";
  }
}

export type ScholarshipEventType = "viewed" | "saved" | "unsaved" | "dismissed" | "clicked" | "shared" | "applied";

export function useScholarshipTracking() {
  const anonId = useMemo(getOrMintAnonymousId, []);
  const dedupRef = useRef<Map<string, number>>(new Map());

  const track = useCallback(
    (scholarshipId: string, eventType: ScholarshipEventType, source?: string, context?: Record<string, unknown>) => {
      if (!scholarshipId) return;
      const key = `${scholarshipId}:${eventType}:${source ?? ""}`;
      const last = dedupRef.current.get(key) ?? 0;
      const now = Date.now();
      if (now - last < DEDUP_WINDOW_MS) return; // dedup window
      dedupRef.current.set(key, now);

      // Fire-and-forget; we never block UI on this. Errors are intentionally
      // swallowed — failed analytics should not break the user's flow.
      supabase
        .rpc("track_scholarship_event", {
          p_scholarship_id: scholarshipId,
          p_event_type: eventType,
          p_anonymous_id: anonId || null,
          p_source: source || null,
          p_context: context ? (context as unknown as never) : null,
        })
        .then(({ error }) => {
          if (error && typeof console !== "undefined") {
            // Don't toast — user shouldn't see analytics noise. Log for ops.
            console.warn("[track]", error.message);
          }
        });
    },
    [anonId],
  );

  return track;
}

/**
 * Convenience hook: auto-tracks a 'viewed' event on mount for a single
 * scholarship. Use on detail pages.
 */
export function useTrackView(scholarshipId: string | null | undefined, source = "detail") {
  const track = useScholarshipTracking();
  useEffect(() => {
    if (!scholarshipId) return;
    track(scholarshipId, "viewed", source);
  }, [scholarshipId, source, track]);
}
