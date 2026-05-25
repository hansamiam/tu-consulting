/**
 * Slide 05 — What to write. Navy background in Editorial/Bold; cream
 * in Quiet. Italic gold-light display for the closer line.
 */
import type { StoryVariant } from "../types";
import { SlideKicker, SlideMeta } from "./_shared";

interface Props {
  variant: StoryVariant;
  pre?: string;
  closer?: string;
  body?: string;
  seedCount?: number;
  field?: string;
}

export const SlideEssay = ({ variant, pre, closer, body, seedCount, field }: Props) => {
  const isNavy = variant !== "quiet";
  return (
    <article
      className={[
        "absolute inset-0 px-7 pt-11 pb-[70px] flex flex-col",
        isNavy ? "bg-[hsl(var(--navy-deep))] text-[hsl(43_44%_96%)]" : "bg-surface text-foreground",
      ].join(" ")}
    >
      {isNavy && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 10%, hsl(41 61% 47% / 0.12) 0%, transparent 65%)",
          }}
        />
      )}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <SlideKicker n="05" label="What to write" inverted={isNavy} />
        <p
          className={[
            "font-heading font-medium text-[18px] tracking-[-0.02em] leading-[1.2] m-0",
            isNavy ? "text-[hsl(43_44%_96%)]/60" : "text-[hsl(212_18%_55%)]",
          ].join(" ")}
        >
          {pre || "Your essay starts —"}
        </p>
        {closer && (
          <h2
            className={[
              "font-heading italic font-bold text-[32px] tracking-[-0.03em] leading-[1.05] max-w-[14ch] mt-2.5 mb-4 text-balance",
              isNavy ? "text-gold-light" : "text-foreground",
            ].join(" ")}
          >
            {closer}
          </h2>
        )}
        {body && (
          <p
            className={[
              "font-sans text-[13.5px] leading-[1.6] m-0 max-w-[38ch]",
              isNavy ? "text-[hsl(43_44%_96%)]/78" : "text-muted-foreground",
            ].join(" ")}
          >
            {body}
          </p>
        )}
        <SlideMeta
          inverted={isNavy}
          items={[
            { label: "Seeds", value: seedCount != null ? `${seedCount} inside` : "1 inside" },
            { label: "Field", value: field || "—" },
          ]}
        />
      </div>
    </article>
  );
};
