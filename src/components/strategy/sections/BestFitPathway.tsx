// Small strategic-frame badge between Headline and HonestDiagnosis.
// Tells the reader "I'm a [Funding-first / Research-first / etc.]
// applicant" in one glance, before they dive into the diagnosis.

import type { Language } from "../types";
import { t } from "../types";

interface Props {
  label: string;
  language: Language;
}

export const BestFitPathway = ({ label, language }: Props) => {
  if (!label) return null;
  return (
    <section className="mb-7 sm:mb-8">
      <div className="inline-flex items-baseline gap-2.5 rounded-full bg-foreground/[0.04] border border-foreground/15 px-4 py-1.5">
        <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">
          {t(language, "Best-Fit Pathway", "Лучшая стратегия")}
        </span>
        <span className="font-heading text-[13.5px] sm:text-[14.5px] font-bold text-foreground tracking-tight">
          {label}
        </span>
      </div>
    </section>
  );
};
