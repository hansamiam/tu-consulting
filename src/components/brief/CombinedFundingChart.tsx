import { motion } from "framer-motion";
import { Crown, Target, Sparkles } from "lucide-react";
import type { CombinedFundingSection } from "@/types/briefStructured";

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

const FEASIBILITY_META = {
  primary: {
    en: "Primary path",
    ru: "Основной путь",
    Icon: Target,
    cls: "text-success border-success/30 bg-success/5",
    barCls: "from-success to-success/80",
  },
  secondary: {
    en: "Realistic backup",
    ru: "Запасной план",
    Icon: Sparkles,
    cls: "text-gold-dark border-gold/30 bg-gold/5",
    barCls: "from-gold-dark to-gold",
  },
  stretch: {
    en: "Stretch combo",
    ru: "Амбициозный сценарий",
    Icon: Crown,
    cls: "text-amber-700 dark:text-amber-400 border-amber-300/40 bg-amber-50 dark:bg-amber-950/20",
    barCls: "from-amber-500 to-amber-300",
  },
} as const;

/* CombinedFundingChart — per-scenario stacked horizontal bar showing each
   funding component as a segment proportional to its $ value, plus a
   feasibility tag and one-line strategy hint. */
export const CombinedFundingChart = ({
  data, isRu,
}: {
  data: CombinedFundingSection;
  isRu: boolean;
}) => {
  if (!data.scenarios || data.scenarios.length === 0) return null;
  const t = (en: string, ru: string) => (isRu ? ru : en);

  // Scale all bars to the largest scenario so the visual comparison
  // between scenarios is honest (a $200K scenario should be visibly
  // larger than a $50K one).
  const cohortMax = Math.max(...data.scenarios.map(s => s.total_usd));

  return (
    <div className="not-prose mb-6 space-y-3">
      {data.scenarios.slice(0, 3).map((scenario, i) => {
        const widthPct = Math.max(20, (scenario.total_usd / cohortMax) * 100);
        const feasMeta = FEASIBILITY_META[scenario.feasibility] ?? FEASIBILITY_META.secondary;
        const FeasIcon = feasMeta.Icon;

        return (
          <motion.div
            key={scenario.name + i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border ${feasMeta.cls}`}>
                  <FeasIcon className="w-2.5 h-2.5" />
                  {feasMeta[isRu ? "ru" : "en"]}
                </span>
                <h4 className="font-heading font-bold text-[15px] sm:text-base text-foreground tracking-tight leading-tight min-w-0 truncate">
                  {scenario.name}
                </h4>
              </div>
              <span className="font-heading font-bold text-base sm:text-lg text-gold-dark tabular-nums shrink-0">
                {fmtMoney(scenario.total_usd)}
              </span>
            </div>

            {/* Stacked bar — scaled to cohort max */}
            <div
              className="flex h-8 rounded-md overflow-hidden border border-border/60 mb-3"
              style={{ width: `${widthPct}%` }}
            >
              {scenario.components.map((c, idx) => {
                const segmentPct = (c.amount_usd / scenario.total_usd) * 100;
                return (
                  <motion.div
                    key={idx}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${segmentPct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.1 + idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className={`bg-gradient-to-r ${feasMeta.barCls} ${idx > 0 ? "border-l border-card" : ""} flex items-center justify-center text-[10px] font-bold text-white px-2 truncate min-w-0`}
                    style={{ minWidth: segmentPct < 10 ? "auto" : undefined }}
                    title={`${c.name} — ${fmtMoney(c.amount_usd)}`}
                  >
                    {segmentPct >= 18 && c.name.split(/\s+/)[0]}
                  </motion.div>
                );
              })}
            </div>

            {/* Component legend */}
            <ol className="space-y-1 mb-2">
              {scenario.components.map((c, idx) => (
                <li key={idx} className="flex items-center gap-2.5 text-[12px]">
                  <span className="text-muted-foreground tabular-nums shrink-0 w-5 text-right">{idx + 1}.</span>
                  <span className="text-foreground/85 truncate min-w-0 flex-1">{c.name}</span>
                  <span className="text-foreground font-semibold tabular-nums shrink-0 w-14 text-right">
                    {fmtMoney(c.amount_usd)}
                  </span>
                </li>
              ))}
            </ol>

            {scenario.strategy && (
              <p className="text-[12px] text-muted-foreground leading-snug mt-2 pt-2 border-t border-border/60">
                <span className="font-semibold text-foreground/85">{t("How:", "Как:")}</span> {scenario.strategy}
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
