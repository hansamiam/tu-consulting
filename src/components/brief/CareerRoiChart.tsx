import { motion } from "framer-motion";
import { Briefcase, TrendingUp } from "lucide-react";
import type { CareerRoiSection } from "@/types/briefStructured";

const fmtSalary = (v: number) => v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

/* CareerRoiChart — per-university salary band + employment rate + employer
   chips. Renders as a stacked vertical card per university with a horizontal
   bar showing the salary range relative to the cohort max. */
export const CareerRoiChart = ({
  data, isRu,
}: {
  data: CareerRoiSection;
  isRu: boolean;
}) => {
  const t = (en: string, ru: string) => (isRu ? ru : en);
  if (!data.universities || data.universities.length === 0) return null;

  const cohortMax = Math.max(...data.universities.map(u => u.starting_salary_max_usd));

  return (
    <div className="not-prose mb-6 space-y-3">
      {data.universities.slice(0, 3).map((u, i) => {
        const lowPct = (u.starting_salary_min_usd / cohortMax) * 100;
        const highPct = (u.starting_salary_max_usd / cohortMax) * 100;

        return (
          <motion.div
            key={u.name + i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h4 className="font-heading font-bold text-[15px] sm:text-base text-foreground tracking-tight leading-tight min-w-0 truncate">
                {u.name}
              </h4>
              <div className="flex items-center gap-3 shrink-0 text-[11px]">
                <span className="inline-flex items-center gap-1 text-foreground/70">
                  <Briefcase className="w-3 h-3 text-gold-dark" />
                  <span className="font-semibold tabular-nums">{u.employment_rate_6mo_pct}%</span>
                  <span className="text-muted-foreground">{t(" hired @ 6mo", " трудоуст. за 6 мес")}</span>
                </span>
              </div>
            </div>

            {/* Salary range bar */}
            <div className="relative h-7 mb-3 rounded-md overflow-hidden bg-muted/40">
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: `${highPct - lowPct}%`, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-0 h-full bg-gradient-to-r from-gold/70 to-gold-dark"
                style={{ left: `${lowPct}%` }}
              />
              {/* Salary labels overlaid */}
              <div className="absolute inset-0 flex items-center justify-between px-2 text-[11px] font-bold tabular-nums">
                <span style={{ marginLeft: `${Math.min(lowPct, 60)}%` }} className="text-foreground/80 -translate-x-2">
                  {fmtSalary(u.starting_salary_min_usd)}
                </span>
                <span className="text-foreground/80">{fmtSalary(u.starting_salary_max_usd)}</span>
              </div>
            </div>

            {/* Notable employers — chips */}
            {u.notable_employers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {u.notable_employers.slice(0, 4).map((e, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 border border-border text-foreground/75 truncate max-w-[140px]"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}

            {/* 5-year trajectory */}
            {u.five_year_trajectory && (
              <p className="text-[12px] text-muted-foreground leading-snug flex items-start gap-1.5 mt-2">
                <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-gold-dark/70" />
                <span>{u.five_year_trajectory}</span>
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
