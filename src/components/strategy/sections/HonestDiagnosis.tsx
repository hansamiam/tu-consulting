// The honestDiagnosis paragraph, rendered as the opening prose of the
// report body. No label, no quotes, no italic, no border — just type.
// Reads as the second paragraph under the headline.

import type { Language } from "../types";

interface Props {
  text: string;
  language: Language;
}

export const HonestDiagnosis = ({ text }: Props) => {
  if (!text) return null;
  return (
    <section className="mb-4">
      <p className="text-[12.5px] leading-[1.6] text-foreground/85 m-0">{text}</p>
    </section>
  );
};
