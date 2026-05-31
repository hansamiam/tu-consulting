// v7 dossier — premium "letter on a desk" treatment.
//
// Layout:
//   • Outer page: subtle cream wash (so the white inner card pops)
//   • Inner card: bg-white + soft border + shadow, max-w-[680px]
//   • Tight vertical rhythm — designed to fit a letter-size one-pager
//
// Section order locked 2026-05-29:
//   Masthead (with Readiness Score top-right) ->
//   Headline -> Diagnosis prose ->
//   Unique Edge / Blindspot / Target Opportunity (the 3 strategic moves)
//   -> MembershipCTA
//
// FitDiagnosis is no longer rendered as its own section — the closed-set
// verdicts still ride in the schema and inform the LLM's prose, but they
// were redundant with the 3-move framing and bloated the page.

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { StrategyReportV2 } from "./types";
import { Masthead } from "./sections/Masthead";
import { ReadinessHero } from "./sections/ReadinessHero";
import { HonestDiagnosis } from "./sections/HonestDiagnosis";
import { StrategicMoves } from "./sections/StrategicMoves";
import { MembershipCTA } from "./sections/MembershipCTA";
import { ShareDossierButton } from "./ShareDossierButton";

interface Props {
  report: StrategyReportV2;
  /** When set, renders a Share button at the top of the dossier that
   *  links to this URL. Pass window.location.href from the persistent
   *  /topuni-ai/r/:id reader; omit on the live wizard-stream view where
   *  the URL doesn't yet point at a saved report. */
  shareUrl?: string;
}

const REVEAL_STAGGER = 0.07;
const REVEAL_DURATION = 0.5;

const Reveal = ({ index, children }: { index: number; children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      delay: index * REVEAL_STAGGER,
      duration: REVEAL_DURATION,
      ease: [0.22, 1, 0.36, 1] as const,
    }}
  >
    {children}
  </motion.div>
);

export const StrategyDossier = ({ report, shareUrl }: Props) => {
  let idx = 0;
  const next = () => idx++;
  const reportTitle = report.firstName
    ? (report.language === "ru" ? `Стратегия — ${report.firstName}` : `${report.firstName}'s strategy`)
    : undefined;

  return (
    <main className="min-h-screen bg-[hsl(38_28%_95%)] print:bg-white">
      <div className="mx-auto max-w-[720px] px-4 sm:px-8 py-8 sm:py-12 print:py-0 print:px-0">
        {shareUrl && (
          <div className="flex justify-end mb-3 print:hidden">
            <ShareDossierButton
              shareUrl={shareUrl}
              language={report.language}
              reportTitle={reportTitle}
            />
          </div>
        )}
        <div
          className="bg-white border border-foreground/12 rounded-md shadow-[0_2px_24px_-8px_rgba(0,0,0,0.12)] px-6 sm:px-10 py-7 sm:py-9 print:shadow-none print:border-0 print:rounded-none print:px-0 print:py-4"
          data-strategy-page
        >
          <Reveal index={next()}>
            <Masthead
              firstName={report.firstName}
              language={report.language}
              generatedAt={report.generatedAt}
              targetDegree={report.targetDegree}
              fieldOfStudy={report.fieldOfStudy}
              targetCountries={report.targetCountries}
              readinessScore={report.readinessScore}
            />
          </Reveal>

          <Reveal index={next()}>
            <ReadinessHero
              headline={report.headline}
              language={report.language}
            />
          </Reveal>

          <Reveal index={next()}>
            <HonestDiagnosis text={report.honestDiagnosis} language={report.language} />
          </Reveal>

          <Reveal index={next()}>
            <StrategicMoves
              uniqueEdge={report.uniqueEdge ?? ""}
              blindspot={report.blindspot ?? ""}
              targetOpportunity={report.targetOpportunity ?? ""}
              language={report.language}
            />
          </Reveal>

          <Reveal index={next()}>
            <MembershipCTA language={report.language} />
          </Reveal>
        </div>
      </div>
    </main>
  );
};
