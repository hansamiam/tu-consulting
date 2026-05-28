// v4 primitives — McKinsey Word doc aesthetic.
// One section pattern: ALL-CAPS bold label on its own line, content below.
// No gold rules, no eyebrows, no colored cards, no italic, no chrome.

import type { ReactNode } from "react";

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark m-0 mb-1.5">
    <span className="inline-block w-3 h-[2px] bg-gold align-middle mr-2 -mt-0.5" />
    {children}
  </p>
);

/** One-liner: inline ALL-CAPS label + value on the same baseline.
 *  Used for the READINESS SCORE / BEST-FIT PATHWAY stat lines. */
export const StatLine = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex items-baseline gap-3 mb-1">
    <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-foreground/80 w-[150px] shrink-0">
      {label}
    </span>
    <div className="flex-1">{children}</div>
  </div>
);
