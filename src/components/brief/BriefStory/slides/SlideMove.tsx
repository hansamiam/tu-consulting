/**
 * Slide 07 — Monday Move (final). Gold pill kicker + display + sub
 * with italic emphasis + body + meta. Cream in all variants; Quiet
 * drops the gold pill.
 */
import type { StoryVariant } from "../types";
import { SlideKicker, SlideMeta } from "./_shared";

interface Props {
  variant: StoryVariant;
  headline?: string;
  sub?: string;
  body?: string;
  duration?: string;
}

export const SlideMove = ({ variant, headline, sub, body, duration }: Props) => {
  const isQuiet = variant === "quiet";
  return (
    <article className="absolute inset-0 px-7 pt-11 pb-[70px] flex flex-col bg-surface text-foreground">
      <div className="flex-1 flex flex-col min-h-0">
        <SlideKicker n="07" label="This week" />
        <span
          className={[
            "self-start font-mono text-[9.5px] uppercase tracking-[0.18em] font-semibold whitespace-nowrap mb-3.5",
            isQuiet
              ? "text-[hsl(212_18%_55%)]"
              : "text-gold-dark bg-[hsl(41_61%_47%/0.10)] border border-[hsl(41_61%_47%/0.25)] px-2.5 py-1 rounded-full",
          ].join(" ")}
        >
          Mon · before school
        </span>
        <h2 className="font-heading font-bold text-[40px] tracking-[-0.035em] leading-[1.0] m-0">
          {headline || "Open a doc."}
        </h2>
        {sub && (
          <p className="font-heading font-medium text-[17px] tracking-[-0.015em] leading-[1.25] text-muted-foreground m-0 mt-3 mb-3.5 max-w-[28ch] text-balance">
            {sub}
          </p>
        )}
        {body && (
          <p className="font-sans text-[13.5px] leading-[1.6] text-muted-foreground m-0 mb-4 max-w-[38ch]">
            {body}
          </p>
        )}
        <SlideMeta
          items={[
            { label: "Duration", value: duration || "45 min" },
            { label: "Cost", value: "$0" },
          ]}
        />
      </div>
    </article>
  );
};
