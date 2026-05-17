/**
 * SectionDivider — the numbered editorial section break.
 *
 * Renders as a thin gold rule + numbered kicker label + section heading
 * in display serif. Each magazine section starts with one of these so
 * the brief reads as numbered chapters of a single argument, not a
 * stack of detached cards.
 *
 * Used by every section in the BriefMagazine renderer.
 */
import React from "react";

interface Props {
  /** Numbered kicker like "01 · Where you stand". Comes from the LLM
   *  payload's `kicker` field so the model controls the exact wording. */
  kicker: string;
  /** Display headline — short, ≤8 words. Display serif. */
  headline: string;
}

export const SectionDivider: React.FC<Props> = ({ kicker, headline }) => {
  return (
    <header className="mt-16 sm:mt-24 mb-8 sm:mb-10">
      {/* Top gold rule + kicker baseline */}
      <div className="flex items-baseline gap-4 mb-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-gold/60" aria-hidden />
        <span className="font-heading text-[11px] uppercase tracking-[0.28em] text-gold-dark font-semibold whitespace-nowrap">
          {kicker}
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/40 to-gold/60" aria-hidden />
      </div>
      {/* Display headline */}
      <h2 className="font-heading font-bold text-foreground text-3xl sm:text-4xl tracking-[-0.02em] leading-[1.05] text-center max-w-3xl mx-auto">
        {headline}
      </h2>
    </header>
  );
};
