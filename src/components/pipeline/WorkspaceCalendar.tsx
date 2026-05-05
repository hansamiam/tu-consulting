/**
 * WorkspaceCalendar — embeddable month-grid view of tracked scholarship
 * deadlines. Lifted out of the standalone /calendar page so /pipeline
 * can render it as a tab without duplicating logic.
 *
 * Owns: cursor (which month) + selectedDate state. Stateless wrt the
 * underlying tracker — parent passes hydrated rows + tracker maps as
 * props so this works inside both the standalone page (during the
 * round-17 transition) and the Workspace tab.
 *
 * Hides cells for rejected/accepted/hidden statuses — once a row is
 * resolved, it doesn't belong on the upcoming-deadlines surface.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowRight, CalendarPlus, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { cleanScholarshipName } from "@/lib/scholarshipFields";
import { shortCountry } from "@/lib/countryAccent";
import type { AppStatus } from "@/hooks/useApplicationTracker";

export interface CalendarScholarship {
  scholarship_id: string;
  scholarship_name: string;
  host_country: string | null;
  application_deadline: string | null;
  coverage_type: string;
}

interface Props {
  rows: CalendarScholarship[];
  hidden: Set<string>;
  statusMap: Record<string, AppStatus>;
  loading?: boolean;
  language?: "en" | "ru";
  /** When set, renders an "Sync to calendar" button that calls this. */
  onSubscribe?: () => void;
  /** Click on a deadline → defaults to scholarship detail page if absent. */
  onSelectScholarship?: (scholarshipId: string) => void;
}

interface DayCell { dateKey: string; dayNumber: number; }

function buildMonthGrid(cursor: Date): (DayCell | null)[] {
  // 6 rows × 7 cols = 42 cells. Empty leading + trailing cells round
  // out the grid so it always renders the same shape regardless of month.
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push({
      dateKey: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dayNumber: d,
    });
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}

const addMonths = (d: Date, n: number) => {
  const next = new Date(d);
  next.setMonth(next.getMonth() + n);
  return next;
};

const dayHeaders = (isRu: boolean) =>
  isRu ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WorkspaceCalendar = ({ rows, hidden, statusMap, loading, language = "en", onSubscribe, onSelectScholarship }: Props) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarScholarship[]>();
    for (const r of rows) {
      if (hidden.has(r.scholarship_id)) continue;
      const status = statusMap[r.scholarship_id] as AppStatus | undefined;
      if (status === "rejected" || status === "accepted") continue;
      if (!r.application_deadline) continue;
      const key = r.application_deadline.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [rows, hidden, statusMap]);

  const initialCursor = useMemo(() => {
    const today = new Date();
    today.setDate(1);
    today.setHours(0, 0, 0, 0);
    const upcoming = [...byDate.keys()].filter((k) => new Date(k) >= new Date()).sort()[0];
    if (upcoming) {
      const d = new Date(upcoming);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return today;
    // initial cursor depends only on whether there are any deadlines —
    // recomputing every byDate change would scroll the user mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDate.size === 0]);

  const [cursor, setCursor] = useState<Date>(initialCursor);
  useEffect(() => { setCursor(initialCursor); }, [initialCursor]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString(isRu ? "ru-RU" : "en-US", { year: "numeric", month: "long" });

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const upcomingStats = useMemo(() => {
    const now = new Date();
    let next30 = 0, next7 = 0;
    let nextDate: string | null = null;
    let nextRow: CalendarScholarship | null = null;
    for (const [date, list] of byDate) {
      const d = new Date(date);
      const diff = (d.getTime() - now.getTime()) / 86_400_000;
      if (diff > 0 && diff <= 30) next30 += list.length;
      if (diff > 0 && diff <= 7) next7 += list.length;
      if (diff > 0 && (nextDate === null || d < new Date(nextDate))) {
        nextDate = date;
        nextRow = list[0];
      }
    }
    return { next30, next7, nextDate, nextRow };
  }, [byDate]);

  const selectedDeadlines = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">{t("Loading calendar…", "Загрузка…")}</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="h-16 w-16 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-5">
          <CalendarIcon className="w-7 h-7 text-muted-foreground/60" />
        </div>
        <h2 className="font-heading text-xl font-bold tracking-tight mb-2">
          {t("No deadlines tracked yet.", "Пока нет отслеживаемых дедлайнов.")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {t(
            "Save scholarships from Discover and their deadlines plot here.",
            "Сохраняйте стипендии в Discover, и их дедлайны появятся здесь.",
          )}
        </p>
        <Button variant="gold" asChild className="gap-2">
          <Link to={isRu ? "/discover/ru" : "/discover"}>
            <Search className="w-4 h-4" />
            {t("Find scholarships", "Найти стипендии")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Top mini-stats — same data as the standalone page surfaced
          but compact. Inside the Workspace this lives just under the
          tab bar so the user always knows what's coming. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label={t("With deadlines", "С дедлайнами")} value={String([...byDate.values()].reduce((s, v) => s + v.length, 0))} />
        <Stat label={t("Next 30 days", "Через 30 дней")} value={String(upcomingStats.next30)} tone={upcomingStats.next30 > 0 ? "warn" : "neutral"} />
        <Stat label={t("Next 7 days", "Через 7 дней")} value={String(upcomingStats.next7)} tone={upcomingStats.next7 > 0 ? "danger" : "neutral"} />
        <Stat
          label={t("Next deadline", "Ближайший")}
          value={upcomingStats.nextDate ? new Date(upcomingStats.nextDate).toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short", day: "numeric" }) : "—"}
          sub={upcomingStats.nextRow ? cleanScholarshipName(upcomingStats.nextRow.scholarship_name).slice(0, 30) : undefined}
        />
      </div>

      {/* Sync CTA — when parent passes the handler. Highest-leverage
          action on this surface. */}
      {onSubscribe && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={onSubscribe}>
            <CalendarPlus className="h-3.5 w-3.5" />
            {t("Sync to Apple, Google, or Outlook", "Подписаться: Apple, Google, Outlook")}
          </Button>
          <span className="text-[11px] text-muted-foreground leading-snug">
            {t(
              "Native phone-calendar reminders 7d + 1d before each deadline. Auto-updates when you save more.",
              "Напоминания в календаре телефона за 7 и 1 день. Обновляется автоматически.",
            )}
          </span>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setCursor((p) => addMonths(p, -1))}>
          <ChevronLeft className="w-4 h-4" /> {t("Prev", "Пред")}
        </Button>
        <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight capitalize">{monthLabel}</h2>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setCursor((p) => addMonths(p, 1))}>
          {t("Next", "След")} <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {dayHeaders(isRu).map((d) => (
          <div key={d} className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold text-center py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((cell, i) => {
          if (!cell) return <div key={i} className="aspect-square" />;
          const key = cell.dateKey;
          const items = byDate.get(key) ?? [];
          const isToday = key === todayStr;
          const isSelected = key === selectedDate;
          const isPast = new Date(key) < new Date(todayStr);
          const isUrgent = items.length > 0 && !isPast && (new Date(key).getTime() - Date.now()) / 86_400_000 <= 7;

          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedDate(key)}
              className={`
                aspect-square sm:aspect-auto sm:min-h-[80px] rounded-lg border p-1.5 sm:p-2 text-left transition-all
                ${isSelected
                  ? "border-gold/60 bg-gold/10 ring-1 ring-gold/40"
                  : isToday
                    ? "border-primary bg-primary/5"
                    : items.length > 0
                      ? "border-border bg-card hover:border-gold/30 hover:bg-gold/5"
                      : "border-border/40 bg-background hover:bg-muted/30"
                }
                ${isPast ? "opacity-50" : ""}
              `}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[11px] sm:text-xs font-semibold tabular-nums ${isToday ? "text-primary" : "text-foreground"}`}>{cell.dayNumber}</span>
                {items.length > 0 && (
                  <span className={`text-[10px] tabular-nums px-1 rounded font-bold ${isUrgent ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    {items.length}
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <div className="hidden sm:block mt-1.5 space-y-0.5">
                  {items.slice(0, 2).map((it) => (
                    <p key={it.scholarship_id} className="text-[10px] leading-tight text-foreground/80 line-clamp-1">
                      {cleanScholarshipName(it.scholarship_name)}
                    </p>
                  ))}
                  {items.length > 2 && (
                    <p className="text-[10px] text-muted-foreground">+{items.length - 2}</p>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <Card className="mt-6 p-5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="font-heading font-semibold text-lg tracking-tight">
              {new Date(selectedDate).toLocaleDateString(isRu ? "ru-RU" : "en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-xs text-muted-foreground hover:text-foreground">
              {t("Close", "Закрыть")}
            </button>
          </div>
          {selectedDeadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No tracked deadlines on this day.", "На этот день нет отслеживаемых дедлайнов.")}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDeadlines.map((s) => {
                const inner = (
                  <>
                    <CalendarIcon className="w-4 h-4 text-gold-dark shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-gold-dark transition-colors">
                        {cleanScholarshipName(s.scholarship_name)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.host_country ? shortCountry(s.host_country) : "—"} · {s.coverage_type === "full_ride" ? t("Full ride", "Полное") : s.coverage_type === "tuition_only" ? t("Tuition", "Обучение") : t("Stipend", "Стипендия")}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold-dark transition-colors shrink-0" />
                  </>
                );
                return onSelectScholarship ? (
                  <button
                    key={s.scholarship_id}
                    onClick={() => onSelectScholarship(s.scholarship_id)}
                    className="w-full group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-gold/40 hover:bg-gold/5 transition-all text-left"
                  >{inner}</button>
                ) : (
                  <Link
                    key={s.scholarship_id}
                    to={`/scholarships/${s.scholarship_id}`}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-gold/40 hover:bg-gold/5 transition-all"
                  >{inner}</Link>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

const Stat = ({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "warn" | "danger" }) => {
  const valueClass =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-amber-700 dark:text-amber-500" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{label}</p>
      <p className={`font-heading font-bold text-lg tabular-nums tracking-tight leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">{sub}</p>}
    </div>
  );
};
