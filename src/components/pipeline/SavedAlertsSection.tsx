/**
 * SavedAlertsSection — saved-search alerts surface for the Pipeline
 * workspace. Replaces the standalone bell affordance in Discover by
 * folding alert management into the same workspace where users track
 * their applications.
 *
 * Why here vs. Discover: alerts are a "stay subscribed to this query"
 * concept that compounds over time; that fits Workspace (the place
 * users come back to manage commitments), not Discover (the place users
 * come to actively search). Keeping the create-alert affordance in
 * Discover (still via SavedSearchControls in the FiltersPanel) means
 * the user creates an alert from intent, then manages it from work.
 *
 * Renders nothing for anon users (the alerts feature requires email).
 */
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, X, Search, Loader2, Plus } from "lucide-react";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  language?: "en" | "ru";
}

const fmtDate = (iso: string | null, ru: boolean): string => {
  if (!iso) return ru ? "пока нет" : "none yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return ru ? "пока нет" : "none yet";
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return ru ? "сегодня" : "today";
  if (days === 1) return ru ? "вчера" : "yesterday";
  if (days < 30) return ru ? `${days}д назад` : `${days}d ago`;
  return d.toLocaleDateString(ru ? "ru-RU" : undefined, { month: "short", day: "numeric" });
};

const filtersSummary = (filters: Record<string, unknown>, ru: boolean): string => {
  const parts: string[] = [];
  const f = filters as {
    country?: string; field?: string; level?: string; coverage?: string;
    deadline?: string; selectivity?: string;
    targetCountries?: string[]; targetFields?: string[]; demographics?: string[];
  };
  if (f.targetCountries && f.targetCountries.length > 0) parts.push(f.targetCountries.slice(0, 3).join(", "));
  if (f.targetFields && f.targetFields.length > 0) parts.push(f.targetFields.slice(0, 2).join(", "));
  if (f.country) parts.push(f.country);
  if (f.field) parts.push(f.field);
  if (f.level) parts.push(f.level);
  if (f.coverage && f.coverage !== "any") parts.push(f.coverage);
  if (f.demographics && f.demographics.length > 0) parts.push(f.demographics.slice(0, 2).join(", "));
  return parts.slice(0, 5).join(" · ") || (ru ? "все стипендии" : "all scholarships");
};

export const SavedAlertsSection = ({ language = "en" }: Props) => {
  const navigate = useNavigate();
  const { searches, loading, isAuthed, remove, setAlertEnabled } = useSavedSearches();
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);

  // Anon users: nothing to surface (the cron emails authed users only).
  if (!isAuthed) return null;
  // No saved searches AND not loading: render an inline empty state
  // pointing back at Discover.
  const isEmpty = !loading && searches.length === 0;

  const onApply = (filters: Record<string, unknown>) => {
    // Stash filters in sessionStorage; Discover reads them on mount.
    try {
      sessionStorage.setItem("topuni_apply_saved_filters", JSON.stringify(filters));
    } catch {
      // Cross-origin / private-mode failures — nav still works, just
      // without the pre-applied filter.
    }
    navigate(ru ? "/discover/ru" : "/discover");
  };

  const onToggle = async (id: string, currentlyOn: boolean) => {
    try {
      await setAlertEnabled(id, !currentlyOn);
      toast.success(
        currentlyOn
          ? t("Alerts paused for this search.", "Уведомления для этого поиска отключены.")
          : t("Alerts on. We'll email new matches daily.", "Уведомления включены. Будем присылать новые совпадения."),
      );
    } catch {
      toast.error(t("Couldn't update alert.", "Не удалось изменить уведомление."));
    }
  };

  const onRemove = async (id: string, name: string) => {
    if (!confirm(t(`Delete saved search "${name}"?`, `Удалить сохранённый поиск «${name}»?`))) return;
    try {
      await remove(id);
      toast.success(t("Saved search removed.", "Поиск удалён."));
    } catch {
      toast.error(t("Couldn't delete saved search.", "Не удалось удалить."));
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-8 sm:pb-10">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {t("Saved searches & alerts", "Сохранённые поиски и уведомления")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "We email you when new scholarships match each saved query — daily, only when there's something new.",
              "Мы пришлём письмо, когда появятся новые подходящие стипендии — ежедневно и только при новых совпадениях.",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(ru ? "/discover/ru" : "/discover")}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("New from Discover", "Новый из Поиска")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Loading saved searches…", "Загружаем сохранённые поиски…")}
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <Search className="h-6 w-6 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-foreground font-medium mb-1.5">
            {t("No saved searches yet", "Сохранённых поисков пока нет")}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto mb-4">
            {t(
              "Apply filters in Discover, then click the bookmark icon next to the filter bar to save the query and turn on daily alerts.",
              "Примените фильтры в Поиске и нажмите на закладку рядом со строкой фильтров, чтобы сохранить запрос и включить уведомления.",
            )}
          </p>
          <Button
            variant="gold"
            size="sm"
            onClick={() => navigate(ru ? "/discover/ru" : "/discover")}
            className="gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            {t("Open Discover", "Открыть Поиск")}
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {searches.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <button
                type="button"
                onClick={() => onApply(s.filters)}
                className="min-w-0 flex-1 text-left"
                aria-label={t(`Apply saved search ${s.name}`, `Применить поиск ${s.name}`)}
              >
                <p className="font-semibold text-sm text-foreground truncate group-hover:text-gold-dark transition-colors">
                  {s.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {filtersSummary(s.filters as Record<string, unknown>, ru)}
                </p>
              </button>
              <div className="text-[10px] text-muted-foreground/80 shrink-0 hidden sm:block tabular-nums">
                {t("last sent", "последнее")}: {fmtDate(s.last_alert_at, ru)}
              </div>
              <button
                type="button"
                onClick={() => onToggle(s.id, s.alert_enabled)}
                aria-label={s.alert_enabled ? t("Pause alerts", "Отключить уведомления") : t("Enable alerts", "Включить уведомления")}
                title={s.alert_enabled ? t("Alerts on — click to pause", "Уведомления включены") : t("Alerts off — click to enable", "Уведомления выключены")}
                className={`shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
                  s.alert_enabled
                    ? "text-gold-dark bg-gold/10 hover:bg-gold/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {s.alert_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => onRemove(s.id, s.name)}
                aria-label={t("Delete saved search", "Удалить поиск")}
                title={t("Delete saved search", "Удалить поиск")}
                className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
