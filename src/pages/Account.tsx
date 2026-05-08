// Account — round-34 reset. Keeps account separate from Workspace
// (after the round-31 merge attempt felt cramped). Tight focused
// page: subscription, weekly nudges, sign out. Nothing else.
//
// Tracker stats / pipeline preview / documents / quick links — all
// retired here. Workspace owns those surfaces; this page is for
// settings only. Stripe success URLs (/account?subscribed=1) and
// weekly-nudge unsubscribe email links (/account?action=pause-nudges)
// still land here and run their side effects before the page renders.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { MembershipSettings } from "@/components/pipeline/MembershipSettings";
import { ProfileSettingsCard } from "@/components/account/ProfileSettingsCard";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AccountProps { language?: "en" | "ru"; }

const Account = ({ language = "en" }: AccountProps) => {
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const navigate = useNavigate();
  const { user, loading, refreshSubscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!loading && !user) setAuthOpen(true);
  }, [loading, user]);

  // Side effects from URL params (Stripe success, email-link
  // unsubscribe). Same as round-31 redirect-shim, but the page now
  // stays here rather than forwarding to Workspace.
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
          toast.error(t("Couldn't update nudge preference. Try again.", "Не удалось обновить настройки. Попробуйте снова."));
        } else {
          toast.success(t("Weekly nudges paused. Re-enable any time below.", "Еженедельные напоминания на паузе. Включите ниже когда захотите."));
        }
        window.history.replaceState({}, "", ru ? "/account/ru" : "/account");
      } else if (justSubscribed) {
        // Webhook can race the redirect — retry up to 5× until the
        // subscription actually flips to active in our DB. The earlier
        // "break on first invoke success" exited even when the DB hadn't
        // caught up yet, so the user landed on /account?subscribed=1
        // still labelled as free for a few seconds, which felt broken
        // ("did my payment go through?").
        let active = false;
        for (let i = 0; i < 5; i++) {
          if (cancelled) return;
          try {
            await supabase.functions.invoke("check-subscription");
            await refreshSubscription();
            // refreshSubscription updates the AuthContext state on
            // next render — read the latest from the DB directly so we
            // don't gate on stale React state inside this loop.
            const { data: u } = await supabase.auth.getUser();
            if (u.user?.id) {
              const { data: sub } = await supabase
                .from("subscriptions")
                .select("status, tier")
                .eq("user_id", u.user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (sub && ["active", "trialing"].includes(sub.status as string) && ["pro", "founding"].includes(sub.tier as string)) {
                active = true;
                break;
              }
            }
          } catch { /* network blip — retry */ }
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (cancelled) return;
        toast.success(active
          ? t("Welcome aboard! Your membership is active.", "Добро пожаловать! Ваше членство активно.")
          : t("Payment received. Your membership is being activated — give it a moment.", "Платёж получен. Подписка активируется — подождите немного."));
        window.history.replaceState({}, "", ru ? "/account/ru" : "/account");
      } else {
        await refreshSubscription();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
        <div className="max-w-md mx-auto px-5 py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-3">
            {t("Sign in to view your account", "Войдите, чтобы открыть аккаунт")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t("Membership and settings are only visible when signed in.", "Подписка и настройки доступны только после входа.")}
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-gold text-primary font-semibold hover:bg-gold-light transition"
          >
            {t("Sign in", "Войти")}
          </button>
        </div>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} language={language} />
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-6">
        <header>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-2">
            {t("Account", "Аккаунт")}
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("Membership & settings", "Подписка и настройки")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "Your application work lives in Workspace. This page is just for billing and settings.",
              "Работа над заявками — в Рабочей зоне. Здесь только подписка и настройки.",
            )}
          </p>
        </header>

        <ProfileSettingsCard language={language} />

        <MembershipSettings language={language} variant="standalone" />

        <button
          onClick={() => navigate(ru ? "/pipeline/ru" : "/pipeline")}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          ← {t("Back to Workspace", "В Рабочую зону")}
        </button>
      </main>
      <Footer language={language} />
    </div>
  );
};

export default Account;
