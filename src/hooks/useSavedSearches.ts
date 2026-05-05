/**
 * useSavedSearches — authed-only CRUD for saved Discover searches.
 *
 * The cron (saved-searches-cron) re-runs each saved search daily and
 * emails matches added since last_alert_at. Anon users get a friendly
 * empty state telling them to sign in; we don't bother mirroring to
 * localStorage because the value of the feature IS the email loop,
 * which only works for authed users with a verified email.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  alert_enabled: boolean;
  last_alert_at: string | null;
  created_at: string;
}

export function useSavedSearches() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSearches([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_searches")
      .select("id, name, filters, alert_enabled, last_alert_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.warn("[saved_searches] fetch failed", error.message);
      return;
    }
    setSearches((data as SavedSearch[]) ?? []);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: { name: string; filters: Record<string, unknown>; alertEnabled: boolean }) => {
      if (!user?.id) throw new Error("Sign in to save searches");
      const { data, error } = await supabase
        .from("saved_searches")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          filters: input.filters,
          alert_enabled: input.alertEnabled,
        })
        .select("id, name, filters, alert_enabled, last_alert_at, created_at")
        .single();
      if (error) throw error;
      setSearches((prev) => [data as SavedSearch, ...prev]);
      return data as SavedSearch;
    },
    [user?.id],
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("saved_searches").delete().eq("id", id);
    if (error) throw error;
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const setAlertEnabled = useCallback(async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("saved_searches")
      .update({ alert_enabled: enabled })
      .eq("id", id);
    if (error) throw error;
    setSearches((prev) => prev.map((s) => (s.id === id ? { ...s, alert_enabled: enabled } : s)));
  }, []);

  return {
    searches,
    loading,
    isAuthed: !!user?.id,
    create,
    remove,
    setAlertEnabled,
    refresh,
  };
}
