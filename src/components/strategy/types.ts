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
  axes: AxisValue[]; // length 5
  headline: string;
  honestDiagnosis: string;
  strengths: string[]; // length 3
  watchouts: string[]; // length 3
  focusNext: string[]; // length 3
  fitDiagnosis: FitRow[]; // length 4 (bachelor/master) or 5 (phd)
  bestNextMove: string;
  doNotWaste: string;
  readinessScore: number; // 0..5 in 0.5 steps
  targetDegree: TargetDegree;
  language: Language;
  generatedAt: string; // ISO
  profileHash: string;
  /** Used for the formal "Prepared for: {firstName}" masthead line. */
  firstName: string;
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
