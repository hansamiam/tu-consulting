import { Eyebrow } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  text: string;
  language: Language;
}

export const HonestDiagnosis = ({ text, language }: Props) => {
  if (!text) return null;
  return (
    <section className="mb-8 sm:mb-10">
      <div className="mb-2.5">
        <Eyebrow>{t(language, "The read", "Главное")}</Eyebrow>
      </div>
      <blockquote className="m-0 border-l-2 border-gold/70 pl-4 sm:pl-5 py-1">
        <p className="font-heading italic text-[16.5px] sm:text-[18px] leading-[1.5] text-foreground m-0 max-w-3xl">
          {text}
        </p>
      </blockquote>
    </section>
  );
};
