import { useMemo } from "react";
import { motion } from "framer-motion";
import { Banknote } from "lucide-react";
import { cleanScholarshipName } from "@/lib/scholarshipFields";

type LiveMatchLite = {
  scholarship_id: string;
  scholarship_name: string;
  provider_name?: string | null;
  estimated_total_value_usd: number | null;
};

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

/* FundingStack — visual answer to "how much could I actually win?".
   Top 5 matches by $ value, rendered as a horizontal stacked bar so the
   reader SEES how the scholarships accumulate into a total. Each segment
   is sized proportionally to its share of the stack and tinted on a
   gold→primary→muted gradient. */
export const FundingStack = ({
  liveMatches, isRu,
}: {
  liveMatches: LiveMatchLite[];
  isRu: boolean;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const { items, total } = useMemo(() => {
    const filtered = liveMatches
      .filter(m => (m.estimated_total_value_usd ?? 0) > 0)
      .sort((a, b) => (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0))
      .slice(0, 5);
    const total = filtered.reduce((s, m) => s + (m.estimated_total_value_usd ?? 0), 0);
    return { items: filtered, total };
  }, [liveMatches]);

  if (items.length < 2) return null;

  // Hand-tuned gold-leaning palette so the bar reads as "money" rather
  // than data-viz default. Slightly desaturated so the eye doesn't burn.
  const segmentColors = [
    "bg-gold-dark",
    "bg-gold",
    "bg-amber-400",
    "bg-amber-300",
    "bg-amber-200",
  ];

  return (
    <div className="not-prose mb-10 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1">
            {t("Combined funding potential", "Совокупный потенциал финансирования")}
          </p>
          <h3 className="font-heading text-base sm:text-lg font-bold text-foreground tracking-tight leading-tight">
            <span className="text-gold-dark tabular-nums">{fmtMoney(total)}</span>
            <span className="text-foreground/80 font-semibold"> {t("if you stack the top", "если соединить топ")} {items.length}</span>
          </h3>
        </div>
        <Banknote className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      </div>

      <div className="px-5 sm:px-6 pb-6 pt-4">
        {/* Stack bar */}
        <div className="flex h-9 w-full overflow-hidden rounded-lg border border-border/70">
          {items.map((it, i) => {
            const pct = (it.estimated_total_value_usd! / total) * 100;
            return (
              <motion.div
                key={it.scholarship_id}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`${segmentColors[i] || "bg-muted-foreground/30"} relative ${i > 0 ? "border-l border-card" : ""}`}
                style={{ minWidth: pct < 4 ? "4%" : undefined }}
                title={`${cleanScholarshipName(it.scholarship_name)} · ${fmtMoney(it.estimated_total_value_usd!)}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <ol className="mt-4 space-y-1.5">
          {items.map((it, i) => {
            const pct = Math.round((it.estimated_total_value_usd! / total) * 100);
            return (
              <li key={it.scholarship_id} className="flex items-center gap-3 text-[12px]">
                <span className={`block h-2 w-2 rounded-sm shrink-0 ${segmentColors[i] || "bg-muted-foreground/30"}`} />
                <span className="text-foreground/85 truncate min-w-0 flex-1">{cleanScholarshipName(it.scholarship_name)}</span>
                <span className="text-muted-foreground tabular-nums shrink-0 text-[11px]">{pct}%</span>
                <span className="text-foreground font-semibold tabular-nums shrink-0 w-14 text-right">
                  {fmtMoney(it.estimated_total_value_usd!)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
