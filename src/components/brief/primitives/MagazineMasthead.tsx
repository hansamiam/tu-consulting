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
import { Share2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  studentName: string;
  /** One-line italicized subtitle. Pulled from the brief's first
   *  section synthesis. Optional — falls back to a static line. */
  synthesisLine?: string;
  /** "Basic" | "Member" | undefined */
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
        {/* (Renamed from "brief" → "strategy report" for product brand
            consistency — 2026-05-17.) */}
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

      {/* Action row. Save-as-PDF is the user-perceived value of the
          print flow — "Print" reads as "send to printer" which most
          users don't want. Labelling it "Save as PDF" maps to what the
          browser's print dialog does by default and turns this masthead
          into the first deliverable affordance of the report. */}
      {(onShare || onPrint) && (
        <div className="mt-5 flex flex-col items-center gap-2 print:hidden">
          <div className="flex items-center justify-center gap-2">
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="gap-1.5 h-9 border-gold-dark/40 text-foreground hover:bg-gold/10"
                title="Opens your browser's print dialog — choose 'Save as PDF' for download"
              >
                <FileDown className="h-3.5 w-3.5" /> Save as PDF
              </Button>
            )}
            {onShare && (
              <Button variant="ghost" size="sm" onClick={onShare} className="text-gold-dark hover:bg-gold/10 gap-1.5 h-9">
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            )}
          </div>
          {onPrint && (
            <p className="text-[10px] text-muted-foreground tracking-wide">
              Opens print dialog — choose "Save as PDF" for download.
            </p>
          )}
        </div>
      )}
    </header>
  );
};
