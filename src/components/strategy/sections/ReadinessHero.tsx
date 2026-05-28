// Sub-masthead under the formal Top Uni masthead. Holds the
// substantive headline + the Readiness Score label/dots.
//
// Applicant-type label is intentionally NOT rendered here — the LLM
// weaves the identity into the headline prose instead (Samuel's
// 2026-05-28 feedback: pill stamp reads cringy / class-reveal-y).

import type { Language } from "../types";
import { t } from "../types";

interface Props {
  headline: string;
  readinessScore: number; // 0..5
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
            className="relative w-4 h-4 rounded-full border-2 border-gold/60 bg-transparent overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-gold-dark"
              style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
            />
          </div>
        );
      })}
      <span className="ml-2 font-heading text-[15px] font-bold text-foreground tabular-nums">
        {score.toFixed(1).replace(/\.0$/, "")}<span className="text-foreground/40"> / 5</span>
      </span>
    </div>
  );
};

export const ReadinessHero = ({ headline, readinessScore, language }: Props) => {
  return (
    <section className="mb-8 sm:mb-10">
      <h1 className="font-heading text-[24px] sm:text-[32px] font-bold leading-[1.18] tracking-tight text-foreground m-0 mb-6 max-w-3xl">
        {headline || t(language, "Your strategy is ready.", "Ваша стратегия готова.")}
      </h1>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/55">
          {t(language, "Readiness Score", "Уровень готовности")}
        </span>
        <ScoreDots score={readinessScore} />
      </div>
    </section>
  );
};
