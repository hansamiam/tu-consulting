// Account — round-31 consolidation: Workspace is now the single user
// dashboard, hosting tracker + calendar + essays + membership
// settings + sign-out under one roof. /account is kept as a thin
// route that handles the post-Stripe / email-link query params
// (?subscribed=1, ?action=pause-nudges) for backwards compatibility
// with existing emails and Stripe redirect URLs, then forwards to
// /pipeline where the actual dashboard lives.
//
// Why redirect rather than 404: a few external surfaces (Stripe
// success URL, weekly-nudge unsubscribe email) still link to
// /account; we can't update every email already in someone's inbox.
// This shim absorbs them, fires the side effect, then drops the
// user on the unified Workspace.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AccountProps { language?: "en" | "ru"; }

const Account = ({ language = "en" }: AccountProps) => {
  const ru = language === "ru";
  const navigate = useNavigate();
  const { user, loading, refreshSubscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const pipelinePath = ru ? "/pipeline/ru" : "/pipeline";
  const homePath = ru ? "/ru" : "/";

  // Auth gate: if the user isn't signed in, prompt sign-in. /account
  // links from billing or email both assume an authed user; without
  // it we can't perform the side effect.
  useEffect(() => {
    if (!loading && !user) setAuthOpen(true);
  }, [loading, user]);

  // Side-effect + redirect. Runs once auth is settled and a user
  // exists. Three URL-param paths are handled before the redirect:
  //   1. ?subscribed=1 — Stripe success URL. Confirm subscription
  //      with check-subscription, refresh local context, toast.
  //   2. ?action=pause-nudges — weekly-nudge unsubscribe link from
  //      email. Toggle nudge_opt_out=true, toast.
  //   3. neither — just refresh the subscription and forward.
  // After all paths, navigate to /pipeline replacing history so
  // back-button doesn't loop.
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const justSubscribed = params.get("subscribed") === "1";
      const action = params.get("action");

      if (action === "pause-nudges") {
        const { error } = await supabase
          .from("student_profiles")
          .update({ nudge_opt_out: true })
          .eq("user_id", user.id);
        if (cancelled) return;
        if (error) {
          toast.error(ru ? "Не удалось обновить настройки. Попробуйте снова." : "Couldn't update nudge preference. Try again.");
        } else {
          toast.success(ru
            ? "Еженедельные напоминания на паузе. Включите снова в Workspace."
            : "Weekly nudges paused. Re-enable any time in Workspace.");
        }
      } else if (justSubscribed) {
        // Webhook can race the redirect — retry up to 3× with a
        // short backoff so the user lands on Workspace already
        // showing their new tier rather than a stale "Free".
        for (let i = 0; i < 3; i++) {
          if (cancelled) return;
          try {
            await supabase.functions.invoke("check-subscription");
            await refreshSubscription();
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
        if (cancelled) return;
        toast.success(ru
          ? "Добро пожаловать! Ваше членство активно."
          : "Welcome aboard! Your membership is active.");
      } else {
        await refreshSubscription();
      }

      if (cancelled) return;
      navigate(pipelinePath, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [loading, user, refreshSubscription, navigate, pipelinePath, ru]);

  // Auth-required state: user dismissed the AuthDialog without signing in.
  if (!loading && !user && !authOpen) {
    // Send them home rather than parking on a stuck loader.
    navigate(homePath, { replace: true });
    return null;
  }

  // Loading shim — minimal so the redirect feels instant. The
  // side-effect await above is what gates the navigate; this is just
  // the visual placeholder while it runs.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        {ru ? "Открываем вашу рабочую зону…" : "Opening your workspace…"}
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
};

export default Account;
