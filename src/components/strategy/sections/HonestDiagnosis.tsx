import { SectionHead } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  text: string;
  language: Language;
}

// The one element that EARNS visual weight: the gold left-bar pull
// quote. McKinsey would call this the "key takeaway box" but without
// the box — just the left rule + italic display type.
export const HonestDiagnosis = ({ text, language }: Props) => {
  if (!text) return null;
  return (
    <section className="mb-6">
      <SectionHead>{t(language, "The Read", "Главное")}</SectionHead>
      <blockquote className="m-0 border-l-2 border-gold pl-4 sm:pl-5 py-1">
        <p className="font-heading italic text-[15.5px] sm:text-[17px] leading-[1.5] text-foreground m-0 max-w-[600px]">
          {text}
        </p>
      </blockquote>
    </section>
  );
};
