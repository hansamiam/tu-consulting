// Master/PhD-only callout — the SINGLE load-bearing missing piece of
// evidence. v3 redesign: no amber card. Just a tight inline-label
// block, same primitive as BestNextMove / DoNotWaste.

import { InlineLabelBlock } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  text: string;
  language: Language;
}

export const EvidenceGap = ({ text, language }: Props) => {
  if (!text || !text.trim()) return null;
  return (
    <section className="mb-6">
      <InlineLabelBlock label={t(language, "Evidence Gap", "Пробел в доказательствах")}>
        {text}
      </InlineLabelBlock>
    </section>
  );
};
