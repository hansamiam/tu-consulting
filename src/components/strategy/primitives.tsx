// Reusable visual primitives for the v2 strategy dossier.
// Lifted from src/pages/StrategyPreview.tsx (the design-review mock)
// and consolidated here so every section can compose them.

import type { ReactNode } from "react";

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-gold-dark m-0">
    {children}
  </p>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="font-heading text-[16px] sm:text-[17px] font-bold tracking-tight text-foreground m-0">
    {children}
  </h2>
);

export const SectionSpacer = ({ children }: { children: ReactNode }) => (
  <section className="mb-8 sm:mb-10">{children}</section>
);
