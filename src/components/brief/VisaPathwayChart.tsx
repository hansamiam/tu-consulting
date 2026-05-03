import { motion } from "framer-motion";
import { Plane, Briefcase, Home, AlertTriangle } from "lucide-react";
import type { VisaPathwaySection } from "@/types/briefStructured";

const DIFFICULTY_LABEL = {
  1: { en: "Trivial",     ru: "Просто" },
  2: { en: "Easy",        ru: "Легко" },
  3: { en: "Moderate",    ru: "Средне" },
  4: { en: "Hard",        ru: "Сложно" },
  5: { en: "Very hard",   ru: "Очень сложно" },
} as const;

const DIFFICULTY_DOT_CLS = {
  1: "bg-success",
  2: "bg-success/70",
  3: "bg-amber-500",
  4: "bg-orange-500",
  5: "bg-destructive",
} as const;

/* VisaPathwayChart — per-country horizontal stage timeline:
   visa difficulty rating → post-study work months → PR pathway years →
   key challenges. */
export const VisaPathwayChart = ({
  data, isRu,
}: {
  data: VisaPathwaySection;
  isRu: boolean;
}) => {
  if (!data.countries || data.countries.length === 0) return null;
  const t = (en: string, ru: string) => (isRu ? ru : en);

  return (
    <div className="not-prose mb-6 space-y-3">
      {data.countries.slice(0, 3).map((c, i) => {
        const difficultyLabel = (DIFFICULTY_LABEL[c.student_visa_difficulty] ?? DIFFICULTY_LABEL[3])[isRu ? "ru" : "en"];
        const dotCls = DIFFICULTY_DOT_CLS[c.student_visa_difficulty] ?? DIFFICULTY_DOT_CLS[3];
        const workYears = c.post_study_work_months >= 12
          ? `${(c.post_study_work_months / 12).toFixed(c.post_study_work_months % 12 === 0 ? 0 : 1)} ${t("yrs", "лет")}`
          : `${c.post_study_work_months} ${t("mo", "мес")}`;

        return (
          <motion.div
            key={c.country + i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
              <h4 className="font-heading font-bold text-[15px] sm:text-base text-foreground tracking-tight">
                {c.country}
              </h4>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("Pathway from arrival", "Путь от приезда")}
              </span>
            </div>

            {/* 3-stage timeline grid */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {/* Stage 1: visa difficulty */}
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Plane className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("Visa", "Виза")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`block h-2 w-2 rounded-full ${dotCls}`} />
                  <span className="text-sm font-semibold text-foreground">{difficultyLabel}</span>
                </div>
                {/* 5-segment difficulty meter */}
                <div className="flex gap-0.5 mt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div
                      key={n}
                      className={`h-1 flex-1 rounded-full transition-colors ${n <= c.student_visa_difficulty ? dotCls : "bg-muted/60"}`}
                    />
                  ))}
                </div>
              </div>

              {/* Stage 2: post-study work */}
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Briefcase className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("Work permit", "Раб. виза")}
                  </span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {c.post_study_work_months > 0 ? workYears : t("None", "Нет")}
                </div>
                {c.post_study_work_months > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("after graduation", "после выпуска")}
                  </p>
                )}
              </div>

              {/* Stage 3: PR pathway */}
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Home className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("PR path", "ВНЖ")}
                  </span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {c.pr_pathway_years !== null
                    ? `${c.pr_pathway_years} ${t("yrs", "лет")}`
                    : t("Limited", "Ограничен")}
                </div>
                {c.pr_pathway_years !== null && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("typical timeline", "обычный срок")}
                  </p>
                )}
              </div>
            </div>

            {/* Key challenges */}
            {c.key_challenges.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
                    {t("Plan around", "Учитывайте")}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {c.key_challenges.slice(0, 3).map((ch, idx) => (
                    <li key={idx} className="text-[12px] text-foreground/85 leading-snug pl-5 relative">
                      <span className="absolute left-1 top-2 h-1 w-1 rounded-full bg-amber-500" />
                      {ch}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
