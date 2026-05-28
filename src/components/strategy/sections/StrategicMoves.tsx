// v6 (2026-05-29) — three strategic moves replacing the old 9-bullet
// strengths / weaknesses / focusNext stack. Each is a 1-2 sentence
// piece of narrative consulting copy. The cofounder Play / Hurdle /
// Pivot framing translated to in-product labels.

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
    <section className="mb-5">
      <SectionLabel>{label}</SectionLabel>
      <p className="text-[13px] leading-[1.55] text-foreground/85 m-0">{text}</p>
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
