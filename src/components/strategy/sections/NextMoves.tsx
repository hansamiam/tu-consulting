// BestNextMove + DoNotWaste — paired one-liners.
//
// v3 redesign: drop the rose / gold callout cards entirely. Use the
// shared InlineLabelBlock primitive — eyebrow label + bold sentence.
// Two stacked rows, tight spacing.

import { InlineLabelBlock } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  bestNextMove: string;
  doNotWaste: string;
  language: Language;
}

export const NextMoves = ({ bestNextMove, doNotWaste, language }: Props) => {
  if (!bestNextMove && !doNotWaste) return null;
  return (
    <section className="mb-6">
      {bestNextMove && (
        <InlineLabelBlock label={t(language, "Best Next Move", "Лучший шаг")}>
          {bestNextMove}
        </InlineLabelBlock>
      )}
      {doNotWaste && (
        <InlineLabelBlock label={t(language, "Do Not Waste Time On", "Не тратьте время на")}>
          {doNotWaste}
        </InlineLabelBlock>
      )}
    </section>
  );
};
