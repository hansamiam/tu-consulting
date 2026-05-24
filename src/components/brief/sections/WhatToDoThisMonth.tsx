/**
 * 05 · What to Do This Month — 4-week closing action plan.
 *
 * Each week: large week number on the left, italic focus sentence as
 * row lead, then 3-5 visual checkboxes (no persistence in v1).
 * Closing line as a centered all-caps tag at the very bottom — gives
 * the brief a satisfying close.
 */
import React from "react";
import { SectionDivider } from "../primitives/SectionDivider";
import { LeadParagraph } from "../primitives/LeadParagraph";
import { SECTION_KICKERS, type WhatToDoThisMonthPayload, type WeekBlock } from "../types";

const WeekRow: React.FC<{ index: number; week: WeekBlock }> = ({ index, week }) => {
  const num = String(index + 1);
  return (
    <article className="grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-8 items-start py-6 sm:py-8 border-t border-border first:border-t-0">
      <div className="text-center pt-1">
        <div className="font-heading text-[10px] uppercase tracking-[0.28em] text-gold-dark font-semibold">
          Week
        </div>
        <div className="font-heading font-bold text-foreground text-4xl sm:text-5xl leading-none tracking-tighter mt-1">
          {num}
        </div>
      </div>
      <div className="min-w-0">
        {week.focus && (
          <p className="font-heading italic text-foreground text-base sm:text-lg leading-snug mb-3">
            {week.focus}
          </p>
        )}
        <ul className="space-y-2">
          {(week.tasks ?? []).map((task, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-1 h-4 w-4 rounded-sm border border-border bg-canvas-soft shrink-0"
                aria-hidden
              />
              <span className="font-heading text-foreground/85 text-[15px] leading-snug">
                {task}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
};

export const WhatToDoThisMonth: React.FC<{ payload: WhatToDoThisMonthPayload }> = ({ payload }) => {
  const kicker = payload.kicker ?? SECTION_KICKERS.whatToDoThisMonth;
  const headline = payload.headline ?? "What to do this month";
  const weeks = payload.weeks ?? [];
  return (
    <section id="brief-what-to-do-this-month">
      <SectionDivider kicker={kicker} headline={headline} />
      {payload.lead && <LeadParagraph text={payload.lead} />}
      <div className="mt-10 max-w-3xl mx-auto">
        {weeks.map((week, i) => (
          <WeekRow key={i} index={i} week={week} />
        ))}
      </div>
      {payload.closingLine && (
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-flex items-center gap-4">
            <span className="h-px w-8 bg-gold-dark/60" aria-hidden />
            <span className="font-heading italic text-gold-dark text-base sm:text-lg tracking-[0.02em]">
              {payload.closingLine}
            </span>
            <span className="h-px w-8 bg-gold-dark/60" aria-hidden />
          </div>
        </div>
      )}
    </section>
  );
};
