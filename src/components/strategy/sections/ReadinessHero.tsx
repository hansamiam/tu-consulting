import { Compass } from "lucide-react";
import { Eyebrow } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  headline: string;
  applicantTypeLabel: string;
  applicantTypeFraming: string;
  readinessScore: number; // 0..5
  language: Language;
  generatedAt: string;
}

const ScoreDots = ({ score }: { score: number }) => {
  // 5 dots, each filled in 0.5 steps. score is 0..5.
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
        {score.toFixed(1).replace(/\.0$/, "")}<span className="text-foreground/40">/5</span>
      </span>
    </div>
  );
};

export const ReadinessHero = ({
  headline,
  applicantTypeLabel,
  applicantTypeFraming,
  readinessScore,
  language,
  generatedAt,
}: Props) => {
  const dateStr = (() => {
    try {
      const d = new Date(generatedAt);
      return d.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch { return ""; }
  })();

  return (
    <header className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-3.5 h-3.5 text-gold-dark" strokeWidth={2} />
        <Eyebrow>{t(language, "Your strategy", "Ваша стратегия")} · {dateStr}</Eyebrow>
      </div>
      <h1 className="font-heading text-[28px] sm:text-[36px] font-bold leading-[1.1] tracking-tight text-foreground m-0 mb-4 max-w-3xl">
        {headline || (language === "ru" ? "Ваша стратегия готова." : "Your strategy is ready.")}
      </h1>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-3">
        <ScoreDots score={readinessScore} />
        <div className="inline-flex items-center gap-2 rounded-full bg-gold/12 border border-gold/30 px-3 py-1 text-[12px] font-bold text-gold-dark">
          <span className="opacity-70">{t(language, "Applicant type", "Тип кандидата")}:</span>
          <span>{applicantTypeLabel}</span>
        </div>
      </div>

      {applicantTypeFraming && (
        <p className="text-[15px] leading-[1.55] text-foreground/75 m-0 max-w-2xl">
          {applicantTypeFraming}
        </p>
      )}
    </header>
  );
};
