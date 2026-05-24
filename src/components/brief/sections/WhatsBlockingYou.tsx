/**
 * 04 · What's Blocking You — 2-3 priority-coded gaps.
 *
 * Each gap card: priority label (HIGH PRIORITY / MEDIUM in colored caps),
 * title, why-matters body, gold "This month:" action box, 60-day plan
 * line below. Cards stacked vertically, max-width matches prose.
 */
import React from "react";
import { SectionDivider } from "../primitives/SectionDivider";
import { LeadParagraph } from "../primitives/LeadParagraph";
import { EditorialCard } from "../primitives/EditorialCard";
import { SECTION_KICKERS, type WhatsBlockingYouPayload, type GapEntry } from "../types";

const PRIORITY_META = {
  high: { label: "High priority", accent: "rose", color: "text-rose-500" },
  medium: { label: "Medium priority", accent: "amber", color: "text-amber-600 dark:text-amber-400" },
} as const;

const GapPanel: React.FC<{ gap: GapEntry }> = ({ gap }) => {
  const meta = PRIORITY_META[gap.priority] ?? PRIORITY_META.medium;
  return (
    <EditorialCard accent={meta.accent}>
      <div className={`font-heading text-[10.5px] uppercase tracking-[0.28em] font-semibold mb-3 ${meta.color}`}>
        {meta.label}
      </div>
      <h3 className="font-heading font-bold text-foreground text-xl sm:text-2xl tracking-[-0.015em] leading-tight">
        {gap.title}
      </h3>
      {gap.whyItMatters && (
        <p className="font-heading text-foreground/80 text-[15.5px] leading-[1.65] mt-3">
          {gap.whyItMatters}
        </p>
      )}
      {gap.actionThisMonth && (
        <div className="mt-5 bg-gold/10 border-l-2 border-gold-dark px-4 py-3 rounded-r-sm">
          <div className="font-heading text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">
            This month
          </div>
          <p className="font-heading text-foreground text-[15px] leading-snug font-medium">
            {gap.actionThisMonth}
          </p>
        </div>
      )}
      {gap.next60Days && (
        <div className="mt-3 flex gap-2.5 items-start">
          <span className="font-heading text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mt-0.5 shrink-0">
            Next 60 days
          </span>
          <span className="font-heading text-muted-foreground text-[14px] leading-snug">
            {gap.next60Days}
          </span>
        </div>
      )}
    </EditorialCard>
  );
};

export const WhatsBlockingYou: React.FC<{ payload: WhatsBlockingYouPayload }> = ({ payload }) => {
  const kicker = payload.kicker ?? SECTION_KICKERS.whatsBlockingYou;
  const headline = payload.headline ?? "What's blocking you";
  const entries = payload.entries ?? [];

  // Sort high → medium so urgency reads first
  const ordered = [...entries].sort((a, b) => (a.priority === "high" ? -1 : 1));

  if (ordered.length === 0) {
    // Graceful empty state — student is in good shape on the checked dimensions
    return (
      <section id="brief-whats-blocking-you">
        <SectionDivider kicker={kicker} headline={headline} />
        {payload.lead && <LeadParagraph text={payload.lead} />}
        <p className="mt-8 text-center font-heading italic text-muted-foreground max-w-xl mx-auto">
          No urgent gaps surfaced. Move straight to your action plan.
        </p>
      </section>
    );
  }

  return (
    <section id="brief-whats-blocking-you">
      <SectionDivider kicker={kicker} headline={headline} />
      {payload.lead && <LeadParagraph text={payload.lead} />}
      <div className="mt-10 space-y-4 sm:space-y-5 max-w-3xl mx-auto">
        {ordered.map((gap, i) => (
          <GapPanel key={`${gap.title}-${i}`} gap={gap} />
        ))}
      </div>
    </section>
  );
};
