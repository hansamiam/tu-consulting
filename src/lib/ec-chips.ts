// Extracurricular chip data for the TopUni AI wizard Step 3.
//
// Broad-first design: the default chip row leads with culturally
// inclusive activities (Tutoring, Part-time job, Family responsibilities,
// Creating online, Self-taught skill) BEFORE the elite-coded ones
// (Olympiads, Debate, Research). Elite chips live behind a
// "+ More activities…" expandable so they're still reachable for keener-
// nerd cohorts without being the default that telegraphs "we serve the
// Crimson Education track." Per project_topuni_positioning_anti_crimson
// memory.
//
// Each chip has THREE fields:
//   - token: stable snake_case identifier persisted to localStorage.
//   - en / ru: localized chip label shown in the UI.
//   - tagPhrase: ENGLISH natural-language phrase that gets prepended
//     to the extracurriculars textarea on Generate. Always English
//     regardless of UI language so the archetype-library regex
//     detector can match (its keyword patterns are English-only).

export interface ECEntry {
  token: string;
  en: string;
  ru: string;
  /** Natural-language phrase used when prepending to extracurriculars.
   *  Designed to match archetype-library.ts keyword regexes where
   *  possible (e.g., "tutoring" hits COMMUNITY_KEYWORDS). */
  tagPhrase: string;
}

export const EC_BROAD_CHIPS: ECEntry[] = [
  { token: "sports",                  en: "Sports",                  ru: "Спорт",                tagPhrase: "sports" },
  { token: "arts_music",              en: "Arts / Music",            ru: "Искусство / Музыка",   tagPhrase: "arts and music" },
  { token: "coding_tech",             en: "Coding / Tech",           ru: "Программирование / IT", tagPhrase: "coding and tech" },
  { token: "volunteering",            en: "Volunteering",            ru: "Волонтёрство",         tagPhrase: "volunteering" },
  { token: "tutoring",                en: "Tutoring",                ru: "Репетиторство",        tagPhrase: "tutoring younger students" },
  { token: "part_time_job",           en: "Part-time job",           ru: "Подработка",           tagPhrase: "part-time job" },
  { token: "family_responsibilities", en: "Family responsibilities", ru: "Помощь семье",         tagPhrase: "family responsibilities" },
  { token: "creating_online",         en: "Creating online",         ru: "Контент онлайн",       tagPhrase: "creating online content" },
  { token: "self_taught_skill",       en: "Self-taught skill",       ru: "Самообучение",         tagPhrase: "self-taught skill" },
  { token: "other",                   en: "Other",                   ru: "Другое",               tagPhrase: "" },
];

export const EC_ELITE_EXPANDABLE: ECEntry[] = [
  { token: "olympiads",          en: "Olympiads",          ru: "Олимпиады",                 tagPhrase: "olympiad competitions" },
  { token: "debate",             en: "Debate",             ru: "Дебаты",                    tagPhrase: "debate" },
  { token: "research",           en: "Research",           ru: "Исследования",              tagPhrase: "research" },
  { token: "public_speaking",    en: "Public speaking",    ru: "Публичные выступления",     tagPhrase: "public speaking" },
  { token: "student_government", en: "Student government", ru: "Школьное самоуправление",   tagPhrase: "student government" },
  { token: "entrepreneurship",   en: "Entrepreneurship",   ru: "Предпринимательство",       tagPhrase: "entrepreneurship" },
  { token: "religious_community", en: "Religious community", ru: "Религиозная община",      tagPhrase: "religious community" },
  { token: "folk_arts",          en: "Folk arts",          ru: "Народное искусство",        tagPhrase: "folk arts" },
];

const ALL_CHIPS = [...EC_BROAD_CHIPS, ...EC_ELITE_EXPANDABLE];
const TOKEN_INDEX = new Map(ALL_CHIPS.map((c) => [c.token, c]));

export function ecChipLabel(token: string, language: "en" | "ru"): string {
  const entry = TOKEN_INDEX.get(token);
  if (!entry) return token;
  return language === "ru" ? entry.ru : entry.en;
}

/** Build the tag prefix line from a list of selected tokens.
 *  Drops `other` (no tag phrase) and unknown tokens.
 *  Returns "" if no usable chips picked. */
export function buildECTagLine(tokens: string[]): string {
  const phrases = tokens
    .map((t) => TOKEN_INDEX.get(t)?.tagPhrase)
    .filter((p): p is string => !!p && p.length > 0);
  if (phrases.length === 0) return "";
  return `tags: ${phrases.join(", ")}`;
}

/** Combine the tag line + the user's free-text extracurriculars into
 *  the final string sent to the brief generator. The tag line goes
 *  first so archetype-library.ts keyword detection picks it up early. */
export function composeExtracurriculars(
  selectedTokens: string[], freeText: string,
): string {
  const tagLine = buildECTagLine(selectedTokens);
  const text = (freeText ?? "").trim();
  if (!tagLine && !text) return "";
  if (!tagLine) return text;
  if (!text) return tagLine;
  return `${tagLine}\n\n${text}`;
}
