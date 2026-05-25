/**
 * Tiny reusable bits shared across slides — the numbered mono kicker
 * and the 2-column meta footer. Keeping them here avoids hand-rolling
 * the same className soup on every slide.
 */
import type { ReactNode } from "react";

export const SlideKicker = ({
  n,
  label,
  inverted = false,
}: {
  n: string;
  label: ReactNode;
  inverted?: boolean;
}) => (
  <p
    className={[
      "font-mono text-[10.5px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap m-0 mb-[18px]",
      inverted ? "text-gold-light" : "text-gold-dark",
    ].join(" ")}
  >
    <span
      className={[
        "font-medium mr-1",
        inverted ? "text-[hsl(43_44%_96%)]/50" : "text-[hsl(212_18%_55%)]",
      ].join(" ")}
    >
      {n} ·
    </span>
    {label}
  </p>
);

export const SlideMeta = ({
  items,
  inverted = false,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  inverted?: boolean;
}) => (
  <div
    className={[
      "mt-auto pt-4 grid grid-cols-2 gap-[14px] border-t",
      inverted ? "border-[hsl(43_44%_96%)]/18" : "border-[hsl(41_22%_86%)]",
    ].join(" ")}
  >
    {items.map((it, i) => (
      <div key={i}>
        <p
          className={[
            "font-mono text-[9.5px] uppercase tracking-[0.22em] font-medium m-0 mb-[3px]",
            inverted ? "text-[hsl(43_44%_96%)]/60" : "text-[hsl(212_18%_55%)]",
          ].join(" ")}
        >
          {it.label}
        </p>
        <p
          className={[
            "font-heading font-semibold text-[15px] tracking-[-0.015em] m-0",
            inverted ? "text-[hsl(43_44%_96%)]" : "text-foreground",
          ].join(" ")}
        >
          {it.value}
        </p>
      </div>
    ))}
  </div>
);
