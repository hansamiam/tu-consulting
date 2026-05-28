// v7 — three strategic moves. Each gets a gold-accent label (small
// gold rule + uppercase eyebrow) above 1-2 sentences of prose.

import { SectionLabel } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  uniqueEdge: string;
  blindspot: string;
  targetOpportunity: string;
  language: Language;
}

const Move = ({ label, text }: { label: string; text: string }) => {
  if (!text) return null;
  return (
    <section className="mb-4">
      <SectionLabel>{label}</SectionLabel>
      <p className="text-[12.5px] leading-[1.55] text-foreground/85 m-0">{text}</p>
    </section>
  );
};

export const StrategicMoves = ({
  uniqueEdge,
  blindspot,
  targetOpportunity,
  language,
}: Props) => (
  <>
    <Move
      label={t(language, "Unique Edge", "Уникальное преимущество")}
      text={uniqueEdge}
    />
    <Move
      label={t(language, "Blindspot", "Слепое пятно")}
      text={blindspot}
    />
    <Move
      label={t(language, "Target Opportunity", "Целевая возможность")}
      text={targetOpportunity}
    />
  </>
);
