/**
 * 02 · Where You Can Land — 3 schools (reach / target / safety).
 *
 * Each school renders as an EditorialCard with a tier accent. Display
 * layout: 1-col on mobile, 3-up on desktop. Card content reads top-to-
 * bottom: tier kicker → school name → italic why-fits lead → small-caps
 * threshold line → gold career-anchor strapline.
 */
import React from "react";
import { SectionDivider } from "../primitives/SectionDivider";
import { LeadParagraph } from "../primitives/LeadParagraph";
import { EditorialCard } from "../primitives/EditorialCard";
import { SECTION_KICKERS, type WhereYouCanLandPayload, type SchoolEntry } from "../types";

const TIER_LABEL: Record<SchoolEntry["tier"], string> = {
  reach: "Reach",
  target: "Target",
  safety: "Safety",
};

const TIER_ACCENT = {
  reach: "rose",
  target: "gold",
  safety: "emerald",
} as const;

const SchoolPanel: React.FC<{ school: SchoolEntry }> = ({ school }) => {
  return (
    <EditorialCard accent={TIER_ACCENT[school.tier]}>
      <div className="font-heading text-[10.5px] uppercase tracking-[0.28em] text-muted-foreground font-semibold mb-3">
        {TIER_LABEL[school.tier]}
      </div>
      <div className="font-heading font-bold text-foreground text-xl sm:text-2xl tracking-[-0.015em] leading-tight">
        {school.name}
      </div>
      {school.country && (
        <div className="font-heading text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
          {school.country}
        </div>
      )}
      {school.whyItFits && (
        <p className="font-heading italic text-foreground/80 text-[15px] leading-[1.55] mt-4">
          {school.whyItFits}
        </p>
      )}
      {school.threshold && (
        <div className="mt-5 pt-4 border-t border-border/60 font-heading text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          {school.threshold}
        </div>
      )}
      {school.careerAnchor && (
        <div className="mt-2 font-heading text-[13px] text-gold-dark font-medium leading-snug">
          {school.careerAnchor}
        </div>
      )}
    </EditorialCard>
  );
};

export const WhereYouCanLand: React.FC<{ payload: WhereYouCanLandPayload }> = ({ payload }) => {
  const kicker = payload.kicker ?? SECTION_KICKERS.whereYouCanLand;
  const headline = payload.headline ?? "Where you can land";
  const entries = payload.entries ?? [];
  // Sort reach → target → safety regardless of model order
  const ordered = [...entries].sort((a, b) => {
    const order = { reach: 0, target: 1, safety: 2 };
    return (order[a.tier] ?? 9) - (order[b.tier] ?? 9);
  });
  return (
    <section id="brief-where-you-can-land">
      <SectionDivider kicker={kicker} headline={headline} />
      {payload.lead && <LeadParagraph text={payload.lead} />}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
        {ordered.map((school, i) => (
          <SchoolPanel key={`${school.tier}-${i}`} school={school} />
        ))}
      </div>
    </section>
  );
};
