// v5 dossier — McKinsey Word-doc + premium float-up reveal.
//
// Section order locked 2026-05-29:
//   Masthead -> Headline -> READINESS SCORE -> (diagnosis prose,
//   no label) -> STRENGTHS TO BUILD AROUND -> WEAKNESSES TO FIX
//   -> FIT DIAGNOSIS -> EVIDENCE GAP (M/PhD only) -> THIS MONTH
//   -> TOP PRIORITY -> DON'T WASTE TIME ON -> MembershipCTA
//
// Background: forced bg-white on this surface (overrides the cream
// site bg). Container max-w-[640px], Word-column width.
//
// First-mount reveal: each section fades-in + slides up 12px with
// an 80ms stagger via framer-motion. Total reveal ~600-800ms.

import { motion } from "framer-motion";
import type { ReactNode } from "react";
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
          <StrengthsWatchouts
            strengths={report.strengths}
            watchouts={report.watchouts}
            focusNext={report.focusNext}
            language={report.language}
          />
        </Reveal>

        <Reveal index={next()}>
          <FitDiagnosis rows={report.fitDiagnosis} language={report.language} />
        </Reveal>

        <Reveal index={next()}>
          <EvidenceGap text={report.evidenceGap ?? ""} language={report.language} />
        </Reveal>

        <Reveal index={next()}>
          <NextMoves
            bestNextMove={report.bestNextMove}
            doNotWaste={report.doNotWaste}
            language={report.language}
          />
        </Reveal>

        <Reveal index={next()}>
          <MembershipCTA language={report.language} />
        </Reveal>
      </div>
    </main>
  );
};
