/**
 * CancellationSaveDialog — ethical pre-cancellation save flow.
 *
 * Surfaces the real, personal, already-built value the user is about
 * to walk away from: saved scholarships, upcoming deadlines, total
 * funding-stack potential, captured "won" awards, and brief progress.
 * No countdown timers, no fake urgency, no manipulative copy. Just
 * the truth of what they've put together. If they decide to leave
 * after seeing it, the "Continue to cancel" button hands them off
 * to Stripe's portal directly.
 *
 * Sits in front of the Manage-billing button on /account. Optional —
 * users who just want to update a card aren't routed through it.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Bookmark, Calendar, Coins, Trophy, FileText, Heart } from "lucide-react";

interface ScholarshipLite {
  scholarship_id: string;
  scholarship_name: string | null;
  application_deadline: string | null;
  estimated_total_value_usd: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called when the user picks "Continue to cancel". Open Stripe portal here. */
  onContinue: () => void;
  language?: "en" | "ru";
}

const fmtMoney = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `$${Math.round(v / 1000)}K`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v}`;
};

const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
};

export const CancellationSaveDialog = ({ open, onOpenChange, onContinue, language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const tracker = useApplicationTracker();
  const { user } = useAuth();
  const [rows, setRows] = useState<ScholarshipLite[]>([]);
  const [hasBrief, setHasBrief] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Hydrate the user's tracked scholarships + brief existence when the
  // dialog opens. Single Supabase round-trip; 200ms or so on a warm cache.
  const trackedIds = useMemo(
    () => Array.from(new Set([...tracker.shortlist, ...Object.keys(tracker.statusMap)])),
    [tracker.shortlist, tracker.statusMap],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [scholarshipsRes, briefRes] = await Promise.all([
        trackedIds.length > 0
          ? supabase
              .from("scholarships")
              .select("scholarship_id, scholarship_name, application_deadline, estimated_total_value_usd")
              .in("scholarship_id", trackedIds)
          : Promise.resolve({ data: [] as ScholarshipLite[] }),
        user?.id
          ? supabase.from("pathway_reports").select("user_id").eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setRows(((scholarshipsRes as { data: ScholarshipLite[] | null }).data) ?? []);
      setHasBrief(!!(briefRes as { data: unknown }).data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, trackedIds.join(","), user?.id]);

  // Stat aggregates — saved count, urgent deadlines, funding stack,
  // won amount. Computed off the merged tracker + hydrated rows.
  const stats = useMemo(() => {
    const savedCount = rows.length;
    const urgent = rows
      .map(r => ({ r, d: daysUntil(r.application_deadline) }))
      .filter(x => x.d !== null && x.d! > 0 && x.d! <= 30)
      .sort((a, b) => (a.d! - b.d!));
    const stackUsd = rows.reduce((s, r) => s + (r.estimated_total_value_usd ?? 0), 0);
    let wonUsd = 0;
    let wonCount = 0;
    for (const id of Object.keys(tracker.statusMap)) {
      if (tracker.statusMap[id] === "accepted") {
        wonCount += 1;
        wonUsd += tracker.awardedMap[id] ?? 0;
      }
    }
    return { savedCount, urgent, stackUsd, wonUsd, wonCount };
  }, [rows, tracker.statusMap, tracker.awardedMap]);

  // Don't surface tiles for things the user hasn't actually done yet.
  // A blank "0 saved · 0 deadlines · $0 stack" wall would be the
  // opposite of meaningful — render only signal.
  const tiles: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string }[] = [];
  if (stats.savedCount > 0) {
    tiles.push({
      icon: Bookmark,
      label: t("Saved scholarships", "Сохранено стипендий"),
      value: stats.savedCount.toString(),
      hint: t("you curated", "вы собрали"),
    });
  }
  if (stats.urgent.length > 0) {
    tiles.push({
      icon: Calendar,
      label: t("Deadlines · 30 days", "Дедлайны · 30 дней"),
      value: stats.urgent.length.toString(),
      hint: t("upcoming", "впереди"),
    });
  }
  if (stats.stackUsd > 0) {
    tiles.push({
      icon: Coins,
      label: t("Potential funding stack", "Потенциал финансирования"),
      value: fmtMoney(stats.stackUsd),
      hint: t("est. across saved", "оценка по сохранённым"),
    });
  }
  if (stats.wonUsd > 0) {
    tiles.push({
      icon: Trophy,
      label: t("Won so far", "Уже выиграно"),
      value: fmtMoney(stats.wonUsd),
      hint: `${stats.wonCount} ${t("accepted", "принято")}`,
    });
  }
  if (hasBrief) {
    tiles.push({
      icon: FileText,
      label: t("Strategy brief", "Стратегия"),
      value: t("ready", "готова"),
      hint: t("personalised report", "ваш отчёт"),
    });
  }

  // No accumulated value yet → don't bother with the save flow at all.
  // Honest: there's nothing to remind them of. Hand off to Stripe.
  useEffect(() => {
    if (!open || loading) return;
    if (tiles.length === 0) {
      onOpenChange(false);
      onContinue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, tiles.length]);

  const nextDeadline = stats.urgent[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl leading-tight flex items-center gap-2">
            <Heart className="h-4 w-4 text-gold-dark" />
            {t("Before you go — here's what you've built.", "Прежде чем уйти — вот что вы уже собрали.")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t("Loading your roadmap…", "Загружаем вашу карту…")}</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "Cancelling won't delete your saved data — but you'll lose access to TopUni Pro features that turn it into a working plan: Pro retrieval on Discover, monthly founder workshops, the strategy brief, and outcome tracking.",
                "Отмена не удалит ваши данные — но вы потеряете доступ к функциям TopUni Pro, которые превращают их в рабочий план: продвинутый поиск Discover, ежемесячные воркшопы с основателями, стратегию и трекинг результатов.",
              )}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {tiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <div key={tile.label} className="rounded-xl border border-border bg-card/60 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mb-2">
                      <Icon className="h-3 w-3 text-gold-dark" />
                      <span>{tile.label}</span>
                    </div>
                    <p className="font-heading font-bold text-foreground text-xl tabular-nums leading-none">{tile.value}</p>
                    {tile.hint && <p className="text-[11px] text-muted-foreground mt-1">{tile.hint}</p>}
                  </div>
                );
              })}
            </div>

            {nextDeadline && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[13px] text-amber-900 dark:text-amber-300 leading-snug">
                <p className="font-semibold mb-0.5">
                  {t("Next deadline:", "Ближайший дедлайн:")} {nextDeadline.r.scholarship_name}
                </p>
                <p className="text-amber-800/80 dark:text-amber-300/80">
                  {nextDeadline.d === 1
                    ? t("1 day away", "через 1 день")
                    : `${nextDeadline.d} ${t("days away", "дн. впереди")}`}
                  {" · "}
                  {t("Cancelling now means losing your Pro retrieval right before you need it.", "Отмена сейчас — потерять Pro как раз когда он нужен.")}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2 sm:justify-end">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => { onOpenChange(false); onContinue(); }}
          >
            {t("Continue to cancel", "Всё равно отменить")}
          </Button>
          <Button
            variant="gold"
            onClick={() => onOpenChange(false)}
          >
            {t("Keep my subscription", "Остаться")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
