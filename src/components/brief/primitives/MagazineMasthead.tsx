/**
 * MagazineMasthead — the new editorial masthead replacing the
 * KPI-strip BriefMasthead used by the legacy brief renderer.
 *
 * Layout: thin gold rule top, all-caps kicker ("TopUni · Strategy
 * Report"), display-serif name, italicized one-line synthesis,
 * inline date + grade pill, action buttons (Share/Print/PDF).
 *
 * No KPI tiles, no stat strip — the magazine direction is editorial,
 * not dashboard. Stats live inside section bodies instead.
 */
import React from "react";
import { Share2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  studentName: string;
  /** One-line italicized subtitle. Pulled from the brief's first
   *  section synthesis. Optional — falls back to a static line. */
  synthesisLine?: string;
  /** "Basic" | "Pro" | undefined */
  gradeLabel?: string;
  /** ISO date string of when this brief was generated. */
  generatedAt?: string;
  onShare?: () => void;
  onPrint?: () => void;
}

export const MagazineMasthead: React.FC<Props> = ({
  studentName,
  synthesisLine,
  gradeLabel,
  generatedAt,
  onShare,
  onPrint,
}) => {
  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <header className="text-center pt-4 sm:pt-8 pb-10 sm:pb-14 border-b border-border">
      {/* Gold rule + kicker */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="h-px w-12 bg-gold-dark/60" aria-hidden />
        <span className="font-heading text-[11px] uppercase tracking-[0.32em] text-gold-dark font-semibold">
          TopUni · Strategy Report
        </span>
        <span className="h-px w-12 bg-gold-dark/60" aria-hidden />
      </div>

      {/* Student name — display serif */}
      <h1 className="font-heading font-bold text-foreground text-4xl sm:text-5xl md:text-6xl tracking-[-0.025em] leading-[1] mb-3">
        {studentName}
      </h1>

      {/* Synthesis line — italicized lead */}
      {synthesisLine && (
        <p className="font-heading italic text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-snug">
          {synthesisLine}
        </p>
      )}

      {/* Date + grade + actions */}
      <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
        <span>{formattedDate}</span>
        {gradeLabel && (
          <>
            <span className="text-border" aria-hidden>·</span>
            <span className="text-gold-dark font-semibold">{gradeLabel}</span>
          </>
        )}
      </div>

      {/* Action row */}
      {(onShare || onPrint) && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare} className="text-gold-dark hover:bg-gold/10 gap-1.5 h-8">
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          )}
          {onPrint && (
            <Button variant="ghost" size="sm" onClick={onPrint} className="text-muted-foreground hover:text-foreground gap-1.5 h-8">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          )}
        </div>
      )}
    </header>
  );
};
