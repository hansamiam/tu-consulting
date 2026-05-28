// Headline + Readiness Score + Best-Fit Pathway.
// No "Executive Summary" eyebrow above the headline — the masthead
// already framed the doc. Just the headline as the title, then two
// stat lines below.

import { StatLine } from "../primitives";
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
    <span className="inline-flex items-center gap-1.5" aria-label={`Readiness score ${score} out of 5`}>
      {dots.map((n) => {
        const fill = Math.max(0, Math.min(1, score - (n - 1)));
        return (
          <span
            key={n}
            className="relative inline-block w-3 h-3 rounded-full border-[1.5px] border-foreground/40 bg-transparent overflow-hidden"
          >
            <span
              className="absolute inset-0 bg-foreground"
              style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
            />
          </span>
        );
      })}
      <span className="ml-2 text-[13px] font-bold text-foreground tabular-nums">
        {score.toFixed(1).replace(/\.0$/, "")}
        <span className="text-foreground/40"> / 5</span>
      </span>
    </span>
  );
};

export const ReadinessHero = ({
  headline,
  readinessScore,
  bestFitPathway,
  language,
}: Props) => {
  return (
    <section className="mb-5">
      <h1 className="font-heading text-[19px] sm:text-[21px] font-bold leading-[1.3] tracking-tight text-foreground m-0 mb-5">
        {headline || t(language, "Your strategy is ready.", "Ваша стратегия готова.")}
      </h1>

      <StatLine label={t(language, "Readiness Score", "Готовность")}>
        <ScoreDots score={readinessScore} />
      </StatLine>
      {bestFitPathway && (
        <StatLine label={t(language, "Best-Fit Pathway", "Стратегия")}>
          <span className="text-[13px] font-bold text-foreground">{bestFitPathway}</span>
        </StatLine>
      )}
    </section>
  );
};
