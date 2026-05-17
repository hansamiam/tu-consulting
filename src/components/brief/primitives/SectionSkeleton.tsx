/**
 * SectionSkeleton — placeholder for a section that hasn't streamed yet.
 *
 * Magazine version of the typical "shimmer block" — keeps the layout
 * stable so when the real section snaps in, no jumpy scroll.
 */
import React from "react";

interface Props {
  /** Numbered kicker so the user can see which section is loading. */
  kicker: string;
}

export const SectionSkeleton: React.FC<Props> = ({ kicker }) => {
  return (
    <section className="mt-16 sm:mt-24 mb-8 sm:mb-10" aria-busy="true" aria-live="polite">
      <div className="flex items-baseline gap-4 mb-4">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="font-heading text-[11px] uppercase tracking-[0.28em] text-muted-foreground/60 font-semibold whitespace-nowrap">
          {kicker}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-9 sm:h-12 bg-muted/30 rounded-md mx-auto w-2/3 animate-pulse" />
        <div className="h-5 bg-muted/20 rounded-sm mx-auto w-3/4 animate-pulse" />
        <div className="h-5 bg-muted/20 rounded-sm mx-auto w-2/3 animate-pulse" />
      </div>
    </section>
  );
};
