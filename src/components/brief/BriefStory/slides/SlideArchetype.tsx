/**
 * Slide 02 — Your archetype. Pre + display + tag + reason body + confidence.
 * Editorial: cream. Bold: navy. Quiet: cream with no gold.
 */
import type { StoryVariant } from "../types";
import { SlideMeta, SlideKicker } from "./_shared";

interface Props {
  variant: StoryVariant;
  name?: string;
  tagline?: string;
  body?: string;
  confidence?: number;
}

export const SlideArchetype = ({ variant, name, tagline, body, confidence }: Props) => {
  const isBold = variant === "bold";
  const isQuiet = variant === "quiet";

  return (
    <article
      className={[
        "absolute inset-0 px-7 pt-11 pb-[70px] flex flex-col",
        isBold ? "bg-[hsl(var(--navy-deep))] text-[hsl(43_44%_96%)]" : "bg-surface text-foreground",
      ].join(" ")}
    >
      {isBold && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 10%, hsl(41 61% 47% / 0.14) 0%, transparent 65%)",
          }}
        />
      )}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <SlideKicker n="02" label="Your archetype" inverted={isBold} />
        <p
          className={[
            "font-heading font-medium text-[24px] tracking-[-0.025em] leading-[1.05] m-0",
            isBold ? "text-[hsl(43_44%_96%)]/60" : "text-[hsl(212_18%_55%)]",
          ].join(" ")}
        >
          You are —
        </p>
        <h2
          className={[
            "font-heading font-bold text-[38px] tracking-[-0.035em] leading-[1.0] mt-1.5 mb-4 text-balance",
            isQuiet ? "text-foreground" : isBold ? "text-gold-light" : "text-gold-dark",
          ].join(" ")}
        >
          {name ? `${name.replace(/\.$/, "")}.` : "—"}
        </h2>
        {tagline && (
          <p
            className={[
              "font-heading font-medium text-[17px] tracking-[-0.015em] leading-[1.3] max-w-[26ch] m-0 mb-[18px] text-balance",
              isBold ? "text-[hsl(43_44%_96%)]" : isQuiet ? "text-muted-foreground" : "text-foreground",
            ].join(" ")}
          >
            {tagline}
          </p>
        )}
        {body && (
          <p
            className={[
              "font-sans text-[13.5px] leading-[1.6] m-0 max-w-[38ch]",
              isBold ? "text-[hsl(43_44%_96%)]/78" : "text-muted-foreground",
            ].join(" ")}
          >
            {body}
          </p>
        )}
        <SlideMeta
          inverted={isBold}
          items={[
            { label: "Confidence", value: confidence != null ? `${Math.round(confidence)}%` : "—" },
            { label: "Library", value: "1 of 47" },
          ]}
        />
      </div>
    </article>
  );
};
