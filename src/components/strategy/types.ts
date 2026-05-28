// Mirror of the StrategyReportV2 shape returned by the
// topuni-ai-pathway edge function. The edge function is the source of
// truth — when fields change there, update here too.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

export type TargetDegree = "bachelor" | "master" | "phd";
export type Language = "en" | "ru";

export interface AxisValue {
  name: string;
  value: number; // 1..5
  reason: string;
}

export interface FitRow {
  subcategory: string;
  verdict: string;
  reason: string;
}

export interface StrategyReportV2 {
  /** Internal taxonomy label — NOT rendered as a stamped pill in the
   *  UI. Woven into `headline` by the model. Kept here for analytics
   *  / cache key + future personalization. */
  applicantType: { label: string };
  /** Strategic-frame badge rendered between Headline and HonestDiagnosis.
   *  Closed-set, snapped server-side. */
  bestFitPathway: { label: string };
  axes: AxisValue[]; // length 5
  headline: string;
  honestDiagnosis: string;
  /** v6 (2026-05-29) — 3 strategic moves replacing the old 9-bullet
   *  stack. Each is 1-2 substantive sentences. */
  uniqueEdge: string;
  blindspot: string;
  targetOpportunity: string;
  fitDiagnosis: FitRow[]; // length 4 (bachelor/master) or 5 (phd)
  readinessScore: number; // 0..5 in 0.5 steps
  targetDegree: TargetDegree;
  language: Language;
  generatedAt: string; // ISO
  profileHash: string;
  /** Used for the formal "Prepared for: {firstName}" masthead line. */
  firstName: string;
  /** Pass-through from intake — drives the masthead meta line
   *  "Prepared for: X | Track: Master's (Data Science) | Target: USA/Canada". */
  fieldOfStudy: string;
  targetCountries: string[];
}

export interface StrategyApiResponse {
  report: StrategyReportV2;
  cached: boolean;
  meta?: {
    tGen: number;
    usedCache: boolean;
    regenerated: boolean;
  };
}

/** Inline en/ru helper — matches the rest of the codebase (no i18n lib). */
export function t(lang: Language, en: string, ru: string): string {
  return lang === "ru" ? ru : en;
}
