/**
 * 03 · How You'll Pay — 3-5 scholarships chronological by deadline.
 *
 * Each scholarship is a row-shaped EditorialCard: left rail with
 * deadline countdown, right body with name + coverage + how-profile-maps
 * + "Start with:" first-task. Stacking note rendered as PullQuote at
 * section bottom.
 */
import React from "react";
import { SectionDivider } from "../primitives/SectionDivider";
import { LeadParagraph } from "../primitives/LeadParagraph";
import { EditorialCard } from "../primitives/EditorialCard";
import { PullQuote } from "../primitives/PullQuote";
import { SECTION_KICKERS, type HowYoullPayPayload, type ScholarshipEntry } from "../types";

const formatDeadline = (raw: string | undefined): { label: string; urgent: boolean } => {
  if (!raw) return { label: "Deadline TBA", urgent: false };
  const trimmed = raw.trim();
  // Static strings
  if (/^(rolling|tba|n\/?a)$/i.test(trimmed)) {
    return { label: trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase(), urgent: false };
  }
  // ISO date?
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { label: "Closed", urgent: false };
    if (days === 0) return { label: "Today", urgent: true };
    if (days < 30) return { label: `${days} days`, urgent: true };
    if (days < 90) return { label: `${days} days`, urgent: false };
    return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), urgent: false };
  }
  return { label: trimmed, urgent: false };
};

const ScholarshipRow: React.FC<{ s: ScholarshipEntry }> = ({ s }) => {
  const deadline = formatDeadline(s.deadline);
  return (
    <EditorialCard accent="gold">
      <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6">
        {/* Right rail (visually) — deadline + coverage badges. On mobile sits above. */}
        <aside className="sm:order-2 sm:w-32 sm:shrink-0 sm:text-right flex sm:block items-center gap-3 mb-3 sm:mb-0">
          <div
            className={`font-heading text-[11px] uppercase tracking-[0.22em] font-semibold ${
              deadline.urgent ? "text-rose-500" : "text-muted-foreground"
            }`}
          >
            {deadline.label}
          </div>
          {s.awardText && (
            <div className="font-heading text-[12px] text-foreground mt-0 sm:mt-1.5">
              {s.awardText}
            </div>
          )}
        </aside>
        {/* Body */}
        <div className="sm:order-1 flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3 className="font-heading font-bold text-foreground text-lg sm:text-xl tracking-[-0.01em] leading-tight">
              {s.name}
            </h3>
            {s.coverage && (
              <span className="font-heading text-[10.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm bg-gold/15 text-gold-dark font-semibold">
                {s.coverage}
              </span>
            )}
          </div>
          {s.howProfileMaps && (
            <p className="font-heading text-foreground/80 text-[15px] leading-[1.65] mt-3">
              {s.howProfileMaps}
            </p>
          )}
          {s.firstTask && (
            <div className="mt-4 flex gap-2.5 items-start">
              <span className="font-heading text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold mt-1 shrink-0">
                Start with
              </span>
              <span className="font-heading text-foreground text-[14.5px] leading-snug">
                {s.firstTask}
              </span>
            </div>
          )}
        </div>
      </div>
    </EditorialCard>
  );
};

export const HowYoullPay: React.FC<{ payload: HowYoullPayPayload }> = ({ payload }) => {
  const kicker = payload.kicker ?? SECTION_KICKERS.howYoullPay;
  const headline = payload.headline ?? "How you'll pay";
  const entries = payload.entries ?? [];
  return (
    <section id="brief-how-youll-pay">
      <SectionDivider kicker={kicker} headline={headline} />
      {payload.lead && <LeadParagraph text={payload.lead} />}
      <div className="mt-10 space-y-4 sm:space-y-5 max-w-3xl mx-auto">
        {entries.map((s, i) => (
          <ScholarshipRow key={`${s.name}-${i}`} s={s} />
        ))}
      </div>
      {payload.stackingNote && (
        <PullQuote text={payload.stackingNote} label="How to stack" />
      )}
    </section>
  );
};
