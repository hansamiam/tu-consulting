// v6 dossier — Play / Blindspot / Pivot narrative framing.
//
// Section order locked 2026-05-29:
//   Masthead -> Headline -> READINESS SCORE -> (diagnosis prose,
//   no label) -> UNIQUE EDGE -> BLINDSPOT -> TARGET OPPORTUNITY
//   -> FIT DIAGNOSIS -> MembershipCTA
//
// Replaces the v5 9-bullet Strengths/Weaknesses/Focus + bestNextMove
// + doNotWaste + EvidenceGap stack. Three short prose moves +
// the strategy-fit grid + CTA.

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { StrategyReportV2 } from "./types";
import { Masthead } from "./sections/Masthead";
import { ReadinessHero } from "./sections/ReadinessHero";
import { HonestDiagnosis } from "./sections/HonestDiagnosis";
import { StrategicMoves } from "./sections/StrategicMoves";
import { FitDiagnosis } from "./sections/FitDiagnosis";
import { MembershipCTA } from "./sections/MembershipCTA";

interface Props {
  report: StrategyReportV2;
}

const REVEAL_STAGGER = 0.08;
const REVEAL_DURATION = 0.55;

const Reveal = ({ index, children }: { index: number; children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
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

export const StrategyDossier = ({ report }: Props) => {
  let idx = 0;
  const next = () => idx++;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[640px] px-5 sm:px-6 py-8 sm:py-10 print:py-6 print:px-0">
        <Reveal index={next()}>
          <Masthead
            firstName={report.firstName}
            language={report.language}
            generatedAt={report.generatedAt}
            targetDegree={report.targetDegree}
            fieldOfStudy={report.fieldOfStudy}
            targetCountries={report.targetCountries}
          />
        </Reveal>

        <Reveal index={next()}>
          <ReadinessHero
            headline={report.headline}
            readinessScore={report.readinessScore}
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
          <FitDiagnosis rows={report.fitDiagnosis} language={report.language} />
        </Reveal>

        <Reveal index={next()}>
          <MembershipCTA language={report.language} />
        </Reveal>
      </div>
    </main>
  );
};
