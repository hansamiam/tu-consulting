// v4 dossier — McKinsey Word-doc aesthetic.
//
// All sections share one pattern: ALL-CAPS section label + content
// below. No filled cards, no gold rules, no eyebrows, no italic, no
// radar, no 3-col grids. Just type + bullets.
//
// Width: max-w-[640px] — fits a Word/A4 column.

import type { StrategyReportV2 } from "./types";
import { Masthead } from "./sections/Masthead";
import { ReadinessHero } from "./sections/ReadinessHero";
import { HonestDiagnosis } from "./sections/HonestDiagnosis";
import { StrengthsWatchouts } from "./sections/StrengthsWatchouts";
import { FitDiagnosis } from "./sections/FitDiagnosis";
import { EvidenceGap } from "./sections/EvidenceGap";
import { NextMoves } from "./sections/NextMoves";
import { MembershipCTA } from "./sections/MembershipCTA";

interface Props {
  report: StrategyReportV2;
}

export const StrategyDossier = ({ report }: Props) => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[640px] px-5 sm:px-6 py-8 sm:py-10 print:py-6 print:px-0">
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
