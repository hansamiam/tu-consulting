/**
 * Slide 06 — What's blocking you. Display + body framing + 3 gap rows
 * with high/medium priority pills.
 */
import type { StoryVariant } from "../types";
import { SlideKicker, SlideMeta } from "./_shared";

interface Props {
  variant: StoryVariant;
  headline?: string;
  body?: string;
  items: Array<{ priority: "high" | "medium"; title: string; action: string }>;
}

export const SlideBlock = ({ variant, headline, body, items }: Props) => {
  const isQuiet = variant === "quiet";
  return (
    <article className="absolute inset-0 px-7 pt-11 pb-[70px] flex flex-col bg-surface text-foreground">
      <div className="flex-1 flex flex-col min-h-0">
        <SlideKicker n="06" label="What's blocking you" />
        <h2 className="font-heading font-bold text-[30px] tracking-[-0.03em] leading-[1.05] m-0 mb-3 text-balance">
          {headline || `${items.length} front${items.length === 1 ? "" : "s"}.`}
          <br />
          Closeable.
        </h2>
        {body && (
          <p className="font-sans text-[13.5px] leading-[1.6] text-muted-foreground m-0 mb-3 max-w-[38ch]">
            {body}
          </p>
        )}
        <div>
          {items.map((it, i) => (
            <div
              key={i}
              className="py-3 grid grid-cols-[60px_1fr] gap-3.5 items-start border-t border-[hsl(41_22%_86%)] last:border-b"
            >
              <span
                className={[
                  "font-mono text-[9.5px] uppercase tracking-[0.18em] font-semibold px-1.5 py-0.5 rounded-full inline-block border",
                  isQuiet
                    ? "bg-transparent border-transparent px-0 py-0 text-[hsl(212_18%_55%)]"
                    : it.priority === "high"
                      ? "bg-[hsl(41_61%_47%/0.10)] border-[hsl(41_61%_47%/0.22)] text-gold-dark"
                      : "bg-[hsl(212_18%_39%/0.06)] border-[hsl(41_22%_86%)] text-[hsl(212_18%_55%)]",
                ].join(" ")}
              >
                {it.priority}
              </span>
              <div>
                <p className="font-heading font-semibold text-[14.5px] tracking-[-0.01em] text-foreground m-0 mb-1 leading-[1.2]">
                  {it.title}
                </p>
                {it.action && (
                  <p className="font-sans text-[13px] leading-[1.5] text-muted-foreground m-0">
                    {it.action}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <SlideMeta
          items={[
            {
              label: "Highest",
              value: items.find((i) => i.priority === "high")?.title || "—",
            },
            { label: "Fronts", value: String(items.length) },
          ]}
        />
      </div>
    </article>
  );
};
