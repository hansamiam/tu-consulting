/* HeroCard — Discover v1 F4 "mechta mode" featured slot.
 *
 * Presentation-only React component. Parent (Discover.tsx) fetches via
 * match-scholarships?mode=hero, passes the resolved scholarship + the
 * LLM hero_reason in, and HeroCard renders the magazine-style hero.
 *
 * Visual idiom matches ExpandedScholarshipDialog's hero strip — heavy
 * country gradient + full-bleed CountryArt silhouette + dark overlay +
 * white text — so the hero feels like a continuation of the catalog's
 * visual language, not a tonally different surface.
 *
 * Profile-quality treatments (plan D8 / F4):
 *   - rich     → hero_reason rendered verbatim
 *   - partial  → hero_reason + soft "Complete your profile to sharpen this"
 *                CTA underneath
 *   - sparse / empty → caller passes an editorial pick + a static tagline
 *                in place of hero_reason. We render the same shell; the
 *                copy distinction is the parent's call.
 *
 * Not wired into Discover.tsx in this commit. Parent integration is a
 * follow-up so the wiring touches stay small and reviewable.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink, Info } from "lucide-react";
import { cleanScholarshipName, cleanProvider } from "@/lib/scholarshipFields";
import { shortCountry, accentForCountry } from "@/lib/countryAccent";
import { CountryArt } from "@/lib/countryArt";

type Lang = "en" | "ru";
type ProfileQuality = "rich" | "partial" | "sparse" | "empty";

export interface HeroCardScholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string | null;
  award_amount_text: string | null;
  application_deadline: string | null;
  cover_image_url?: string | null;
  official_url: string | null;
}

export interface HeroCardProps {
  scholarship: HeroCardScholarship;
  /** One-sentence "why this scholarship right now" from match-scholarships?mode=hero.
   *  For sparse/empty profiles caller passes an editorial tagline instead. */
  heroReason: string | null;
  /** 0..1 — surfaces a low-confidence subtitle when below 0.65. */
  heroConfidence?: number | null;
  profileQuality: ProfileQuality;
  /** Open the detail sheet inline with this scholarship pre-loaded. */
  onExpand: () => void;
  /** Optional: deep-link to the wizard so "partial" profiles can sharpen. */
  onSharpenProfile?: () => void;
  lang?: Lang;
}

const fmtDeadline = (iso: string | null, lang: Lang): { text: string; tone: "danger" | "warn" | "neutral" } => {
  const ru = lang === "ru";
  if (!iso) return { text: ru ? "Без фиксированной даты" : "Rolling deadline", tone: "neutral" };
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: ru ? "Закрыто" : "Closed", tone: "neutral" };
  if (days === 0) return { text: ru ? "Закрывается сегодня" : "Closes today", tone: "danger" };
  if (days <= 7) return { text: ru ? `Через ${days} дн` : `${days} days left`, tone: "danger" };
  if (days <= 30) return { text: ru ? `Через ${days} дн` : `${days} days left`, tone: "warn" };
  return { text: ru ? `${days} дн` : `${days} days`, tone: "neutral" };
};

export const HeroCard = ({
  scholarship,
  heroReason,
  heroConfidence,
  profileQuality,
  onExpand,
  onSharpenProfile,
  lang = "en",
}: HeroCardProps) => {
  const ru = lang === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const cleanedName = cleanScholarshipName(scholarship.scholarship_name);
  const cleanedProv = cleanProvider(scholarship.provider_name);
  const country = scholarship.host_country ? shortCountry(scholarship.host_country) : null;
  const dl = fmtDeadline(scholarship.application_deadline, lang);
  const accent = scholarship.host_country
    ? accentForCountry(scholarship.host_country)
    : "from-foreground/40 to-foreground/60";
  // Coverage chip stripped 2026-05-27 ("strip all full ride stickers
  // from entries"). The HeroCard still surfaces the award amount via
  // awardBadge below; coverage label was the duplicated noisy chip
  // ("Full ride" beside "$50K") the user called out.
  const cov: string | null = null;

  // award_amount_text is sometimes a tight money figure ("$25,000 / year")
  // and sometimes a free-text sentence pulled from the source page
  // ("Funding support with J-1 visa, health benefits, monthly stipend, …").
  // The former renders cleanly as a badge; the latter truncates mid-sentence
  // and reads as broken copy. Only badge-render the tight form.
  const awardText = scholarship.award_amount_text?.trim() ?? "";
  const looksLikeAmount =
    awardText.length > 0 &&
    awardText.length <= 32 &&
    !awardText.includes(",") &&
    awardText.split(/\s+/).length <= 5;
  const awardBadge = looksLikeAmount ? awardText : null;

  const isPersonalized = profileQuality === "rich" || profileQuality === "partial";

  const eyebrow = isPersonalized
    ? t("Your scholarship right now", "Стипендия для вас сейчас")
    : t("Top Uni's pick this week", "Выбор Top Uni на неделе");

  return (
    <section
      aria-label={t("Featured scholarship", "Рекомендуемая стипендия")}
      className="
        relative w-full rounded-2xl overflow-hidden mb-6
        ring-1 ring-[hsl(var(--navy-deep)/0.18)]
        shadow-[0_12px_28px_-12px_hsl(var(--navy-deep)/0.22),0_4px_8px_-2px_hsl(var(--navy-deep)/0.08)]
        transition-shadow duration-300
        hover:shadow-[0_18px_36px_-12px_hsl(var(--navy-deep)/0.28),0_6px_12px_-2px_hsl(var(--navy-deep)/0.10)]
      "
    >
      {/* Gold hairline accent — top edge brand presence without color noise. */}
      <div
        className="absolute top-0 inset-x-0 h-px z-20 bg-gradient-to-r from-transparent via-gold/55 to-transparent"
        aria-hidden
      />

      {/* Hero strip — same idiom as ExpandedScholarshipDialog */}
      <div className={`relative bg-gradient-to-br ${accent} text-white`}>
        {scholarship.cover_image_url ? (
          <img
            src={scholarship.cover_image_url}
            alt=""
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <CountryArt
            country={scholarship.host_country}
            className="absolute inset-0 h-full w-full opacity-20 text-white"
          />
        )}
        {/* Readability scrim — two stacked gradients. The horizontal one
            does the heavy lifting: text sits inside max-w-3xl on the
            left, so we darken that side heavily and let the photo
            breathe on the right. The vertical bottom-up assist
            guarantees chip-row contrast no matter how bright the lower
            edge of the photo is. Replaces a single bottom-up gradient
            whose LIGHTEST point (20% black) sat exactly where the
            title + provider + reason render — unreadable over any
            high-luminance photo. */}
        <span
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10"
          aria-hidden
        />
        <span
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
          aria-hidden
        />

        {/* One-shot shine — a slow diagonal highlight sweeps across once
            on mount. Pure visual polish; reduced-motion users skip via
            the prefers-reduced-motion guard in src/index.css. */}
        <span
          className="hero-shine pointer-events-none absolute inset-0 z-[1]"
          aria-hidden
        />

        <div className="relative px-6 sm:px-9 py-9 sm:py-11 max-w-3xl">
          {/* Eyebrow */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 mb-3">
            {eyebrow}
            {country && <span className="opacity-70"> · {country}</span>}
          </p>

          {/* Name — large, room for 3 lines. Text-shadow ensures crispness
              over any photo even when the scrim does most of the work;
              bright skin tones / sun glare can bleed through a 75% black
              scrim at high luminance. */}
          <h2
            className="text-2xl sm:text-3xl font-heading font-bold leading-[1.15] mb-3 line-clamp-3"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
          >
            {cleanedName ?? scholarship.scholarship_name}
          </h2>

          {/* Provider */}
          {cleanedProv && (
            <p className="text-sm text-white/90 mb-4">{cleanedProv}</p>
          )}

          {/* Hero reason / editorial tagline */}
          {heroReason && (
            <p className="text-base sm:text-lg text-white/95 leading-snug mb-5 max-w-2xl">
              {heroReason}
            </p>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {cov && (
              <Badge
                variant="secondary"
                className="bg-black/40 text-white border-0 backdrop-blur-md font-normal"
              >
                {cov}
              </Badge>
            )}
            {awardBadge && (
              <Badge
                variant="secondary"
                className="bg-black/40 text-white border-0 backdrop-blur-md font-normal"
              >
                {awardBadge}
              </Badge>
            )}
            {dl.text && (
              <Badge
                variant="secondary"
                className={[
                  "border-0 backdrop-blur font-normal",
                  dl.tone === "danger"
                    ? "bg-rose-500/85 text-white"
                    : dl.tone === "warn"
                    ? "bg-amber-400/85 text-amber-950"
                    : "bg-black/40 text-white backdrop-blur-md",
                ].join(" ")}
              >
                {dl.text}
              </Badge>
            )}
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-3">
            {scholarship.official_url && (
              <Button
                asChild
                size="lg"
                className="bg-white text-foreground hover:bg-white/95 font-semibold"
              >
                <a
                  href={scholarship.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  {t("Apply on official site", "Подать заявку")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            {/* 2026-05-25 (late): secondary CTA back. Opens the detail
                sheet which now carries the personalized archetype
                insight + static mini-guide ("How to win it" / "What to
                prepare" / "Watch out"). Label matches the mini-guide's
                first section title so the user knows what's behind it. */}
            <Button
              size="lg"
              variant="ghost"
              onClick={onExpand}
              className="text-white hover:bg-white/15 font-semibold inline-flex items-center gap-1.5"
            >
              {t("How to win it", "Как выиграть")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Partial-profile sharpen CTA — only shown for the partial bucket. */}
      {profileQuality === "partial" && onSharpenProfile && (
        <div className="bg-muted/40 px-6 sm:px-9 py-3 border-t border-border/60 flex items-center gap-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <p className="text-sm text-muted-foreground flex-1">
            {t(
              "We're working with a partial profile. Add your GPA, languages, and target countries to sharpen this.",
              "У нас неполный профиль. Добавьте GPA, языки и целевые страны — будет точнее.",
            )}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSharpenProfile}
            className="shrink-0"
          >
            {t("Sharpen", "Уточнить")}
          </Button>
        </div>
      )}

      {/* Low-confidence subtitle — surfaced when LLM wasn't sure of the fit */}
      {isPersonalized && typeof heroConfidence === "number" && heroConfidence < 0.65 && (
        <div className="bg-muted/30 px-6 sm:px-9 py-2.5 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            {t(
              "Match confidence is moderate — worth a look but not a slam dunk for your profile.",
              "Совпадение умеренное — посмотреть стоит, но это не идеальная подгонка под профиль.",
            )}
          </p>
        </div>
      )}
    </section>
  );
};

export default HeroCard;
