// v4: TOP PRIORITY + DO NOT WASTE TIME — two stacked sections, each
// a SectionLabel + one short paragraph. No card, no border, no icon.

import { SectionLabel } from "../primitives";
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
    <>
      {bestNextMove && (
        <section className="mb-5">
          <SectionLabel>{t(language, "Top Priority", "Главный приоритет")}</SectionLabel>
          <p className="text-[13px] leading-[1.55] text-foreground/85 m-0 font-medium">
            {bestNextMove}
          </p>
        </section>
      )}
      {doNotWaste && (
        <section className="mb-5">
          <SectionLabel>{t(language, "Do Not Waste Time", "Не тратьте время")}</SectionLabel>
          <p className="text-[13px] leading-[1.55] text-foreground/85 m-0 font-medium">
            {doNotWaste}
          </p>
        </section>
      )}
    </>
  );
};
