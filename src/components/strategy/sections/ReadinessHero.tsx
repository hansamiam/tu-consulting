// Executive Summary block — headline + Readiness Score + Best-Fit
// Pathway as a tight stat-grid under the headline. No filled boxes;
// the eyebrow + thin gold rule does the visual work.

import { SectionHead } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  headline: string;
  readinessScore: number; // 0..5
  bestFitPathway: string;
  language: Language;
}

const ScoreDots = ({ score }: { score: number }) => {
  const dots = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1.5" aria-label={`Readiness score ${score} out of 5`}>
      {dots.map((n) => {
        const fill = Math.max(0, Math.min(1, score - (n - 1)));
        return (
          <div
            key={n}
            className="relative w-3.5 h-3.5 rounded-full border-[1.5px] border-gold/60 bg-transparent overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-gold-dark"
              style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
            />
          </div>
        );
      })}
      <span className="ml-1.5 font-heading text-[14.5px] font-bold text-foreground tabular-nums">
        {score.toFixed(1).replace(/\.0$/, "")}
        <span className="text-foreground/40"> / 5</span>
      </span>
    </div>
  );
};

const StatRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline gap-3">
    <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-foreground/55 w-[120px] shrink-0">
      {label}
    </span>
    <div className="flex-1">{children}</div>
  </div>
);

export const ReadinessHero = ({
  headline,
  readinessScore,
  bestFitPathway,
  language,
}: Props) => {
  return (
    <section className="mb-6">
      <SectionHead>{t(language, "Executive Summary", "Краткое резюме")}</SectionHead>

      <h1 className="font-heading text-[22px] sm:text-[28px] font-bold leading-[1.2] tracking-tight text-foreground m-0 mb-5 max-w-[640px]">
        {headline || t(language, "Your strategy is ready.", "Ваша стратегия готова.")}
      </h1>

      <div className="space-y-1.5">
        <StatRow label={t(language, "Readiness Score", "Готовность")}>
          <ScoreDots score={readinessScore} />
        </StatRow>
        {bestFitPathway && (
          <StatRow label={t(language, "Best-Fit Pathway", "Стратегия")}>
            <span className="font-heading text-[14.5px] font-bold text-foreground tracking-tight">
              {bestFitPathway}
            </span>
          </StatRow>
        )}
      </div>
    </section>
  );
};
