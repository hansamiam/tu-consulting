/**
 * Structured-output schema for the premium-tier brief sections.
 *
 * These types are the contract between the extract-brief-data edge function
 * and the chart components in src/components/brief/. Both ends MUST match —
 * keep this file synced with the JSON schema embedded in the edge function.
 *
 * Why this exists: the AI generates the markdown brief as freeform prose,
 * but the user explicitly asked for "dedicated visual treatment beyond
 * plain markdown" on Career ROI / Combined Funding / Visa Pathway. We run
 * a second JSON-mode pass over the brief + retrieved context to extract
 * structured data the frontend can render as charts above the narrative.
 *
 * If the extract pass fails or returns invalid JSON, the frontend
 * gracefully falls back to the plain markdown rendering — the structured
 * pass is enrichment, never a hard dependency.
 */

export interface CareerRoiUniversity {
  /** University name as it appears in the brief shortlist. */
  name: string;
  /** Realistic starting salary band in USD for this student's field. */
  starting_salary_min_usd: number;
  starting_salary_max_usd: number;
  /** % of graduates employed within 6 months. 0–100. */
  employment_rate_6mo_pct: number;
  /** Up to 4 representative employers. */
  notable_employers: string[];
  /** One sentence on where alumni are 5–10 years later. */
  five_year_trajectory: string;
}

export interface CareerRoiSection {
  universities: CareerRoiUniversity[];
}

export interface FundingComponent {
  /** Scholarship/aid name as it appears in the brief or retrieved DB. */
  name: string;
  /** Estimated USD value of this component. */
  amount_usd: number;
}

export interface FundingScenario {
  /** Scenario label, e.g. "Aggressive full-ride stack" / "Realistic partial". */
  name: string;
  /** Component scholarships/aid sources. */
  components: FundingComponent[];
  /** Sum of component amounts in USD. */
  total_usd: number;
  /** Likelihood the student can pull this off. */
  feasibility: "primary" | "secondary" | "stretch";
  /** One sentence on how to execute this scenario. */
  strategy: string;
}

export interface CombinedFundingSection {
  scenarios: FundingScenario[];
}

export interface VisaCountry {
  country: string;
  /** 1 = trivially easy, 5 = very hard. Per the student's nationality. */
  student_visa_difficulty: 1 | 2 | 3 | 4 | 5;
  /** Post-study work permit duration in months. 0 if not available. */
  post_study_work_months: number;
  /** Years to permanent residency under typical pathway. null if no path. */
  pr_pathway_years: number | null;
  /** Up to 3 specific challenges this student should plan for. */
  key_challenges: string[];
}

export interface VisaPathwaySection {
  countries: VisaCountry[];
}

/** The full structured payload returned by extract-brief-data. Any field
 *  may be null if the brief didn't contain that section (basic tier, or
 *  the AI didn't produce that block). */
export interface BriefStructured {
  careerRoi: CareerRoiSection | null;
  combinedFunding: CombinedFundingSection | null;
  visaPathway: VisaPathwaySection | null;
}

export const EMPTY_BRIEF_STRUCTURED: BriefStructured = {
  careerRoi: null,
  combinedFunding: null,
  visaPathway: null,
};

/** Runtime guard — returns true iff `value` matches BriefStructured shape
 *  with at least one populated section. Used to gate chart rendering so
 *  malformed responses fall through to the markdown narrative. */
export function isValidBriefStructured(value: unknown): value is BriefStructured {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const hasShape = ["careerRoi", "combinedFunding", "visaPathway"].every(
    k => k in v && (v[k] === null || typeof v[k] === "object"),
  );
  if (!hasShape) return false;
  // At least one section has to be populated to be useful
  return Boolean(v.careerRoi || v.combinedFunding || v.visaPathway);
}
