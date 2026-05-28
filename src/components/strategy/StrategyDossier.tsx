// Single-column dossier shell for the v2 strategy report.
// Mobile: vertical scroll. Desktop: max-w-3xl centered card.
// Aesthetic: cream canvas + gold accents + editorial type — lifted
// from StrategyPreview.tsx (the design-review mock that this replaces).
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

import type { StrategyReportV2 } from "./types";
import { ReadinessHero } from "./sections/ReadinessHero";
import { HonestDiagnosis } from "./sections/HonestDiagnosis";
import { ReadinessRadar } from "./sections/ReadinessRadar";
import { StrengthsWatchouts } from "./sections/StrengthsWatchouts";
import { FitDiagnosis } from "./sections/FitDiagnosis";
import { NextMoves } from "./sections/NextMoves";
import { MembershipCTA } from "./sections/MembershipCTA";
import { Eyebrow } from "./primitives";

interface Props {
  report: StrategyReportV2;
}

export const StrategyDossier = ({ report }: Props) => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <ReadinessHero
          headline={report.headline}
          applicantTypeLabel={report.applicantType.label}
          applicantTypeFraming={report.applicantType.framing}
          readinessScore={report.readinessScore}
          language={report.language}
          generatedAt={report.generatedAt}
        />

        <HonestDiagnosis text={report.honestDiagnosis} language={report.language} />

        <section className="mb-8 sm:mb-10 flex flex-col items-center">
          <div className="mb-3 self-start">
            <Eyebrow>
              {report.language === "ru" ? "Радар готовности" : "Readiness radar"}
            </Eyebrow>
          </div>
          <ReadinessRadar axes={report.axes} />
          <ul className="mt-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] text-foreground/65">
            {report.axes.map((a, i) => (
              <li key={i} className="flex items-baseline gap-2">
                <span className="font-bold uppercase tracking-wider text-[10.5px] text-foreground/55 min-w-[14px]">
                  {a.value}
                </span>
                <span className="font-semibold text-foreground/80">{a.name}</span>
                {a.reason && <span className="opacity-80">— {a.reason}</span>}
              </li>
            ))}
          </ul>
        </section>

        <StrengthsWatchouts
          strengths={report.strengths}
          watchouts={report.watchouts}
          focusNext={report.focusNext}
          language={report.language}
        />

        <FitDiagnosis rows={report.fitDiagnosis} language={report.language} />

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
