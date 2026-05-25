/**
 * useUserArchetype — reads the current user's most-recent archetype
 * assignment from the archetype_assignments telemetry table.
 *
 * Returns null when:
 *   · user isn't signed in
 *   · user has never generated a brief
 *   · the query errors (we don't want a missing-archetype crash to break Discover)
 *
 * Cached in-memory across renders within a session; refetches when the user
 * signs in/out. The component using this hook gracefully renders nothing
 * when the archetype is null — no fallback / no placeholder spinner.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserArchetype(): string | null {
  const { user } = useAuth();
  const [archetypeId, setArchetypeId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setArchetypeId(null);
      return;
    }
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
        // RLS / network failure — graceful degrade, just don't render.
        console.warn("[useUserArchetype] read failed", error);
        setArchetypeId(null);
        return;
      }
      setArchetypeId((data as { archetype_id?: string } | null)?.archetype_id ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return archetypeId;
}
