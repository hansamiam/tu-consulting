/**
 * PullQuote — magazine pull-quote for the "30-day call" line and
 * funding-section stacking notes.
 *
 * Large serif italic, gold left border (3px), generous padding, max-
 * width slightly wider than body so it visually escapes the column.
 * Uses smart-quotes via CSS content; the text passed in shouldn't
 * include manual " " (model is instructed plain).
 */
import React from "react";

interface Props {
  /** Quote body. */
  text: string;
  /** Optional small label above the quote (e.g. "Your 30-day call").
   *  If omitted, falls back to nothing — the quote stands alone. */
  label?: string;
}

export const PullQuote: React.FC<Props> = ({ text, label }) => {
  return (
    <figure className="my-10 sm:my-12 mx-auto max-w-2xl">
      <blockquote className="relative pl-5 sm:pl-7 border-l-[3px] border-gold-dark">
        {label && (
          <div className="font-heading text-[10.5px] uppercase tracking-[0.28em] text-gold-dark font-semibold mb-2">
            {label}
          </div>
        )}
        <p className="font-heading italic text-foreground text-xl sm:text-2xl leading-[1.4] tracking-[-0.01em]">
          {text}
        </p>
      </blockquote>
    </figure>
  );
};
