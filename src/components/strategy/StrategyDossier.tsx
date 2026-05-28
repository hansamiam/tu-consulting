// v3 redesign: single-column executive-summary dossier.
//
// Width: max-w-2xl (672px) — denser feel than the old max-w-3xl.
// Mobile: stacks vertically with normal section gap.
// Desktop: radar + axis list lays out 2-col; everything else stacks.
//
// Aesthetic: McKinsey/BCG one-page deliverable. No filled cards
// outside Masthead disclaimer + MembershipCTA closer.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

import type { StrategyReportV2 } from "./types";
import { Masthead } from "./sections/Masthead";
import { ReadinessHero } from "./sections/ReadinessHero";
import { HonestDiagnosis } from "./sections/HonestDiagnosis";
import { ReadinessRadar } from "./sections/ReadinessRadar";
import { StrengthsWatchouts } from "./sections/StrengthsWatchouts";
import { FitDiagnosis } from "./sections/FitDiagnosis";
import { EvidenceGap } from "./sections/EvidenceGap";
import { NextMoves } from "./sections/NextMoves";
import { MembershipCTA } from "./sections/MembershipCTA";
import { SectionHead } from "./primitives";
import { t } from "./types";

interface Props {
  report: StrategyReportV2;
}

export const StrategyDossier = ({ report }: Props) => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 sm:px-7 py-8 sm:py-12 print:py-6 print:px-0">
        <Masthead
          firstName={report.firstName}
          language={report.language}
          generatedAt={report.generatedAt}
        />

        <ReadinessHero
          headline={report.headline}
          readinessScore={report.readinessScore}
          bestFitPathway={report.bestFitPathway?.label ?? ""}
          language={report.language}
        />

        <HonestDiagnosis text={report.honestDiagnosis} language={report.language} />

        <section className="mb-6 print:break-inside-avoid">
          <SectionHead>{t(report.language, "Readiness Axes", "Оси готовности")}</SectionHead>
          <div className="grid grid-cols-1 sm:grid-cols-[210px_1fr] gap-x-5 gap-y-4 items-start">
            <div className="sm:pt-1">
              <ReadinessRadar axes={report.axes} size={200} />
            </div>
            <ul className="m-0 p-0 list-none divide-y divide-foreground/8 sm:pt-1">
              {report.axes.map((a, i) => (
                <li key={i} className="py-2 first:pt-0 last:pb-0 flex items-baseline gap-3">
                  <span className="font-heading text-[15px] font-bold text-gold-dark tabular-nums w-[18px] shrink-0">
                    {a.value}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/65 m-0">
                      {a.name}
                    </p>
                    {a.reason && (
                      <p className="text-[12.5px] leading-[1.4] text-foreground/72 m-0 mt-0.5">
                        {a.reason}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <StrengthsWatchouts
          strengths={report.strengths}
          watchouts={report.watchouts}
          focusNext={report.focusNext}
          language={report.language}
        />

        <FitDiagnosis rows={report.fitDiagnosis} language={report.language} />

        <EvidenceGap text={report.evidenceGap ?? ""} language={report.language} />

        <NextMoves
          bestNextMove={report.bestNextMove}
          doNotWaste={report.doNotWaste}
          language={report.language}
        />

        <MembershipCTA language={report.language} />
      </div>
    </main>
  );
};
