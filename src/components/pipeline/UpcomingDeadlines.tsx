/* UpcomingDeadlines — round-34 replacement for the full
 * WorkspaceCalendar month grid. The grid was substantial vertical
 * space for what most users actually want to know: "what's coming
 * up next?". A compact list of the next ~5 deadlines reads faster,
 * fits on screen alongside the kanban, and pairs with the "Sync to
 * my calendar app" button so users who DO want a month view get
 * it natively (Google / Apple / Outlook) via the .ics feed.
 *
 * Rows are clickable — tap opens the detail sheet for that
 * scholarship via the same onSelectScholarship handler the calendar
 * exposed. Empty state when no tracked row has a deadline. */
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import { shortCountry } from "@/lib/countryAccent";
import { cleanScholarshipName } from "@/lib/scholarshipFields";

export interface DeadlineRow {
  scholarship_id: string;
  scholarship_name: string;
  host_country: string | null;
  application_deadline: string | null;
}

interface Props {
  rows: DeadlineRow[];
  hidden: Set<string>;
  loading: boolean;
  language?: "en" | "ru";
  /** Authed users get the "Sync to my calendar" CTA. Anon: hidden. */
  onSubscribe?: () => void;
  onSelectScholarship: (id: string) => void;
  /** Max rows to surface. Default 6 — long enough to cover the
   *  immediate planning horizon, short enough to not feel listy. */
  limit?: number;
}

const fmtDays = (d: string | null, lang: "en" | "ru"): { text: string; tone: "danger" | "warn" | "neutral" } => {
  const ru = lang === "ru";
  if (!d) return { text: ru ? "Без дедлайна" : "Rolling", tone: "neutral" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0)  return { text: ru ? "Закрыто" : "Closed",        tone: "neutral" };
  if (days <= 7)  return { text: ru ? `${days} дн`  : `${days}d left`, tone: "danger" };
  if (days <= 30) return { text: ru ? `${days} дн`  : `${days}d left`, tone: "warn" };
  return { text: ru ? `${days} дн` : `${days}d left`, tone: "neutral" };
};

const fmtDate = (d: string, lang: "en" | "ru"): string => {
  try {
    const date = new Date(d);
    return new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", {
      month: "short", day: "numeric", year: "numeric",
    }).format(date);
  } catch {
    return d;
  }
};

export const UpcomingDeadlines = ({ rows, hidden, loading, language = "en", onSubscribe, onSelectScholarship, limit = 6 }: Props) => {
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);

  const upcoming = rows
    .filter(r => !hidden.has(r.scholarship_id))
    .filter(r => r.application_deadline)
    .map(r => ({
      ...r,
      ts: new Date(r.application_deadline as string).getTime(),
    }))
    .filter(r => r.ts >= Date.now() - 86400000) // include today and future
    .sort((a, b) => a.ts - b.ts)
    .slice(0, limit);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {t("Loading deadlines…", "Загружаем дедлайны…")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {upcoming.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          {t(
            "No upcoming deadlines yet. Saved scholarships with a deadline date will land here.",
            "Пока нет ближайших дедлайнов. Сохранённые стипендии с датой появятся здесь.",
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {upcoming.map(r => {
            const dl = fmtDays(r.application_deadline, language);
            const toneCls =
              dl.tone === "danger" ? "text-destructive font-semibold"
              : dl.tone === "warn" ? "text-amber-700 dark:text-amber-400 font-medium"
              : "text-muted-foreground";
            return (
              <li key={r.scholarship_id}>
                <button
                  onClick={() => onSelectScholarship(r.scholarship_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-canvas-soft/50 transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate leading-tight">
                      {cleanScholarshipName(r.scholarship_name)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {r.host_country ? shortCountry(r.host_country) : "—"} · {fmtDate(r.application_deadline as string, language)}
                    </p>
                  </div>
                  <span className={`text-xs tabular-nums whitespace-nowrap shrink-0 ${toneCls}`}>
                    {dl.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {onSubscribe && upcoming.length > 0 && (
        <div className="px-4 py-3 border-t border-border/60 bg-canvas-soft/30 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground leading-snug min-w-0">
            {t(
              "Sync these to Apple, Google, or Outlook so they auto-update when you save more.",
              "Синхронизируйте в Apple, Google или Outlook — обновится автоматически.",
            )}
          </p>
          <Button variant="outline" size="sm" onClick={onSubscribe} className="gap-1.5 shrink-0 text-xs h-8">
            {t("Sync calendar", "Синхронизировать")}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
