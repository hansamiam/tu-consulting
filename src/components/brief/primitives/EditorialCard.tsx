/**
 * EditorialCard — magazine sidebar primitive used by school /
 * scholarship / gap / week panels.
 *
 * Visually distinct from generic shadcn `Card`: off-white background,
 * thin gold top border (instead of full border), no shadow, magazine-
 * sidebar feel. Padding generous so prose inside breathes.
 *
 * Accepts an optional `accent` color band for priority/tier coding
 * (reach/target/safety, high/medium gap priority, etc.).
 */
import React from "react";

type AccentColor = "gold" | "rose" | "amber" | "emerald" | "neutral";

const ACCENT_BORDER: Record<AccentColor, string> = {
  gold: "border-t-gold-dark",
  rose: "border-t-rose-500/70",
  amber: "border-t-amber-500/80",
  emerald: "border-t-emerald-500/70",
  neutral: "border-t-border",
};

interface Props {
  children: React.ReactNode;
  accent?: AccentColor;
  className?: string;
}

export const EditorialCard: React.FC<Props> = ({ children, accent = "gold", className = "" }) => {
  return (
    <div
      className={`relative bg-canvas-soft/60 dark:bg-canvas-soft/30 border-t-2 ${ACCENT_BORDER[accent]} px-5 sm:px-7 py-5 sm:py-7 rounded-b-sm ${className}`}
    >
      {children}
    </div>
  );
};
