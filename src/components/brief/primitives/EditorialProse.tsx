/**
 * EditorialProse — body paragraphs for the brief.
 *
 * NOT Tailwind `prose` (those defaults are wrong for our voice — too
 * tight on line-height, too small on max-width). Explicit serif body,
 * generous leading, max-width measure that holds a comfortable
 * 60-80ch reading line.
 *
 * The model emits body as a single string with `\n\n` paragraph
 * separators; we split on that here so the renderer controls vertical
 * rhythm via consistent margin between p tags (margin-collapse risk
 * sidestepped by space-y).
 */
import React from "react";

interface Props {
  /** Paragraph-separated body text. `\n\n` becomes paragraph breaks. */
  text: string;
}

export const EditorialProse: React.FC<Props> = ({ text }) => {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="font-heading text-foreground/85 text-[16.5px] sm:text-[17px] leading-[1.75]"
        >
          {p}
        </p>
      ))}
    </div>
  );
};
