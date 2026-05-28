// Reusable visual primitives for the v3 strategy dossier.
//
// Aesthetic: McKinsey/BCG one-page-deliverable. Color used as ACCENT
// (gold for eyebrows, rules, key numbers; foreground for body; a
// single muted rose dot on weakness bullets). NO filled card
// backgrounds outside the Masthead disclaimer and the final
// MembershipCTA — those are the only two surfaces that earn presence.

import type { ReactNode } from "react";

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark m-0">
    {children}
  </p>
);

/**
 * Section head = small uppercase eyebrow + thin gold rule below. The
 * rule is the McKinsey-style accent that does the visual work
 * previously carried by rounded-2xl cards.
 */
export const SectionHead = ({ children }: { children: ReactNode }) => (
  <div className="mb-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark m-0 mb-1.5">
      {children}
    </p>
    <div className="h-px bg-gold/30" />
  </div>
);

/**
 * Inline-bold key/value row used for BestNextMove + DoNotWaste +
 * Evidence Gap. No card, no background, no border — just a tight
 * label-then-body structure.
 */
export const InlineLabelBlock = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="mb-3 last:mb-0">
    <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-gold-dark m-0 mb-1">
      {label}
    </p>
    <p className="text-[14px] sm:text-[14.5px] leading-[1.5] text-foreground m-0 font-medium">
      {children}
    </p>
  </div>
);
