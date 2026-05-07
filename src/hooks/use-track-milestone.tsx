// Idempotent milestone tracker. Calls track-milestone edge function once per user+key.
// Shows toast when 5-day Pro trial unlocks.
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const cacheKey = (uid: string, key: string) => `tu_milestone_${uid}_${key}`;

export const useTrackMilestone = () => {
  const { user, refreshSubscription } = useAuth();

  const track = useCallback(
    async (milestone_key: string, metadata?: Record<string, unknown>) => {
      if (!user) return;
      const k = cacheKey(user.id, milestone_key);
      if (localStorage.getItem(k)) return; // already sent locally
      localStorage.setItem(k, String(Date.now()));

      try {
        const { data, error } = await supabase.functions.invoke("track-milestone", {
          body: { milestone_key, metadata: metadata ?? {} },
        });
        if (error) {
          console.warn("[milestone] error:", error);
          // Don't burn the lock if the call failed; let it retry on next action
          localStorage.removeItem(k);
          return;
        }
        if (data?.trial_activated) {
          // Detect language from URL pathname — the hook doesn't get
          // a language prop, but a Russian user on /discover/ru
          // shouldn't see an English unlock celebration toast.
          const isRu = typeof window !== "undefined" &&
            (window.location.pathname.startsWith("/ru") ||
             /\/(?:ru)(?:$|\/)/.test(window.location.pathname));
          toast.success(
            isRu ? "5-дневный Pro-доступ открыт" : "5-day Pro trial unlocked",
            {
              description: isRu
                ? "Полный доступ ко всем премиум-инструментам. Пользуйтесь."
                : "You've earned full access to every premium tool. Enjoy.",
              duration: 8000,
            },
          );
          // Refresh sub state so banners + gates update immediately
          await refreshSubscription();
        }
      } catch (e) {
        console.warn("[milestone] exception:", e);
        localStorage.removeItem(k);
      }
    },
    [user, refreshSubscription],
  );

  return { track };
};
