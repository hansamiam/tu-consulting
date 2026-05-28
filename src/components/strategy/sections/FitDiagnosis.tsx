// Fit Diagnosis — list of subcategory rows with the closed-set
// verdict and one-sentence reason.
//
// v3 redesign: no bordered card wrapping. Each row is just a tight
// label / verdict / reason group, separated by hairline dividers.

import { SectionHead } from "../primitives";
import type { FitRow, Language } from "../types";
import { t } from "../types";

interface Props {
  rows: FitRow[];
  language: Language;
}

export const FitDiagnosis = ({ rows, language }: Props) => {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="mb-6">
      <SectionHead>{t(language, "Fit Diagnosis", "Диагностика fit")}</SectionHead>
      <div>
        {rows.map((row, i) => (
          <div
            key={i}
            className={`py-3 ${i < rows.length - 1 ? "border-b border-foreground/10" : "pb-0"} ${i === 0 ? "pt-0" : ""}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-1">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-foreground/55 w-[140px] shrink-0">
                {row.subcategory}
              </span>
              <span className="font-heading text-[14px] sm:text-[14.5px] font-bold text-foreground tracking-tight">
                {row.verdict}
              </span>
            </div>
            {row.reason && (
              <p className="text-[12.5px] leading-[1.5] text-foreground/72 m-0 sm:pl-[152px]">
                {row.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
