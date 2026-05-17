/**
 * 01 · Where You Stand — opening section.
 *
 * Drop-cap lead → 2-3 short paragraphs → gold-bordered pull-quote
 * carrying the 30-day call. Sets the editorial tone for the whole brief.
 */
import React from "react";
import { SectionDivider } from "../primitives/SectionDivider";
import { LeadParagraph } from "../primitives/LeadParagraph";
import { EditorialProse } from "../primitives/EditorialProse";
import { PullQuote } from "../primitives/PullQuote";
import { SECTION_KICKERS, type WhereYouStandPayload } from "../types";

export const WhereYouStand: React.FC<{ payload: WhereYouStandPayload }> = ({ payload }) => {
  const kicker = payload.kicker ?? SECTION_KICKERS.whereYouStand;
  const headline = payload.headline ?? "Where you stand";
  return (
    <section id="brief-where-you-stand">
      <SectionDivider kicker={kicker} headline={headline} />
      {payload.lead && <LeadParagraph text={payload.lead} />}
      {payload.body && (
        <div className="mt-7">
          <EditorialProse text={payload.body} />
        </div>
      )}
      {payload.pullquote && (
        <PullQuote text={payload.pullquote} label="Your 30-day call" />
      )}
    </section>
  );
};
