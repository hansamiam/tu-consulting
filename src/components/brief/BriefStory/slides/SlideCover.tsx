/**
 * Slide 01 — Cover. Greeting + display name + 2026 subline + intro body.
 * Cream background in all three variants.
 */
import type { StudentMeta } from "../types";
import { formatDate } from "../utils";

interface Props {
  student: StudentMeta;
  cover: { intro: string; promise: string };
}

export const SlideCover = ({ student, cover }: Props) => (
  <article className="absolute inset-0 px-7 pt-11 pb-[70px] flex flex-col bg-surface text-foreground">
    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] font-semibold text-gold-dark whitespace-nowrap mb-[18px]">
      <span className="text-[hsl(212_18%_55%)] font-medium mr-1">01 ·</span>
      The report
    </p>
    <div className="flex-1 flex flex-col min-h-0">
      <p className="font-heading font-medium text-[16px] text-muted-foreground m-0 mb-1">Hey,</p>
      <h1 className="font-heading font-bold text-[60px] tracking-[-0.04em] leading-[0.95] m-0 mb-[10px] text-foreground text-balance">
        {(student.firstName || "you").trim()}.
      </h1>
      <p className="font-heading font-medium text-[18px] tracking-[-0.015em] leading-[1.25] text-muted-foreground m-0 mb-[18px] max-w-[28ch] text-balance">
        Here's your <span className="not-italic text-gold-dark font-bold">2026</span> strategy.
      </p>
      <p className="font-sans text-[13.5px] leading-[1.6] text-muted-foreground m-0 max-w-[38ch] mt-[22px]">
        {cover.intro} {cover.promise}
      </p>
      <div className="mt-auto flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(212_18%_55%)]">
        <span
          className="w-7 h-7 border-[1.5px] border-gold rounded-full flex items-center justify-center font-heading font-bold text-[11px] text-gold-dark tracking-normal"
          aria-hidden
        >
          TU
        </span>
        <span>TopUni AI · v7 · {formatDate(student.generatedAt)}</span>
      </div>
    </div>
  </article>
);
