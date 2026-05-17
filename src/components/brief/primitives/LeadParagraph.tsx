/**
 * LeadParagraph — the drop-cap lead sentence at the top of each section.
 *
 * CSS-driven drop cap via ::first-letter: large serif, float-left,
 * negative top-margin so it sits flush with cap height of the first line.
 * Renders ONE sentence (~30 words) at editorial line-height.
 *
 * The model's `lead` payload field MUST start with a printable letter
 * for the drop cap to work cleanly (numerals + punctuation render but
 * look off).
 */
import React from "react";

interface Props {
  /** Single sentence, ~30 words. */
  text: string;
}

export const LeadParagraph: React.FC<Props> = ({ text }) => {
  return (
    <p className="font-heading text-foreground text-lg sm:text-xl leading-[1.5] [&::first-letter]:font-bold [&::first-letter]:text-5xl sm:[&::first-letter]:text-6xl [&::first-letter]:float-left [&::first-letter]:mr-3 [&::first-letter]:mt-1 [&::first-letter]:leading-[0.9] [&::first-letter]:text-gold-dark max-w-2xl mx-auto">
      {text}
    </p>
  );
};
