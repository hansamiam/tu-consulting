// v7 Masthead — Samuel's 2026-05-29 spec:
//   "Top Uni"  (small)        ····    READINESS  ●●●◐○  3.5 / 5  (top-right)
//   Strategy Report  (big)
//
//   Prepared for: Matthew | Track: Bachelor's (AI) | Target: Canada
//   May 29, 2026
//   ────────────────────────────────────────────────────────────
//
// Drops the golden T monogram (Samuel: "what the heck is that"). Adds
// the Readiness Score inline top-right next to "Top Uni" — keeps it
// high on the page without competing with the bold headline below.
//
// 2026-05-30 — Confidential / "do not distribute" footer dropped.
// Looked formal at first but it actively deterred any micro-
// influencer who might post about their dossier and amplify the
// brand. Org-internal documents are different; this is a user-owned
// strategy report we WANT shared.

import type { Language, StrategyReportV2 } from "../types";
import { t } from "../types";

interface Props {
  firstName: string;
  language: Language;
  generatedAt: string;
  /** From the original intake — drives the meta tagline below the title. */
  targetDegree?: StrategyReportV2["targetDegree"];
  fieldOfStudy?: string;
  targetCountries?: string[];
  /** Top-right readiness pill — placed in the masthead so the bold
   *  headline below stays uncrowded. */
  readinessScore?: number;
}

const DEGREE_LABEL: Record<Required<StrategyReportV2>["targetDegree"], { en: string; ru: string }> = {
  bachelor: { en: "Bachelor's", ru: "Бакалавриат" },
  master:   { en: "Master's",   ru: "Магистратура" },
  phd:      { en: "PhD",        ru: "PhD" },
};

// 2026-05-30 — display-only EN→RU lookups so the Russian masthead
// doesn't read "Магистратура (Biology) · Цель: Germany". The wizard
// stores both fields as canonical English tokens (so the LLM context
// stays language-stable); we localise them at the display boundary.
// Long-tail values (free-text majors / typeahead destinations not in
// these maps) fall through to the English label, which still reads
// fine since the user likely typed it themselves.
const MAJOR_RU: Record<string, string> = {
  "Undecided": "Ещё не решил(а)",
  "Anthropology": "Антропология", "Architecture": "Архитектура",
  "Artificial Intelligence": "Искусственный интеллект",
  "Biology": "Биология", "Business": "Бизнес", "Chemistry": "Химия",
  "Communications": "Коммуникации", "Computer Science": "Computer Science",
  "Cultural Studies": "Культурология", "Data Science": "Data Science",
  "Design": "Дизайн", "Development Studies": "Development Studies",
  "Economics": "Экономика", "Education": "Педагогика",
  "Engineering": "Инженерия", "Environmental Studies": "Экология",
  "Film": "Кино", "Finance": "Финансы", "History": "История",
  "International Relations": "Международные отношения",
  "Journalism": "Журналистика", "Law": "Юриспруденция",
  "Linguistics": "Лингвистика", "Literature": "Литература",
  "Marketing": "Маркетинг", "Mathematics": "Математика",
  "Medicine & Public Health": "Медицина и public health",
  "Music": "Музыка", "Performing Arts": "Исполнительские искусства",
  "Philosophy": "Философия", "Physics": "Физика",
  "Political Science": "Политология", "Psychology": "Психология",
  "Public Policy": "Государственная политика",
  "Social Work": "Социальная работа", "Sociology": "Социология",
  "Statistics": "Статистика", "Sustainability": "Устойчивое развитие",
  "Visual Arts": "Изобразительное искусство",
};

const COUNTRY_RU: Record<string, string> = {
  "USA": "США", "UK": "Великобритания", "Canada": "Канада",
  "Germany": "Германия", "Czech Republic": "Чехия", "Czechia": "Чехия",
  "South Korea": "Южная Корея", "Poland": "Польша", "Hungary": "Венгрия",
  "Türkiye": "Турция", "Turkey": "Турция", "Japan": "Япония", "China": "Китай",
  "Australia": "Австралия", "Singapore": "Сингапур", "Netherlands": "Нидерланды",
  "Malaysia": "Малайзия", "France": "Франция", "Italy": "Италия",
  "Spain": "Испания", "Sweden": "Швеция", "Norway": "Норвегия",
  "Denmark": "Дания", "Finland": "Финляндия", "Switzerland": "Швейцария",
  "Belgium": "Бельгия", "Ireland": "Ирландия", "New Zealand": "Новая Зеландия",
  "Russia": "Россия", "Kazakhstan": "Казахстан", "Uzbekistan": "Узбекистан",
  "Kyrgyzstan": "Кыргызстан",
};

const ScoreDots = ({ score }: { score: number }) => {
  const dots = [1, 2, 3, 4, 5];
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Readiness score ${score} out of 5`}>
      {dots.map((n) => {
        const fill = Math.max(0, Math.min(1, score - (n - 1)));
        return (
          <span
            key={n}
            className="relative inline-block w-2.5 h-2.5 rounded-full border border-gold-dark/60 bg-transparent overflow-hidden"
          >
            <span
              className="absolute inset-0 bg-gold-dark"
              style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
            />
          </span>
        );
      })}
      <span className="ml-1.5 text-[12px] font-bold text-foreground tabular-nums">
        {score.toFixed(1).replace(/\.0$/, "")}
        <span className="text-foreground/40"> / 5</span>
      </span>
    </span>
  );
};

export const Masthead = ({
  firstName,
  language,
  generatedAt,
  targetDegree,
  fieldOfStudy,
  targetCountries,
  readinessScore,
}: Props) => {
  const dateStr = (() => {
    try {
      return new Date(generatedAt).toLocaleDateString(
        language === "ru" ? "ru-RU" : "en-US",
        { day: "numeric", month: "long", year: "numeric" },
      );
    } catch {
      return "";
    }
  })();

  const degreeLabel = targetDegree ? DEGREE_LABEL[targetDegree][language] : "";
  const localizedField = (() => {
    if (!fieldOfStudy) return "";
    if (language !== "ru") return fieldOfStudy;
    return MAJOR_RU[fieldOfStudy] ?? fieldOfStudy;
  })();
  const trackBits = [degreeLabel, localizedField].filter(Boolean);
  const trackStr = trackBits.length === 2 ? `${trackBits[0]} (${trackBits[1]})` : trackBits[0] || "";
  const targetStr = (targetCountries ?? [])
    .slice(0, 3)
    .map(c => (language === "ru" ? (COUNTRY_RU[c] ?? c) : c))
    .join(" / ");

  const metaParts: string[] = [];
  if (firstName) metaParts.push(`${t(language, "Prepared for", "Подготовлено для")}: ${firstName}`);
  if (trackStr) metaParts.push(`${t(language, "Track", "Трек")}: ${trackStr}`);
  if (targetStr) metaParts.push(`${t(language, "Target", "Цель")}: ${targetStr}`);

  return (
    <header className="mb-5 pb-4 border-b border-foreground/15">
      {/* Top row: "Top Uni" eyebrow left · Readiness Score right */}
      <div className="flex items-baseline justify-between gap-4 mb-1">
        <p className="font-heading text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.32em] text-gold-dark m-0">
          {t(language, "Top Uni", "Top Uni")}
        </p>
        {typeof readinessScore === "number" && (
          <div className="flex items-baseline gap-2 sm:gap-2.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/55">
              {t(language, "Readiness", "Готовность")}
            </span>
            <ScoreDots score={readinessScore} />
          </div>
        )}
      </div>

      {/* Big "Strategy Report" title */}
      <h2 className="font-heading text-[24px] sm:text-[30px] font-bold tracking-[-0.015em] text-foreground m-0 mb-3 leading-[1.05]">
        {t(language, "Strategy Report", "Стратегический отчёт")}
      </h2>

      {/* Meta line — Prepared for | Track | Target. Wraps on mobile. */}
      {metaParts.length > 0 && (
        <p className="text-[12px] sm:text-[12.5px] leading-[1.55] text-foreground/72 m-0 mb-1">
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="text-foreground/35 mx-2">|</span>}
              {part}
            </span>
          ))}
        </p>
      )}

      {/* Date */}
      {dateStr && (
        <p className="text-[11px] text-foreground/50 m-0 mb-1.5 tabular-nums">
          {dateStr}
        </p>
      )}

      {/* 2026-05-30 — Confidential / non-distribute line removed —
          intentionally encouraging shares of the dossier. */}
    </header>
  );
};
