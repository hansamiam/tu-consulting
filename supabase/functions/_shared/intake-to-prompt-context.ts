// Projection: rich WizardDraft → tight PromptContext for the LLM.
//
// The wizard collects ~30 fields. The v2 strategy prompt only needs
// ~15. This module is the deliberate narrowing — what we choose to put
// in PromptContext is what the LLM sees and reasons over. Per Samuel's
// 2026-05-28 direction: "how data is fed and read and understood and
// connected analyzed all that completely needs to change" lands here.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

import { firstAbroadFramingFor, type FirstAbroadFraming } from "./cultural-context.ts";
import type { TargetDegree, Language } from "./fit-subcategories.ts";

export interface PromptContext {
  targetDegree: TargetDegree;
  firstName: string;
  fieldOfStudy: string;
  gpa: number | null;
  gpaScale: "4.0" | "5.0" | "10.0" | "100";
  /** Collapsed English level — single enum for the prompt. */
  englishLevel:
    | "ielts_7_plus"
    | "ielts_6_0_to_6_5"
    | "ielts_below_6"
    | "toefl_equiv"
    | "not_taken_yet";
  /** Raw test profile, only set fields included. */
  testProfile: {
    ielts?: number; toefl?: number; sat?: number;
    gre?: number; gmat?: number;
  };
  /** Funding posture, derived from scholarshipNeeded + scholarship slider. */
  fundingPosture: "full_funding_first" | "partial" | "flexible";
  /** Slider values normalized 0..1. */
  preferences: {
    prestige: number; scholarship: number; careerRoi: number;
    visaAccess: number; locationPref: number;
  };
  /** Hand-picked feature flags pulled from intake. Surfaces strong
   *  signals to the model without flooding it with raw text. */
  signals: string[];
  /** Research-relevant keyword hits from free-text fields. */
  researchSignals: string[];
  /** Cultural framing tag (existing cultural-context infra). */
  culturalContext: FirstAbroadFraming;
  /** Optional career goal text. ≤200 chars. */
  careerGoal?: string;
  /** 2026-05-29 grad-applicant additions (Samuel's spec).
   *  quantBackground is the highest-signal field for the
   *  "PhD-Econ-without-math pivot" detection. */
  quantBackground?: "heavy" | "moderate" | "light";
  workExperience?: "none" | "1_2" | "3_5" | "5_plus";
  researchExperience?: "extensive" | "moderate" | "light" | "none";
  /** 2026-05-29 bachelor-applicant addition (Samuel's spec): Y/N on
   *  leadership for narrative differentiation. */
  hasLeadership?: "yes" | "no";

  /** Free-text background blob (Sharpen-step). Trimmed. */
  background?: string;
  /** Named schools blob (Sharpen-step). Trimmed. */
  namedSchools?: string;
  /** Foreign languages (excludes English + CIS native — already
   *  distinctive by definition per wizard chip set). */
  foreignLanguages?: string[];
  /** First-to-apply-abroad chip value. Drives framing emphasis. */
  firstToApplyAbroad?: "yes" | "no" | "unsure";
  /** Known scholarships the student named (awareness signal). */
  knownScholarships?: string[];
  /** Target countries (informs but doesn't dictate recommendations). */
  targetCountries: string[];
  /** Nationality (for cultural-context resolution + signal). */
  nationality: string;
  language: Language;
}

const RESEARCH_KEYWORDS = [
  /\bresearch\b/i, /\bpublish(ed|ing)?\b/i, /\bthesis\b/i, /\blab(?:s|oratory)?\b/i,
  /\bcoauthor\b/i, /\bpaper\b/i, /\bpreprint\b/i, /\bRA\b/, /\bTA\b/,
  /\bolympiad\b/i, /\bUROP\b/i, /\bREU\b/i, /\bmanuscript\b/i,
  /\bисследован/i, /\bпубликац/i, /\bлаборатор/i, /\bолимпиад/i,
];

const STEM_FIELDS = [
  /comput(?:er|ing)\s+sci/i, /software/i, /\bcs\b/i, /engineer/i,
  /math/i, /\bphysics?\b/i, /chem(?:istry)?/i, /biolog/i, /data\s*sci/i,
  /robotic/i, /electrical/i, /mechanic(?:al|s)/i, /aerospace/i, /civil/i,
  /astron/i, /materials/i,
];

function inferDegree(gradeLevel: string | null | undefined): TargetDegree {
  const g = (gradeLevel || "").toLowerCase();
  if (g.includes("phd") || g.includes("doctor")) return "phd";
  if (g.includes("master")) return "master";
  // High-school and undergrad grades all map to bachelor intent.
  return "bachelor";
}

function inferEnglishLevel(p: any): PromptContext["englishLevel"] {
  // 2026-05-29 — explicit Step 1 MC pick is canonical when set.
  // Numeric IELTS/TOEFL inputs on Step 2 are precision additions
  // that override only when the user picked a different score range
  // than their MC chip implied (rare edge case — trust the MC).
  if (
    p.englishProficiency === "ielts_7_plus" ||
    p.englishProficiency === "ielts_6_0_to_6_5" ||
    p.englishProficiency === "ielts_below_6" ||
    p.englishProficiency === "toefl_equiv" ||
    p.englishProficiency === "not_taken_yet"
  ) {
    return p.englishProficiency;
  }

  // Per-test taken/not_yet state takes priority.
  const ieltsTaken = p.ieltsState === "taken";
  const toeflTaken = p.toeflState === "taken";

  if (ieltsTaken) {
    const n = parseFloat(p.ielts);
    if (!isNaN(n)) {
      if (n >= 7) return "ielts_7_plus";
      if (n >= 6) return "ielts_6_0_to_6_5";
      return "ielts_below_6";
    }
  }
  if (toeflTaken) {
    const n = parseFloat(p.toefl);
    if (!isNaN(n)) return "toefl_equiv";
  }
  // No state set but a score is present (legacy drafts)
  const ieltsScore = parseFloat(p.ielts);
  if (!isNaN(ieltsScore)) {
    if (ieltsScore >= 7) return "ielts_7_plus";
    if (ieltsScore >= 6) return "ielts_6_0_to_6_5";
    return "ielts_below_6";
  }
  const toeflScore = parseFloat(p.toefl);
  if (!isNaN(toeflScore)) return "toefl_equiv";

  return "not_taken_yet";
}

function inferFundingPosture(p: any): PromptContext["fundingPosture"] {
  const slider = parseInt(p.scholarship);
  const sn = (p.scholarshipNeeded || "").toLowerCase();
  if (sn === "yes" || sn === "required" || slider >= 80) return "full_funding_first";
  if (sn === "no" || slider <= 30) return "flexible";
  return "partial";
}

function collectSignals(p: any): string[] {
  const sig: string[] = [];
  if (p.foreignLanguages && p.foreignLanguages.length > 0) {
    sig.push(`foreign_languages:${p.foreignLanguages.length}`);
  }
  if (p.firstToApplyAbroad === "yes") sig.push("first_to_apply_abroad");
  if (Array.isArray(p.selectedECTags) && p.selectedECTags.length > 0) {
    sig.push(`ec_tags:${p.selectedECTags.join(",")}`);
  }
  if (Array.isArray(p.knownScholarships) && p.knownScholarships.length > 0) {
    sig.push(`knows_scholarships:${p.knownScholarships.length}`);
  }
  const corpus = [p.topActivity, p.personalStory, p.background, p.namedSchools, ...(p.selectedECTags || [])]
    .filter((x) => typeof x === "string").join(" ");
  if (/olympiad|олимпиад/i.test(corpus)) sig.push("olympiad_signal");
  if (/leadership|president|founder|основатель|президент/i.test(corpus)) sig.push("leadership_signal");
  if (/volunteer|nonprofit|community|волонт/i.test(corpus)) sig.push("community_signal");
  return sig;
}

function collectResearchSignals(p: any): string[] {
  const corpus = [
    p.topActivity, p.personalStory, p.background, p.namedSchools,
    ...(p.selectedECTags || []),
  ].filter((x) => typeof x === "string").join(" ");
  const hits = new Set<string>();
  for (const re of RESEARCH_KEYWORDS) {
    const m = corpus.match(re);
    if (m) hits.add(m[0].toLowerCase());
  }
  return Array.from(hits);
}

function isSTEMField(field: string): boolean {
  if (!field) return false;
  return STEM_FIELDS.some((re) => re.test(field));
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function sliderTo01(v: unknown): number {
  if (Array.isArray(v)) v = v[0];
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n)) return 0.5;
  // Sliders in the wizard run 0..100. Some legacy drafts used 1..5.
  // Heuristic: if value <=5 treat as 1-5 scale.
  if (n <= 5) return clamp01(n / 5);
  return clamp01(n / 100);
}

function firstNameFrom(p: any): string {
  const full = (p.fullName || "").trim();
  if (full) return full.split(/\s+/)[0];
  const fn = (p.firstName || "").trim();
  return fn || "there";
}

export function projectIntake(profile: any, language: Language): PromptContext {
  const targetDegree = inferDegree(profile.gradeLevel);
  const fieldOfStudy = (profile.major || profile.field || "").trim();

  const ctx: PromptContext = {
    targetDegree,
    firstName: firstNameFrom(profile),
    fieldOfStudy,
    gpa: profile.gpa != null && profile.gpa !== "" ? parseFloat(profile.gpa) : null,
    gpaScale: (profile.gpaScale || "4.0") as PromptContext["gpaScale"],
    englishLevel: inferEnglishLevel(profile),
    testProfile: {
      ielts: profile.ielts ? parseFloat(profile.ielts) : undefined,
      toefl: profile.toefl ? parseFloat(profile.toefl) : undefined,
      sat:   profile.sat   ? parseFloat(profile.sat)   : undefined,
      gre:   profile.gre   ? parseFloat(profile.gre)   : undefined,
      gmat:  profile.gmat  ? parseFloat(profile.gmat)  : undefined,
    },
    fundingPosture: inferFundingPosture(profile),
    preferences: {
      prestige:    sliderTo01(profile.prestige),
      scholarship: sliderTo01(profile.scholarship),
      careerRoi:   sliderTo01(profile.careerRoi),
      visaAccess:  sliderTo01(profile.visaAccess),
      locationPref:sliderTo01(profile.locationPref),
    },
    signals: collectSignals(profile),
    researchSignals: collectResearchSignals(profile),
    culturalContext: firstAbroadFramingFor(profile.nationality),
    careerGoal: (profile.careerGoal || "").trim() || undefined,
    quantBackground: ["heavy", "moderate", "light"].includes(profile.quantBackground)
      ? profile.quantBackground : undefined,
    workExperience: ["none", "1_2", "3_5", "5_plus"].includes(profile.workExperience)
      ? profile.workExperience : undefined,
    researchExperience: ["extensive", "moderate", "light", "none"].includes(profile.researchExperience)
      ? profile.researchExperience : undefined,
    hasLeadership: ["yes", "no"].includes(profile.hasLeadership)
      ? profile.hasLeadership : undefined,
    background: (profile.background || "").trim().slice(0, 600) || undefined,
    namedSchools: (profile.namedSchools || "").trim().slice(0, 400) || undefined,
    foreignLanguages: Array.isArray(profile.foreignLanguages) && profile.foreignLanguages.length
      ? profile.foreignLanguages
      : undefined,
    firstToApplyAbroad: ["yes","no","unsure"].includes(profile.firstToApplyAbroad)
      ? profile.firstToApplyAbroad
      : undefined,
    knownScholarships: Array.isArray(profile.knownScholarships) && profile.knownScholarships.length
      ? profile.knownScholarships
      : undefined,
    targetCountries: Array.isArray(profile.targetCountries) ? profile.targetCountries : [],
    nationality: (profile.nationality || "").trim(),
    language,
  };

  // STEM signal layered into the signals array for the prompt.
  if (isSTEMField(fieldOfStudy)) ctx.signals.push("stem_field");

  return ctx;
}

/**
 * Canonical hash key for cache lookups. Includes only intake-meaningful
 * fields (not firstName, not free-text trimming). Stable across
 * cosmetic intake edits.
 */
export async function profileHashFor(ctx: PromptContext): Promise<string> {
  const canonical = JSON.stringify({
    d: ctx.targetDegree,
    f: ctx.fieldOfStudy.toLowerCase(),
    g: ctx.gpa, gs: ctx.gpaScale,
    el: ctx.englishLevel,
    tp: ctx.testProfile,
    fp: ctx.fundingPosture,
    p: ctx.preferences,
    s: [...ctx.signals].sort(),
    rs: [...ctx.researchSignals].sort(),
    cc: ctx.culturalContext,
    cg: ctx.careerGoal?.slice(0, 200),
    qb: ctx.quantBackground,
    we: ctx.workExperience,
    re: ctx.researchExperience,
    lead: ctx.hasLeadership,
    bg: ctx.background?.slice(0, 200),
    ns: ctx.namedSchools?.slice(0, 200),
    fl: ctx.foreignLanguages ? [...ctx.foreignLanguages].sort() : null,
    fa: ctx.firstToApplyAbroad,
    ks: ctx.knownScholarships ? [...ctx.knownScholarships].sort() : null,
    tc: [...ctx.targetCountries].map((c) => c.toLowerCase()).sort(),
    n: ctx.nationality.toLowerCase(),
    l: ctx.language,
  });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
