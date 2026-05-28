// Formal consulting-dossier masthead — McKinsey executive-summary
// title block. 2026-05-29 redesign per Samuel:
//   • Centered bold "TOP UNI STRATEGY REPORT" title (with the small
//     existing favicon-style mark — keeps it identifiable but minimal)
//   • Structured single-line meta:
//       "Prepared for: Alisher M. | Track: Master's (Data Science)
//        | Target: USA / Canada"
//   • Confidential disclaimer below
// One hairline rule under the whole block separates it from the body.

import type { Language, StrategyReportV2 } from "../types";
import { t } from "../types";

interface Props {
  firstName: string;
  language: Language;
  generatedAt: string;
  /** From the original intake — drives the meta tagline below the title. */
  targetDegree?: StrategyReportV2["targetDegree"];
  fieldOfStudy?: string;
  targetCountries?: string[];
}

const DEGREE_LABEL: Record<Required<StrategyReportV2>["targetDegree"], { en: string; ru: string }> = {
  bachelor: { en: "Bachelor's", ru: "Бакалавриат" },
  master:   { en: "Master's",   ru: "Магистратура" },
  phd:      { en: "PhD",        ru: "PhD" },
};

export const Masthead = ({
  firstName,
  language,
  generatedAt,
  targetDegree,
  fieldOfStudy,
  targetCountries,
}: Props) => {
  const dateStr = (() => {
    try {
      return new Date(generatedAt).toLocaleDateString(
        language === "ru" ? "ru-RU" : "en-US",
        { day: "numeric", month: "long", year: "numeric" },
      );
    } catch {
      return "";
    }
  })();

  const degreeLabel = targetDegree ? DEGREE_LABEL[targetDegree][language] : "";
  const trackBits = [degreeLabel, fieldOfStudy].filter(Boolean);
  const trackStr = trackBits.length === 2 ? `${trackBits[0]} (${trackBits[1]})` : trackBits[0] || "";
  const targetStr = (targetCountries ?? []).slice(0, 3).join(" / ");

  const metaParts: string[] = [];
  if (firstName) metaParts.push(`${t(language, "Prepared for", "Подготовлено для")}: ${firstName}`);
  if (trackStr) metaParts.push(`${t(language, "Track", "Трек")}: ${trackStr}`);
  if (targetStr) metaParts.push(`${t(language, "Target", "Цель")}: ${targetStr}`);

  return (
    <header className="mb-6 pb-5 border-b border-foreground/15">
      {/* Centered title block — small mark, big bold title */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          {/* Inline mark — geometric T monogram. Stays brand-mark
              minimal; no external favicon import. */}
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="text-gold-dark">
            <path
              d="M4 4h16v4H14v12h-4V8H4V4z"
              fill="currentColor"
            />
          </svg>
          <p className="font-heading text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.32em] text-foreground/80 m-0">
            {t(language, "Top Uni", "Top Uni")}
          </p>
        </div>
        <h2 className="font-heading text-[20px] sm:text-[24px] font-bold tracking-[-0.01em] text-foreground m-0">
          {t(language, "Strategy Report", "Стратегический отчёт")}
        </h2>
      </div>

      {/* Meta line — Prepared for | Track | Target. Wraps on mobile. */}
      {metaParts.length > 0 && (
        <p className="text-[11px] sm:text-[12px] leading-[1.5] text-foreground/65 text-center m-0 mb-2.5">
          {metaParts.join("  |  ")}
        </p>
      )}

      {/* Date + confidential line at the bottom */}
      <div className="flex flex-col items-center gap-1">
        {dateStr && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/45 m-0 tabular-nums">
            {dateStr}
          </p>
        )}
        <p className="text-[9.5px] sm:text-[10px] uppercase tracking-[0.18em] text-foreground/45 m-0">
          {t(
            language,
            "Confidential · Do not distribute without written permission from Top Uni.",
            "Конфиденциально · Не распространять без письменного разрешения Top Uni.",
          )}
        </p>
      </div>
    </header>
  );
};
