/**
 * 03 · What to Write — 3 essay angles.
 *
 * Each angle: oversized numbered display label (01/02/03 serif), title,
 * then 3 labeled paragraphs — Why it works, Anchor with, Plays best to.
 * Stacked vertically with strong section dividers between angles.
 * Evokes a magazine feature spread.
 */
import React from "react";
import { SectionDivider } from "../primitives/SectionDivider";
import { LeadParagraph } from "../primitives/LeadParagraph";
import { SECTION_KICKERS, type WhatToWritePayload, type EssayEntry } from "../types";

const Field: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div>
    <div className="font-heading text-[10.5px] uppercase tracking-[0.28em] text-gold-dark font-semibold mb-1.5">
      {label}
    </div>
    <p className="font-heading text-foreground/85 text-[15.5px] leading-[1.65]">
      {text}
    </p>
  </div>
);

const AnglePanel: React.FC<{ index: number; angle: EssayEntry }> = ({ index, angle }) => {
  const num = String(index + 1).padStart(2, "0");
  return (
    <article className="grid grid-cols-[auto_1fr] gap-x-6 sm:gap-x-10 items-start">
      <div className="font-heading font-bold text-gold-dark/35 text-5xl sm:text-7xl leading-none tracking-tighter">
        {num}
      </div>
      <div className="space-y-5 pt-1 sm:pt-2">
        <h3 className="font-heading font-bold text-foreground text-2xl sm:text-3xl tracking-[-0.02em] leading-tight">
          {angle.title}
        </h3>
        {angle.whyItWorks && <Field label="Why it works" text={angle.whyItWorks} />}
        {angle.anchorItWith && <Field label="Anchor it with" text={angle.anchorItWith} />}
        {angle.playsBestTo && <Field label="Plays best to" text={angle.playsBestTo} />}
      </div>
    </article>
  );
};

export const WhatToWrite: React.FC<{ payload: WhatToWritePayload }> = ({ payload }) => {
  const kicker = payload.kicker ?? SECTION_KICKERS.whatToWrite;
  const headline = payload.headline ?? "What to write";
  const entries = payload.entries ?? [];
  return (
    <section id="brief-what-to-write">
      <SectionDivider kicker={kicker} headline={headline} />
      {payload.lead && <LeadParagraph text={payload.lead} />}
      <div className="mt-12 max-w-3xl mx-auto space-y-12 sm:space-y-16">
        {entries.map((angle, i) => (
          <React.Fragment key={`${angle.title}-${i}`}>
            {i > 0 && (
              <div className="flex justify-center" aria-hidden>
                <span className="text-gold/40 font-heading text-lg tracking-widest">· · ·</span>
              </div>
            )}
            <AnglePanel index={i} angle={angle} />
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};
