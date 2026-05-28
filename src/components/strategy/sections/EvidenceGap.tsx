// v4: just a label + sentence. Same primitive as TOP PRIORITY and
// DO NOT WASTE TIME. Master/PhD only — empty string suppresses.

import { SectionLabel } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  text: string;
  language: Language;
}

export const EvidenceGap = ({ text, language }: Props) => {
  if (!text || !text.trim()) return null;
  return (
    <section className="mb-5">
      <SectionLabel>{t(language, "Evidence Gap", "Пробел в доказательствах")}</SectionLabel>
      <p className="text-[13px] leading-[1.55] text-foreground/85 m-0">{text}</p>
    </section>
  );
};
