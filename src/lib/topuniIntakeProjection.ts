/* Shared projection from the TopUni AI intake wizard's flat fields
 * onto the DiscoverProfile shape. Lives here so both /topuni-ai (EN)
 * and /topuni-ai/ru (RU) call the SAME mapping — previously RU only
 * set screen to "dashboard" without seeding Discover, so Russian
 * users had to re-answer the same questions inside Discover and
 * their profile never made it to student_profiles for cross-device
 * sync. Extracted in round 53 to close that gap. */
import type { DiscoverProfile } from "@/components/discover/DiscoverProfileGate";

/** Normalise the wizard's grade-level label (free-text, EN or RU)
 *  into the canonical degree the student is APPLYING TO. Drives
 *  Discover's degree-match scoring. */
export const mapGradeLevelToTargetDegree = (gradeLevel: string): string => {
  const g = gradeLevel.toLowerCase();
  if (!g) return "";
  // English patterns (TopUniAI.tsx wizard).
  if (/grade|gap year/.test(g))                                return "undergraduate";
  if (/transfer/.test(g))                                      return "undergraduate";
  if (/bachelor.*current/.test(g))                             return "undergraduate";
  if (/bachelor.*graduating/.test(g))                          return "master's";
  if (/master.*current/.test(g))                               return "master's";
  if (/master.*graduating/.test(g) || /phd applicant/.test(g)) return "PhD";
  if (/working professional/.test(g))                          return "master's";
  // Russian patterns (TopUniAIRu.tsx wizard).
  // "9 класс", "10 класс", "11 класс", "12 класс / Выпускник",
  // "Gap Year", "Перевод из вуза", "Бакалавриат — учусь",
  // "Бакалавриат — выпускаюсь", "Магистратура — учусь",
  // "Магистратура — выпускаюсь", "PhD", "Работаю".
  if (/класс|выпускник школы/.test(g))                        return "undergraduate";
  if (/перевод/.test(g))                                       return "undergraduate";
  if (/бакалавриат.*учусь/.test(g))                            return "undergraduate";
  if (/бакалавриат.*выпускаюсь/.test(g))                       return "master's";
  if (/магистратура.*учусь/.test(g))                           return "master's";
  if (/магистратура.*выпускаюсь/.test(g))                      return "PhD";
  if (/^phd$|^doctor/.test(g))                                 return "PhD";
  if (/работаю/.test(g))                                       return "master's";
  return gradeLevel; // unknown — let downstream canonicalize try
};

interface IntakeFields {
  fullName: string;
  email: string;
  nationality: string;
  gradeLevel: string;
  gpa: string;
  /** Optional — "4.0" | "5.0" | "10.0" | "100". When omitted, downstream
   *  Discover scoring assumes 4.0 which is the right default for US-style
   *  inputs but wrong for post-Soviet (5.0), Continental EU (10.0), or
   *  percentage (100) inputs. The intake captures this explicitly so a
   *  4.7/5.0 doesn't get scored as 4.7/4.0 (overflow). */
  gpaScale?: string;
  ielts: string;
  toefl: string;
  sat: string;
  major: string;
  budget: string;
  targetCountries: string[];
  // 2026-05-18: optional Step 4 "Tell us more" fields. All skippable.
  careerGoal?: string;
  extracurriculars?: string;
  background?: string;
  namedSchools?: string;
  /** v7 brief spec (2026-05-22): how sure the student is about their
   *  intended major. Gates the brief's WHAT-YOU'RE-AVOIDING branch +
   *  Open Question / Tight Lane archetype detection. Optional; brief
   *  defaults to "some_idea" if missing. */
  majorCertainty?: "not_at_all" | "some_idea" | "pretty_sure" | "certain";
  /** Sparse-input pass (2026-05-23) — see DiscoverProfile fields. */
  foreignLanguages?: string[];
  firstToApplyAbroad?: "yes" | "siblings_have" | "parents_have" | "unsure";
}

/** Project the wizard's intake into the DiscoverProfile shape that
 *  saveProfile() writes to localStorage + syncs to student_profiles. */
export const projectToDiscoverProfile = (intake: IntakeFields): DiscoverProfile => ({
  fullName: intake.fullName.trim(),
  email: intake.email.trim(),
  nationality: intake.nationality.trim(),
  // educationLevel = where the student currently is (preserved
  // verbatim for downstream surfaces). targetDegree = the degree
  // the student is APPLYING TO, normalised by mapGradeLevelToTargetDegree.
  educationLevel: intake.gradeLevel || undefined,
  targetDegree: mapGradeLevelToTargetDegree(intake.gradeLevel) || undefined,
  gpa: intake.gpa || undefined,
  gpaScale: intake.gpaScale || undefined,
  ieltsScore: intake.ielts || undefined,
  toeflScore: intake.toefl || undefined,
  satScore: intake.sat || undefined,
  fieldOfInterest: intake.major || undefined,
  budgetRange: intake.budget || undefined,
  // targetCountries = where the student wants to STUDY. Drives the
  // semantic match endpoint's bias toward programs in those host
  // countries. Without this, Discover's targetCountries slot was
  // being filled with nationality (where the student is FROM) —
  // biasing matches toward home-country programs, the opposite of
  // what an applicant looking abroad actually wants.
  targetCountries: intake.targetCountries.filter(Boolean),
  // Optional Step 4 fields — only included when the user actually
  // typed something (skip-able). topuni-ai-pathway reads them off the
  // profile to sharpen the brief; absence is fine.
  careerGoal: intake.careerGoal?.trim() || undefined,
  extracurriculars: intake.extracurriculars?.trim() || undefined,
  background: intake.background?.trim() || undefined,
  namedSchools: intake.namedSchools?.trim() || undefined,
  majorCertainty: intake.majorCertainty,
  foreignLanguages: intake.foreignLanguages && intake.foreignLanguages.length > 0
    ? intake.foreignLanguages : undefined,
  firstToApplyAbroad: intake.firstToApplyAbroad,
});
