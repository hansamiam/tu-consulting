/* MembershipSettings — round-31 consolidation. Workspace is now the
 * single user dashboard; this card lives at its bottom and surfaces
 * the membership, billing, weekly-nudge toggle, and sign-out
 * affordances that used to live on a separate /account page.
 *
 * Why consolidated: signed-in users were seeing both "Workspace" and
 * "Account" in the nav, with overlapping content. The user said it
 * felt redundant and asked for one section. /account route still
 * works (deep links / billing returns) but is now a thin redirect
 * to /pipeline; the meaningful settings live here. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CancellationSaveDialog } from "@/components/account/CancellationSaveDialog";
import {
  Crown, ExternalLink, Loader2, LogOut, Calendar, Bell, BellOff, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS } from "date-fns/locale";

interface Props {
  language?: "en" | "ru";
}

export const MembershipSettings = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const dateLocale = ru ? ruLocale : enUS;
  const dateOpts = { locale: dateLocale };
  const navigate = useNavigate();
  const { user, subscription, signOut, refreshSubscription } = useAuth();

  const [portalLoading, setPortalLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [profileMeta, setProfileMeta] = useState<{ nudge_opt_out: boolean; last_nudge_sent_at: string | null }>({ nudge_opt_out: false, last_nudge_sent_at: null });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("nudge_opt_out, last_nudge_sent_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfileMeta({
          nudge_opt_out: !!data.nudge_opt_out,
          last_nudge_sent_at: data.last_nudge_sent_at ?? null,
        });
      }
      // Best-effort subscription refresh on mount — covers the case where
      // the user just landed back here from Stripe checkout/portal.
      void refreshSubscription();
    })();
  }, [user?.id, refreshSubscription]);

  if (!user) return null;

  const tier = subscription.tier;
  const tierLabel =
    tier === "founding" ? t("Founding member", "Основатель")
    : tier === "pro"    ? t("Pro member", "Pro участник")
    : t("Free", "Бесплатно");
  const tierBadgeCls =
    tier === "founding" ? "bg-gold/15 text-gold-dark border-gold/35"
    : tier === "pro"    ? "bg-gold/10 text-gold-dark border-gold/25"
    : "bg-muted text-muted-foreground border-border";

  const openPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setPortalLoading(false);
    if (error || !data?.url) { toast.error(t("Couldn't open billing portal. Try again.", "Не удалось открыть портал. Попробуйте снова.")); return; }
    window.open(data.url, "_blank");
  };

  const toggleNudge = async (next: boolean) => {
    setProfileMeta((p) => ({ ...p, nudge_opt_out: !next }));
    const { error } = await supabase
      .from("student_profiles")
      .update({ nudge_opt_out: !next })
      .eq("user_id", user.id);
    if (error) {
      setProfileMeta((p) => ({ ...p, nudge_opt_out: !p.nudge_opt_out }));
      toast.error(t("Couldn't update nudge preference.", "Не удалось обновить настройки."));
    } else {
      toast.success(next
        ? t("Weekly nudges resumed.", "Еженедельные напоминания включены.")
        : t("Weekly nudges paused.", "Еженедельные напоминания на паузе."));
    }
  };

  const homePath = ru ? "/ru" : "/";
  const pricingPath = ru ? "/pricing/ru" : "/pricing";

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-12 sm:pb-16">
      <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-4 tracking-tight">
        {t("Membership & settings", "Подписка и настройки")}
      </h2>

      <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
        {/* Membership card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">
                {t("Membership", "Подписка")}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={tierBadgeCls}>
                  {tier === "founding" && <Crown className="w-3 h-3 mr-1" />}
                  {tierLabel}
                </Badge>
                {subscription.is_founding_member && subscription.founding_member_number && (
                  <span className="text-[11px] text-muted-foreground">
                    #{subscription.founding_member_number} / 100
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-2">{user.email}</p>
            </div>
            {tier === "free" && !subscription.earned_trial_active && (
              <Button size="sm" onClick={() => navigate(pricingPath)} className="gap-1.5 shrink-0">
                {t("Upgrade", "Перейти на Pro")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {subscription.current_period_end && tier !== "free" && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/60">
              <Calendar className="w-3.5 h-3.5" />
              {subscription.cancel_at_period_end ? t("Ends", "Заканчивается") : t("Renews", "Продление")}{" "}
              {format(new Date(subscription.current_period_end), "PPP", dateOpts)}
            </div>
          )}

          {tier !== "free" && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading} className="gap-2">
                {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                {t("Manage billing", "Управление подпиской")}
              </Button>
              {!subscription.cancel_at_period_end && (
                <button
                  onClick={() => setSaveDialogOpen(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                >
                  {t("Cancel subscription", "Отменить подписку")}
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Notifications + sign out */}
        <Card className="p-5 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">
              {t("Settings", "Настройки")}
            </p>
            <div className="flex items-start justify-between gap-3 mt-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {profileMeta.nudge_opt_out
                    ? <BellOff className="w-4 h-4 text-muted-foreground" />
                    : <Bell className="w-4 h-4 text-gold-dark" />}
                  <p className="font-semibold text-sm text-foreground">{t("Weekly nudges", "Еженедельные напоминания")}</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t(
                    "Sundays at 10 UTC, your AI coach reads your tracker state and writes a tight 3-things-this-week check-in.",
                    "По воскресеньям в 10 UTC ваш AI-коуч читает ваш трекер и пишет короткий план «3 вещи на эту неделю».",
                  )}
                </p>
                {profileMeta.last_nudge_sent_at && !profileMeta.nudge_opt_out && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                    {t("Last sent", "Последнее")} {formatDistanceToNow(new Date(profileMeta.last_nudge_sent_at), dateOpts)} {t("ago", "назад")}
                  </p>
                )}
              </div>
              <Switch checked={!profileMeta.nudge_opt_out} onCheckedChange={toggleNudge} />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut().then(() => navigate(homePath))}
            className="gap-2 text-muted-foreground hover:text-foreground self-start -mx-2"
          >
            <LogOut className="w-4 h-4" /> {t("Sign out", "Выйти")}
          </Button>
        </Card>
      </div>

      <CancellationSaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onContinue={openPortal}
        language={language}
      />
    </section>
  );
};
