/**
 * Slide 03 — Where you stand. Headline + body + gold-tinted pull quote.
 * Cream in all variants. Quiet drops the gold tint.
 */
import type { StoryVariant } from "../types";
import { SlideKicker, SlideMeta } from "./_shared";

interface Props {
  variant: StoryVariant;
  headline?: string;
  body?: string;
  pullquote?: string;
  /** Optional meta footer values — caller can derive from profile. */
  metaA?: { label: string; value: string };
  metaB?: { label: string; value: string };
}

export const SlideStand = ({ variant, headline, body, pullquote, metaA, metaB }: Props) => {
  const isQuiet = variant === "quiet";
  return (
    <article className="absolute inset-0 px-7 pt-11 pb-[70px] flex flex-col bg-surface text-foreground">
      <div className="flex-1 flex flex-col min-h-0">
        <SlideKicker n="03" label="Where you stand" />
        <h2 className="font-heading font-bold text-[36px] tracking-[-0.03em] leading-[1.0] m-0 mb-3 text-balance">
          {headline || "Closer than your transcript admits."}
        </h2>
        {body && (
          <p className="font-sans text-[13.5px] leading-[1.6] text-muted-foreground m-0 max-w-[38ch]">
            {body}
          </p>
        )}
        {pullquote && (
          <p
            className={[
              "mt-[22px] pt-[18px] pb-[18px] pl-[22px] pr-[18px] rounded-r-lg italic font-heading font-medium text-[17px] tracking-[-0.015em] leading-[1.3] text-balance m-0",
              isQuiet
                ? "bg-canvas-soft border-l-2 border-foreground text-foreground"
                : "bg-[hsl(41_61%_47%/0.06)] border-l-2 border-gold text-foreground",
            ].join(" ")}
          >
            {pullquote}
          </p>
        )}
        <SlideMeta
          items={[
            metaA ?? { label: "Read", value: "~2 min" },
            metaB ?? { label: "Cards", value: "7 in" },
          ]}
        />
      </div>
    </article>
  );
};
