/**
 * Calendar — month view of tracked scholarship deadlines.
 *
 * Pairs with /pipeline (kanban by status) to give students two
 * complementary views of their application season:
 *   - /pipeline: "what stage am I at on each application"
 *   - /calendar: "what's actually due when"
 *
 * Reads from useApplicationTracker. Shows tracked + non-hidden
 * scholarships. Click a day to see the deadlines on it; click a
 * deadline to open the scholarship detail.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ArrowLeft, Calendar as CalendarIcon,
  AlertCircle, Inbox, Search, ArrowRight, Loader2,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useApplicationTracker, type AppStatus } from "@/hooks/useApplicationTracker";

interface ScholarshipLite {
  scholarship_id: string;
  scholarship_name: string;
  host_country: string | null;
  application_deadline: string | null;
  coverage_type: string;
}

interface Props { language?: "en" | "ru" }

const Calendar = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const tracker = useApplicationTracker();

  const trackedIds = useMemo(
    () => Array.from(new Set([...tracker.shortlist, ...Object.keys(tracker.statusMap)])),
    [tracker.shortlist, tracker.statusMap],
  );

  const [rows, setRows] = useState<ScholarshipLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trackedIds.length === 0) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("scholarships")
        .select("scholarship_id, scholarship_name, host_country, application_deadline, coverage_type")
        .in("scholarship_id", trackedIds);
      if (cancelled) return;
      setRows((data as ScholarshipLite[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [trackedIds.join(",")]);

  /* Build a Map<YYYY-MM-DD, ScholarshipLite[]> for O(1) day lookup */
  const byDate = useMemo(() => {
    const map = new Map<string, ScholarshipLite[]>();
    for (const r of rows) {
      if (tracker.hidden.has(r.scholarship_id)) continue;
      const status = tracker.statusMap[r.scholarship_id] as AppStatus | undefined;
      if (status === "rejected" || status === "accepted") continue;
      if (!r.application_deadline) continue;
      const key = r.application_deadline.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [rows, tracker.hidden, tracker.statusMap]);

  /* Cursor — start at the month with the next upcoming deadline, or today */
  const initialCursor = useMemo(() => {
    const today = new Date();
    today.setDate(1);
    today.setHours(0, 0, 0, 0);
    const upcoming = [...byDate.keys()]
      .filter((k) => new Date(k) >= new Date())
      .sort()[0];
    if (upcoming) {
      const d = new Date(upcoming);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return today;
  }, [byDate.size === 0]);

  const [cursor, setCursor] = useState<Date>(initialCursor);
  useEffect(() => { setCursor(initialCursor); }, [initialCursor]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /* Build the calendar grid for the cursor month */
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const monthLabel = cursor.toLocaleDateString(isRu ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
  });

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  /* Stats banner */
  const upcomingStats = useMemo(() => {
    const now = new Date();
    let next30 = 0, next7 = 0;
    let nextDate: string | null = null;
    let nextRow: ScholarshipLite | null = null;
    for (const [date, list] of byDate) {
      const d = new Date(date);
      const diff = (d.getTime() - now.getTime()) / 86400_000;
      if (diff > 0 && diff <= 30) next30 += list.length;
      if (diff > 0 && diff <= 7) next7 += list.length;
      if (diff > 0 && (nextDate === null || d < new Date(nextDate))) {
        nextDate = date;
        nextRow = list[0];
      }
    }
    return { next30, next7, nextDate, nextRow };
  }, [byDate]);

  /* Selected day's scholarships */
  const selectedDeadlines = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-14">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <Link
            to={isRu ? "/pipeline/ru" : "/pipeline"}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("Back to pipeline", "К воронке")}
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {t("Deadline calendar", "Календарь дедлайнов")}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            {t("Every deadline, on a single page.", "Все дедлайны на одной странице.")}
          </h1>
          <p className="text-primary-foreground/75 text-sm sm:text-base leading-relaxed max-w-xl">
            {t(
              "All your tracked scholarships, plotted on a real calendar so you can see what's actually due when.",
              "Все ваши отслеживаемые стипендии на реальном календаре — видно, что когда подавать.",
            )}
          </p>
        </div>
      </section>

      {/* Stats ────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-card/40">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label={t("Tracked w/ deadline", "Отслеживается")} value={String([...byDate.values()].reduce((s, v) => s + v.length, 0))} />
          <Stat label={t("Next 30 days", "Через 30 дней")} value={String(upcomingStats.next30)} tone={upcomingStats.next30 > 0 ? "warn" : "neutral"} />
          <Stat label={t("Next 7 days", "Через 7 дней")} value={String(upcomingStats.next7)} tone={upcomingStats.next7 > 0 ? "danger" : "neutral"} />
          <Stat
            label={t("Next deadline", "Ближайший")}
            value={upcomingStats.nextDate ? new Date(upcomingStats.nextDate).toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short", day: "numeric" }) : "—"}
            sub={upcomingStats.nextRow?.scholarship_name?.slice(0, 30)}
          />
        </div>
      </section>

      {/* Calendar grid ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
        {trackedIds.length === 0 ? (
          <EmptyState language={language} />
        ) : loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">{t("Loading…", "Загрузка…")}</span>
          </div>
        ) : (
          <>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setCursor(prev => addMonths(prev, -1))}
              >
                <ChevronLeft className="w-4 h-4" /> {t("Prev", "Пред")}
              </Button>
              <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight capitalize">
                {monthLabel}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setCursor(prev => addMonths(prev, 1))}
              >
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
                const isUrgent = items.length > 0 && !isPast && (new Date(key).getTime() - Date.now()) / 86400_000 <= 7;

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
                      <span className={`text-[11px] sm:text-xs font-semibold tabular-nums ${isToday ? "text-primary" : "text-foreground"}`}>
                        {cell.dayNumber}
                      </span>
                      {items.length > 0 && (
                        <span className={`text-[10px] tabular-nums px-1 rounded font-bold ${
                          isUrgent ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>
                          {items.length}
                        </span>
                      )}
                    </div>
                    {/* Up to 2 scholarship names, truncated, hidden on small */}
                    {items.length > 0 && (
                      <div className="hidden sm:block mt-1.5 space-y-0.5">
                        {items.slice(0, 2).map((it) => (
                          <p key={it.scholarship_id} className="text-[10px] leading-tight text-foreground/80 line-clamp-1">
                            {it.scholarship_name}
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
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("Close", "Закрыть")}
                  </button>
                </div>
                {selectedDeadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("No tracked deadlines on this day.", "На этот день нет отслеживаемых дедлайнов.")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDeadlines.map((s) => (
                      <Link
                        key={s.scholarship_id}
                        to={`/scholarships/${s.scholarship_id}`}
                        className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-gold/40 hover:bg-gold/5 transition-all"
                      >
                        <CalendarIcon className="w-4 h-4 text-gold-dark shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate group-hover:text-gold-dark transition-colors">
                            {s.scholarship_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.host_country ?? "—"} · {s.coverage_type === "full_ride" ? t("Full ride", "Полное") : s.coverage_type === "tuition_only" ? t("Tuition", "Обучение") : t("Stipend", "Стипендия")}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold-dark transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </section>

      <Footer language={isRu ? "ru" : "en"} />
    </div>
  );
};

export default Calendar;

/* ─── Helpers ──────────────────────────────────────────────────── */

interface DayCell { dateKey: string; dayNumber: number; }

function buildMonthGrid(cursor: Date): (DayCell | null)[] {
  // 6 rows × 7 cols = 42 cells. First row may have leading empties; last row trailing.
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay(); // 0=Sun
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

function addMonths(d: Date, n: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + n);
  return next;
}

function dayHeaders(isRu: boolean): string[] {
  return isRu ? ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

const Stat = ({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "warn" | "danger" }) => {
  const valueClass =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-amber-700 dark:text-amber-500" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{label}</p>
      <p className={`font-heading font-bold text-xl tabular-nums tracking-tight leading-none ${valueClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">{sub}</p>}
    </div>
  );
};

const EmptyState = ({ language }: { language: "en" | "ru" }) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
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
          "Save scholarships from Discover and their deadlines plot here. Pair the calendar with /pipeline (kanban by status) for full mission control.",
          "Сохраняйте стипендии в Discover, и их дедлайны появятся здесь. Календарь + воронка = полный контроль.",
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
};
