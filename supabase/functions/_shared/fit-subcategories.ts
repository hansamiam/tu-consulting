// Closed-set verdict tables for the Fit Diagnosis section of the v2
// strategy report. The model picks ONE verdict per subcategory from
// these tables. Closed-set constraints solve two failure modes from v1:
//   1. Drift — LLM coined verdict labels that varied between runs.
//   2. Comparability — two students can compare their reports directly.
//
// IDs stay English regardless of output language (used for code-side
// validation + analytics). The user-facing label is keyed by language.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

export type TargetDegree = "bachelor" | "master" | "phd";
export type Language = "en" | "ru";

export interface FitSubcategory {
  /** Subcategory name shown in the dossier as the row label. */
  name: { en: string; ru: string };
  /** Closed set of verdicts the LLM must pick from. */
  verdicts: { id: string; en: string; ru: string }[];
}

export const BACHELOR_SUBCATEGORIES: FitSubcategory[] = [
  {
    name: { en: "Major Fit", ru: "Соответствие специальности" },
    verdicts: [
      { id: "locked_in",       en: "Locked-in major",            ru: "Чёткая специальность" },
      { id: "two_candidates",  en: "Two strong candidates",      ru: "Два сильных направления" },
      { id: "exploratory",     en: "Exploratory",                ru: "Поисковый этап" },
      { id: "mismatch",        en: "Mismatch with profile",      ru: "Несоответствие профилю" },
    ],
  },
  {
    name: { en: "Activity Gap", ru: "Внеучебный профиль" },
    verdicts: [
      { id: "standout",        en: "Standout activity record",   ru: "Выдающийся профиль активностей" },
      { id: "solid_generic",   en: "Solid but generic",          ru: "Крепкий, но обычный" },
      { id: "one_track",       en: "One-track narrow",           ru: "Слишком узкий" },
      { id: "thin",            en: "Thin — needs depth",         ru: "Слабый — нужна глубина" },
    ],
  },
  {
    name: { en: "Testing Gap", ru: "Стандартизированные тесты" },
    verdicts: [
      { id: "top_quartile",    en: "Top-quartile scores",        ru: "Топ-25% результаты" },
      { id: "competitive",     en: "Competitive but not standout", ru: "Конкурентоспособно, но не выдающееся" },
      { id: "below_median",    en: "Below median for target tier", ru: "Ниже медианы для целевого уровня" },
      { id: "test_optional",   en: "Test-optional advisable",    ru: "Подавать без тестов разумнее" },
    ],
  },
  {
    name: { en: "Country Strategy", ru: "Страновая стратегия" },
    verdicts: [
      { id: "full_funding",    en: "Full-funding-first markets", ru: "Рынки с полным финансированием" },
      { id: "mid_tier_merit",  en: "Mid-tier merit markets",     ru: "Средние рынки с merit-grants" },
      { id: "broad_mix",       en: "Broad mix across tiers",     ru: "Широкий микс по уровням" },
      { id: "stay_region",     en: "Stay-region-and-scholarship-up", ru: "Остаться в регионе с упором на стипендию" },
    ],
  },
];

export const MASTER_SUBCATEGORIES: FitSubcategory[] = [
  {
    name: { en: "Program Type Fit", ru: "Тип программы" },
    verdicts: [
      { id: "research_masters",        en: "Research master's",                ru: "Исследовательский master's" },
      { id: "professional_masters",    en: "Professional master's",            ru: "Профессиональный master's" },
      { id: "policy_dev_masters",      en: "Policy/development master's",      ru: "Master's по политике/развитию" },
      { id: "coursework_masters",      en: "Coursework master's",              ru: "Курсовой master's" },
      { id: "interdisciplinary_masters", en: "Interdisciplinary master's",     ru: "Междисциплинарный master's" },
    ],
  },
  {
    name: { en: "Career Fit", ru: "Карьерный путь" },
    verdicts: [
      { id: "deepening",   en: "Direct deepening", ru: "Прямое углубление" },
      { id: "adjacent",    en: "Adjacent pivot",   ru: "Смежный pivot" },
      { id: "hard_pivot",  en: "Hard pivot",       ru: "Радикальный pivot" },
      { id: "pre_phd",     en: "Pre-PhD bridge",   ru: "Подготовка к PhD" },
    ],
  },
  {
    name: { en: "Research/Professional Track Fit", ru: "Исследовательский/прикладной трек" },
    verdicts: [
      { id: "research_heavy",  en: "Research-heavy track",   ru: "Исследовательский трек" },
      { id: "applied",         en: "Applied/practitioner track", ru: "Прикладной трек" },
      { id: "hybrid",          en: "Hybrid track",           ru: "Гибридный трек" },
      { id: "coursework_only", en: "Coursework-only track",  ru: "Только курсовая программа" },
    ],
  },
  {
    name: { en: "Funding Route", ru: "Финансирование" },
    verdicts: [
      { id: "full_funding",    en: "Full-funding-first strategy", ru: "Стратегия полного финансирования" },
      { id: "prestige_tol",    en: "Prestige-tolerant strategy",  ru: "Стратегия с приоритетом престижа" },
      { id: "lower_cost",      en: "Lower-cost-preferred strategy", ru: "Стратегия более доступных программ" },
      { id: "employer",        en: "Employer-sponsored leg first",  ru: "Сначала работодатель, потом учёба" },
    ],
  },
];

export const PHD_SUBCATEGORIES: FitSubcategory[] = [
  {
    name: { en: "Research Fit", ru: "Исследовательская готовность" },
    verdicts: [
      { id: "independent_ready", en: "Independent research-ready", ru: "Готовность к самостоятельным исследованиям" },
      { id: "with_supervision",  en: "Strong with supervision",    ru: "Силён под руководством" },
      { id: "needs_scaffolding", en: "Needs research scaffolding first", ru: "Нужен исследовательский опыт" },
      { id: "coursework_phd",    en: "Coursework-PhD track only",  ru: "Только курсовой PhD" },
    ],
  },
  {
    name: { en: "Supervisor Fit", ru: "Подбор научного руководителя" },
    verdicts: [
      { id: "pre_aligned",  en: "Pre-aligned with potential advisor(s)", ru: "Контакт с потенциальным руководителем установлен" },
      { id: "has_shortlist", en: "Has shortlist, no outreach yet",      ru: "Есть шорт-лист, но без контакта" },
      { id: "open_field",   en: "Open field, no advisor lead",          ru: "Открытое поле, без лида" },
      { id: "needs_work",   en: "Needs advisor-fit work before applying", ru: "Нужна работа над fit с руководителем" },
    ],
  },
  {
    name: { en: "Quant/Qual Fit", ru: "Quant/Qual соответствие" },
    verdicts: [
      { id: "classical_quant", en: "Classical quantitative PhD", ru: "Классический quant PhD" },
      { id: "applied_quant",   en: "Applied quantitative PhD",   ru: "Прикладной quant PhD" },
      { id: "mixed_methods",   en: "Mixed-methods PhD",          ru: "Смешанные методы PhD" },
      { id: "qualitative",     en: "Qualitative/interpretive PhD", ru: "Качественный/интерпретативный PhD" },
    ],
  },
  {
    name: { en: "Writing Sample / Proposal Gap", ru: "Writing sample / proposal" },
    verdicts: [
      { id: "sample_ready",     en: "Sample-ready",                 ru: "Sample готов" },
      { id: "draft_sharpening", en: "Has draft, needs sharpening",  ru: "Есть черновик, нужна доработка" },
      { id: "conceptual",       en: "Conceptual but not written",   ru: "Идея есть, текста нет" },
      { id: "major_gap",        en: "Major proposal gap",           ru: "Серьёзный пробел в proposal" },
    ],
  },
  {
    name: { en: "Funding Model", ru: "Модель финансирования" },
    verdicts: [
      { id: "fellowship",   en: "Fellowship-targeted (Rhodes/Marshall/Knight-Hennessy/etc)", ru: "Стипендии-флагманы (Rhodes/Marshall/Knight-Hennessy и т.п.)" },
      { id: "ra_ta",        en: "RA/TA funded",              ru: "RA/TA финансирование" },
      { id: "departmental", en: "Departmental funding-first", ru: "Финансирование от департамента" },
      { id: "self_funded",  en: "Self-funded high-risk",      ru: "Самофинансирование, высокий риск" },
    ],
  },
];

export function subcategoriesFor(degree: TargetDegree): FitSubcategory[] {
  if (degree === "bachelor") return BACHELOR_SUBCATEGORIES;
  if (degree === "master") return MASTER_SUBCATEGORIES;
  return PHD_SUBCATEGORIES;
}

/* ─── Best-Fit Pathway — small strategic-frame badge at top of dossier ─ */

export interface BestFitPathwayOption {
  id: string;
  label: { en: string; ru: string };
  /** One short sentence the model can lean on. Not rendered to the
   *  user directly — informs the rest of the report's framing. */
  hint: { en: string; ru: string };
}

export const BEST_FIT_PATHWAYS: BestFitPathwayOption[] = [
  {
    id: "funding_first",
    label: { en: "Funding-first", ru: "Финансирование-в-первую-очередь" },
    hint: {
      en: "Optimize for programs with the highest probability of full funding, not the highest brand.",
      ru: "Оптимизируйте под программы с максимальной вероятностью полного финансирования, а не под бренд.",
    },
  },
  {
    id: "prestige_tolerant",
    label: { en: "Prestige-tolerant", ru: "Терпимый к престижу" },
    hint: {
      en: "You're willing to accept partial funding or pay-in if the program is top-tier.",
      ru: "Готовы принять частичное финансирование или доплату, если программа — топ.",
    },
  },
  {
    id: "research_first",
    label: { en: "Research-first", ru: "Исследование-в-первую-очередь" },
    hint: {
      en: "The program's research fit + supervisor access outweighs brand and funding.",
      ru: "Исследовательский fit и доступ к руководителю важнее бренда и денег.",
    },
  },
  {
    id: "professional_first",
    label: { en: "Applied/Professional", ru: "Прикладной/профессиональный" },
    hint: {
      en: "Industry placement, career pivot, and applied learning matter more than research depth.",
      ru: "Трудоустройство, pivot карьеры и прикладное обучение важнее глубины исследований.",
    },
  },
  {
    id: "affordability_first",
    label: { en: "Affordability-first", ru: "Доступная стоимость" },
    hint: {
      en: "Stay-region-and-scholarship-up, or pick lower-cost destinations with strong outcomes.",
      ru: "Остаться в регионе со стипендией или выбрать более доступные направления с сильными результатами.",
    },
  },
];

export function findPathwayByLabel(label: string, lang: Language): BestFitPathwayOption | null {
  const norm = (s: string) => s.toLowerCase().replace(/[\s ]+/g, " ").trim();
  const target = norm(label);
  for (const p of BEST_FIT_PATHWAYS) {
    if (norm(p.label[lang]) === target) return p;
  }
  // Loose match — strip dashes/punct
  const loose = (s: string) => norm(s).replace(/[—\-–\/]/g, " ").replace(/[.,;:]+$/, "");
  for (const p of BEST_FIT_PATHWAYS) {
    if (loose(p.label[lang]) === loose(label)) return p;
  }
  // ID-style fallback (model echoed the id)
  for (const p of BEST_FIT_PATHWAYS) {
    if (norm(p.id.replace(/_/g, " ")) === norm(label)) return p;
  }
  return null;
}

/** Verdict lookup by language label string — used to validate LLM output
 *  against the closed set. Falls back to nearest-by-id when the model
 *  has minor whitespace/punctuation drift. */
export function findVerdictByLabel(
  subcat: FitSubcategory,
  label: string,
  lang: Language,
): { id: string; en: string; ru: string } | null {
  const norm = (s: string) => s.toLowerCase().replace(/[\s ]+/g, " ").trim();
  const target = norm(label);
  for (const v of subcat.verdicts) {
    if (norm(v[lang]) === target) return v;
  }
  // Loose match — strip trailing punctuation, normalize dashes
  const loose = (s: string) => norm(s).replace(/[—\-–]/g, " ").replace(/[.,;:]+$/, "");
  for (const v of subcat.verdicts) {
    if (loose(v[lang]) === loose(label)) return v;
  }
  return null;
}
