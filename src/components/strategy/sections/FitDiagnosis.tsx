// v4: dead-simple rows. Subcategory label + verdict on one baseline,
// reason on the next line. No card, no rules, no dividers — just type.

import { SectionLabel } from "../primitives";
import type { FitRow, Language } from "../types";
import { t } from "../types";

interface Props {
  rows: FitRow[];
  language: Language;
}

export const FitDiagnosis = ({ rows, language }: Props) => {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="mb-5">
      <SectionLabel>{t(language, "Fit Diagnosis", "Диагностика fit")}</SectionLabel>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={i}>
            <div className="flex flex-wrap items-baseline gap-x-2 mb-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-foreground/55">
                {row.subcategory}
              </span>
              <span className="text-[13px] font-bold text-foreground">
                {row.verdict}
              </span>
            </div>
            {row.reason && (
              <p className="text-[12.5px] leading-[1.5] text-foreground/72 m-0">
                {row.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
