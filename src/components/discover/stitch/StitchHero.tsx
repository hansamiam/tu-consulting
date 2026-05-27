/* StitchHero — Stitch revamp 2026-05-27.
 *
 * Full-bleed magazine hero for the top-featured scholarship. Replaces
 * the prior HeroCard. Image (or country accent + silhouette fallback)
 * fills the frame, bottom-left content stack carries FEATURED + provider
 * pills, big serif title, description, and "Open official site" CTA
 * with inline deadline.
 *
 * Reuses cleanScholarshipName, cleanProvider, accentForCountry,
 * CountryArt — the visual language stays inside the same palette.
 */
import { Clock, ExternalLink, ArrowRight } from "lucide-react";
import { CountryArt } from "@/lib/countryArt";
import { accentForCountry } from "@/lib/countryAccent";
import { cleanScholarshipName, cleanProvider } from "@/lib/scholarshipFields";

/* First-sentence extractor — banner shows only the opening sentence
 * for editorial restraint; the full overview lives in the detail
 * pull-up so nothing is cut off, just visually deferred. Falls back
 * to the raw text when no sentence boundary is found. */
const firstSentence = (text: string): string => {
  const trimmed = text.trim();
  const m = trimmed.match(/^[\s\S]+?[.!?](?=\s|$)/);
  return (m ? m[0] : trimmed).trim();
};

type Lang = "en" | "ru";

export interface StitchHeroScholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  funding_country?: string | null;
  coverage_type: string | null;
  award_amount_text: string | null;
  application_deadline: string | null;
  cover_image_url?: string | null;
  canonical_overview?: string | null;
  official_url: string | null;
}

interface StitchHeroProps {
  scholarship: StitchHeroScholarship;
  /** Full canonical_overview from the scholarship row. The banner
   *  renders ONLY the first sentence (editorial restraint); the full
   *  text is shown when the user opens the detail pull-up. */
  description?: string | null;
  /** Open the detail pull-up. Fires on click anywhere on the banner
   *  surface (except the "Open official site" anchor, which navigates
   *  externally). */
  onExpand: () => void;
  lang?: Lang;
}

const t = (lang: Lang, en: string, ru: string) => (lang === "ru" ? ru : en);

const fmtDaysLeft = (iso: string | null, lang: Lang): string | null => {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return t(lang, "Closed", "Закрыто");
  if (days === 0) return t(lang, "Closes today", "Закрытие сегодня");
  return t(lang, `Closes in ${days} days`, `Закрытие через ${days} дн`);
};

export const StitchHero = ({
  scholarship,
  description,
  onExpand,
  lang = "en",
}: StitchHeroProps) => {
  const cleanedName = cleanScholarshipName(scholarship.scholarship_name);
  const cleanedProv = cleanProvider(scholarship.provider_name);
  const accent = accentForCountry(scholarship.host_country);
  const daysLeft = fmtDaysLeft(scholarship.application_deadline, lang);
  const officialUrl = scholarship.official_url;
  const showCover = !!scholarship.cover_image_url;
  const descriptionFirstSentence = description ? firstSentence(description) : null;

  /* The entire banner is clickable — opens the right-hand detail
   * pull-up. The "Open official site" anchor inside stops propagation
   * so its native external navigation isn't hijacked. Sam tried
   * clicking the big banner expecting the pull-up (2026-05-27) and
   * nothing happened; this wires that affordance. */
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand();
        }
      }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
    >
      {/* Image / accent surface. Rev 4: hero further compacted to
          ~16:5 desktop so it fits comfortably above-the-fold with
          Selections row. Mobile stays 4:5 (title needs height). */}
      <div className={`relative w-full aspect-[4/5] sm:aspect-[16/8] lg:aspect-[16/5] bg-gradient-to-br ${accent}`}>
        {showCover ? (
          <img
            src={scholarship.cover_image_url!}
            alt=""
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <CountryArt
            country={scholarship.host_country}
            className="absolute inset-0 h-full w-full opacity-25 text-white p-12"
          />
        )}

        {/* Navy overlay — rev 3 swaps the neutral black gradient for
            a brand-navy cast (hsl(var(--navy-deep))). The deeper navy
            anchors the text and ties the hero to the rest of the
            navy/gold product chrome. Stronger on mobile (full-width
            title); on desktop the gradient stays bottom-left so the
            image reads on the right half. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--navy-deep))]/90 via-[hsl(var(--navy-deep))]/55 to-[hsl(var(--navy-deep))]/15 sm:bg-gradient-to-tr sm:from-[hsl(var(--navy-deep))]/90 sm:via-[hsl(var(--navy-deep))]/50 sm:to-transparent pointer-events-none" />

        {/* Save heart removed 2026-05-27. The top-right floating icon
            on a hero that already carries a "Featured" pill and a CTA
            row read as competing chrome — and the bookmark affordance
            is available inside the detail pull-up that this banner
            now opens on click. */}

        {/* Content stack — bottom-left. Rev 7: smaller bottom padding
         *  so the title sits closer to the bottom edge. */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 pb-4 sm:p-8 sm:pb-5 lg:p-10 lg:pb-6 max-w-3xl">
          {/* Kicker pills row. */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] bg-gold text-primary px-2.5 py-1 rounded">
              {t(lang, "Featured", "В фокусе")}
            </span>
            {cleanedProv && (
              <span className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] bg-white/95 text-foreground px-2.5 py-1 rounded">
                {cleanedProv}
              </span>
            )}
          </div>

          {/* Title — Montserrat heading. Rev 7: another step down so
           *  long titles read in proportion to the new shorter hero. */}
          <h2 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold leading-[1.1] tracking-[-0.015em] text-white max-w-2xl mb-3">
            {cleanedName}
          </h2>

          {/* Description — banner shows ONLY the first sentence. The
              full canonical_overview renders inside the detail
              pull-up so longer copy isn't cut mid-clause here. */}
          {descriptionFirstSentence && (
            <p className="text-white/85 text-[13px] sm:text-sm lg:text-base leading-relaxed max-w-xl mb-5">
              {descriptionFirstSentence}
            </p>
          )}

          {/* CTA row — Open official site + deadline. */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {officialUrl ? (
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.14em] bg-white text-primary px-5 sm:px-6 py-3 sm:py-3.5 rounded-lg hover:bg-white/90 transition-colors"
              >
                {t(lang, "Open official site", "Открыть сайт")}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="inline-flex items-center gap-2 text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.14em] bg-white text-primary px-5 sm:px-6 py-3 sm:py-3.5 rounded-lg hover:bg-white/90 transition-colors"
              >
                {t(lang, "View details", "Подробнее")}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {daysLeft && (
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-medium text-white/90">
                <Clock className="h-3.5 w-3.5" />
                {daysLeft}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
