/**
 * useUserArchetype — returns the user's archetype id, used to key the
 * (scholarship × archetype) insight matrix.
 *
 * Resolution order:
 *   1. archetype_assignments table (only populated for briefs generated
 *      AFTER the 2026-05-25 telemetry write was added — i.e. NOT
 *      backfilled for the user's prior briefs).
 *   2. Fallback: re-run the deterministic detector client-side against
 *      the user's stored DiscoverProfile. This covers existing users
 *      whose archetype was assigned before the telemetry table existed.
 *      The detector is pure (no env, no Deno globals) so importing it
 *      from supabase/functions/_shared works in the browser bundle.
 *
 * Returns null only when neither source produces an archetype — i.e.
 * the user has no profile at all.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredProfile } from "@/components/discover/DiscoverProfileGate";
import { detectArchetypeOrFallback } from "../../supabase/functions/_shared/archetype-library";

export function useUserArchetype(): string | null {
  const { user } = useAuth();
  const [archetypeId, setArchetypeId] = useState<string | null>(() => fallbackFromStoredProfile());

  useEffect(() => {
    // Always seed from the local detector first so a logged-in user
    // with a profile gets an immediate archetype, even before the
    // network round-trip finishes.
    setArchetypeId(fallbackFromStoredProfile());

    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("archetype_assignments" as never)
        .select("archetype_id, assigned_at")
        .eq("user_id", user.id)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // RLS / network failure — leave the local-detector value in place.
        console.warn("[useUserArchetype] DB read failed; keeping local detector value", error);
        return;
      }
      const fromDb = (data as { archetype_id?: string } | null)?.archetype_id;
      if (fromDb) setArchetypeId(fromDb);
      // Else keep the local-detector value already set above.
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return archetypeId;
}

function fallbackFromStoredProfile(): string | null {
  const p = getStoredProfile();
  if (!p) return null;
  // DiscoverProfile + ArchetypeDetectionInput overlap on the fields the
  // detector actually reads — pass straight through.
  try {
    const match = detectArchetypeOrFallback(p as unknown as Parameters<typeof detectArchetypeOrFallback>[0]);
    return match.id;
  } catch (e) {
    console.warn("[useUserArchetype] local detector failed", e);
    return null;
  }
}
