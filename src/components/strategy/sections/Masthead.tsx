// Formal consulting-dossier masthead.
//
// Aesthetic: small uppercase TOP UNI / STRATEGY lock-up, confidential
// disclaimer, "Prepared for: {firstName}" line. Reads like the cover
// of a Bain/McKinsey-style printable deliverable, not an AI saas hero.

import type { Language } from "../types";
import { t } from "../types";

interface Props {
  firstName: string;
  language: Language;
  generatedAt: string;
}

export const Masthead = ({ firstName, language, generatedAt }: Props) => {
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

  return (
    <header className="mb-6 sm:mb-7 pb-5 border-b border-foreground/15">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="font-heading text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.32em] text-gold-dark m-0">
          {t(language, "Top Uni", "Top Uni")}
          <span className="mx-2 opacity-40">·</span>
          {t(language, "Strategy", "Стратегия")}
        </p>
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-foreground/45 m-0 tabular-nums">
          {dateStr}
        </p>
      </div>

      <p className="text-[10px] sm:text-[10.5px] leading-[1.5] text-foreground/50 m-0 mb-4 max-w-2xl uppercase tracking-[0.14em]">
        {t(
          language,
          "Confidential · Do not distribute without written permission from Top Uni.",
          "Конфиденциально · Не распространять без письменного разрешения Top Uni.",
        )}
      </p>

      <div className="flex items-baseline gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55">
          {t(language, "Prepared for", "Подготовлено для")}
        </span>
        <span className="font-heading text-[18px] sm:text-[20px] font-bold tracking-tight text-foreground">
          {firstName || t(language, "you", "вас")}
        </span>
      </div>
    </header>
  );
};
