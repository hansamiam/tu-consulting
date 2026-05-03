import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

type LiveMatchLite = {
  scholarship_id: string;
  scholarship_name: string;
  application_deadline: string | null;
  estimated_total_value_usd: number | null;
};

/* Horizontal axis from "now" to ~12 months out, with a dot per upcoming
   scholarship deadline. The closer it is, the larger and more urgent the
   color. Lets the student SEE the next 12 months at a glance — much more
   visceral than a list of "X days". */
export const DeadlineTimeline = ({
  liveMatches, isRu, onSelectMatch,
}: {
  liveMatches: LiveMatchLite[];
  isRu: boolean;
  onSelectMatch?: (id: string) => void;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const { dots, monthLabels, totalDays } = useMemo(() => {
    const now = Date.now();
    // We render a 12-month window. Deadlines past 12 months are clipped to
    // the right edge so the user still sees they exist.
    const totalDays = 365;

    type Dot = {
      id: string;
      name: string;
      days: number;
      pct: number;
      tone: "urgent" | "warning" | "ok";
      value: number;
    };

    const dots: Dot[] = liveMatches
      .map(m => {
        if (!m.application_deadline) return null;
        const days = Math.ceil((new Date(m.application_deadline).getTime() - now) / 86400000);
        if (days <= 0) return null;
        const clipped = Math.min(days, totalDays);
        const pct = (clipped / totalDays) * 100;
        const tone: Dot["tone"] = days <= 14 ? "urgent" : days <= 60 ? "warning" : "ok";
        return {
          id: m.scholarship_id,
          name: m.scholarship_name,
          days,
          pct,
          tone,
          value: m.estimated_total_value_usd || 0,
        };
      })
      .filter((d): d is Dot => d !== null)
      .sort((a, b) => a.days - b.days);

    // Month tick marks (now, +3mo, +6mo, +9mo, +12mo)
    const monthLabels = [0, 3, 6, 9, 12].map(months => {
      const date = new Date();
      date.setMonth(date.getMonth() + months);
      return {
        pct: (months * 30 / totalDays) * 100,
        label: months === 0
          ? t("Now", "Сейчас")
          : date.toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short" }),
      };
    });

    return { dots, monthLabels, totalDays };
  }, [liveMatches, isRu]);

  if (dots.length < 2) return null;

  // Identify the 3 closest to label inline (rest are anonymous dots).
  const labeledIds = new Set(dots.slice(0, 3).map(d => d.id));

  return (
    <div className="not-prose mb-10 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1">
            {t("Your next 12 months", "Ваши 12 месяцев")}
          </p>
          <h3 className="font-heading text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
            {dots.length} {t("upcoming deadlines", "предстоящих дедлайнов")}
            <span className="text-muted-foreground font-normal"> · {t("plot below", "график ниже")}</span>
          </h3>
        </div>
        <Clock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      </div>

      <div className="px-5 sm:px-6 pb-6 pt-4">
        <div className="relative h-20">
          {/* Axis line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

          {/* Month ticks */}
          {monthLabels.map((m, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${m.pct}%`, transform: `translate(-50%, -50%)` }}
            >
              <span className="h-2 w-px bg-border" />
              <span className="text-[10px] text-muted-foreground/70 mt-1.5 whitespace-nowrap font-medium">
                {m.label}
              </span>
            </div>
          ))}

          {/* Deadline dots */}
          {dots.map((d, i) => {
            const labeled = labeledIds.has(d.id);
            const dotSize =
              d.tone === "urgent" ? "h-3.5 w-3.5"
              : d.tone === "warning" ? "h-3 w-3"
              : "h-2 w-2";
            const dotColor =
              d.tone === "urgent" ? "bg-destructive ring-destructive/20"
              : d.tone === "warning" ? "bg-amber-500 ring-amber-500/20"
              : "bg-foreground/40 ring-foreground/10";

            return (
              <motion.button
                key={d.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelectMatch?.(d.id)}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ left: `${d.pct}%` }}
                aria-label={`${d.name} — ${d.days} days`}
              >
                <span className={`block rounded-full ${dotSize} ${dotColor} ring-4 transition-transform group-hover:scale-125`} />
                {labeled && (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 ${i % 2 === 0 ? "top-5" : "bottom-5"} whitespace-nowrap`}
                  >
                    <div className={`text-[10px] font-semibold tabular-nums ${
                      d.tone === "urgent" ? "text-destructive" : d.tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-foreground/70"
                    }`}>
                      {d.days}d
                    </div>
                    <div className="text-[10px] text-muted-foreground max-w-[110px] truncate">
                      {d.name}
                    </div>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="block h-2 w-2 rounded-full bg-destructive" />
            <span>{t("≤ 14 days", "≤ 14 дней")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="block h-2 w-2 rounded-full bg-amber-500" />
            <span>{t("≤ 60 days", "≤ 60 дней")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="block h-2 w-2 rounded-full bg-foreground/40" />
            <span>{t("Later", "Позже")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
