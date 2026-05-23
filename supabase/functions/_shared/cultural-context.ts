// Per-nationality cultural lens for brief-side framing decisions.
//
// Scope: ONLY first-in-family-to-apply-abroad framing right now.
// (Language baseline is handled at the wizard form level — the foreign-
// language chip set deliberately excludes English + CIS native languages,
// so anything stored is distinctive by definition and gets celebrated
// without needing per-nationality filtering here.)
//
// Per project_topuni_positioning_anti_crimson memory: the brief's voice
// must adapt to the student's cultural context, NOT apply US-college-app
// defaults universally.

export type FirstAbroadFraming =
  | "first_gen_college"    // US, LatAm, parts of SE Asia, parts of Africa.
                           //   "No one in your family went to college" angle works.
  | "first_to_leave_home"  // CIS, MENA, parts of EU where school completion
                           //   is high but study-abroad is rare. Frame as
                           //   "courage to leave home / first global step,"
                           //   NOT first-gen-college (parents often graduated).
  | "first_global_step";   // Generic fallback when nationality is unmapped.

// Per-nationality framing. Keys must match the normalized English form
// used elsewhere (see nationality-normalize.ts in the same _shared dir).
// Curated; extend as the audience grows.
const FRAMING_BY_NATIONALITY: Record<string, FirstAbroadFraming> = {
  // CIS — high school-completion rate, rare to study abroad.
  Kazakhstan: "first_to_leave_home",
  Kyrgyzstan: "first_to_leave_home",
  Uzbekistan: "first_to_leave_home",
  Tajikistan: "first_to_leave_home",
  Turkmenistan: "first_to_leave_home",
  Russia: "first_to_leave_home",
  Belarus: "first_to_leave_home",
  Ukraine: "first_to_leave_home",
  Moldova: "first_to_leave_home",
  Georgia: "first_to_leave_home",
  Armenia: "first_to_leave_home",
  Azerbaijan: "first_to_leave_home",
  // MENA — same pattern, different reasons.
  Türkiye: "first_to_leave_home",
  Turkey: "first_to_leave_home",
  Iran: "first_to_leave_home",
  Egypt: "first_to_leave_home",
  Morocco: "first_to_leave_home",
  Jordan: "first_to_leave_home",
  // US + parts of LatAm where first-gen-college is the live narrative.
  USA: "first_gen_college",
  "United States": "first_gen_college",
  Mexico: "first_gen_college",
  Brazil: "first_gen_college",
  Colombia: "first_gen_college",
  Peru: "first_gen_college",
  Argentina: "first_gen_college",
  // SE Asia + parts of Africa — first-gen-college framing also lands.
  Vietnam: "first_gen_college",
  Indonesia: "first_gen_college",
  Philippines: "first_gen_college",
  Nigeria: "first_gen_college",
  Kenya: "first_gen_college",
  Ghana: "first_gen_college",
};

/** Return the framing the brief should use for a student's
 *  first-to-apply-abroad signal. Unknown nationality → generic
 *  "first_global_step" fallback. Caller is responsible for normalizing
 *  Cyrillic nationality strings before passing in (see
 *  nationality-normalize.ts). */
export function firstAbroadFramingFor(
  nationality: string | null | undefined,
): FirstAbroadFraming {
  if (!nationality) return "first_global_step";
  return FRAMING_BY_NATIONALITY[nationality] ?? "first_global_step";
}

/** Short prose marker tokens the brief embeds when first_to_apply_abroad
 *  is "yes" — verify-brief.ts Test 7 asserts the right token cluster
 *  appears for the right framing. Tokens are intentionally distinctive
 *  so the test doesn't false-positive on generic phrasing. */
export const FRAMING_MARKERS: Record<FirstAbroadFraming, { en: string[]; ru: string[] }> = {
  first_to_leave_home: {
    en: ["leaving home", "first to step out", "first to go abroad"],
    ru: ["первый шаг из дома", "первым уехать", "первым поступить за рубеж"],
  },
  first_gen_college: {
    en: ["first-generation", "first in your family to attend", "first to go to college"],
    ru: ["первое поколение", "первый в семье студент", "первым поступить в университет"],
  },
  first_global_step: {
    en: ["first to take this step", "first step into something new"],
    ru: ["первый шаг", "первым решиться"],
  },
};
