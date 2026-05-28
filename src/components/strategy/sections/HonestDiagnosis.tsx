import { SectionLabel } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  text: string;
  language: Language;
}

// v4: drop the italic + gold-left-bar pull-quote treatment. Just a
// label and the diagnosis paragraph in quotes. Word-doc plain.
export const HonestDiagnosis = ({ text, language }: Props) => {
  if (!text) return null;
  return (
    <section className="mb-5">
      <SectionLabel>{t(language, "The Read", "Главное")}</SectionLabel>
      <p className="text-[13px] leading-[1.6] text-foreground/85 m-0">
        &ldquo;{text}&rdquo;
      </p>
    </section>
  );
};
