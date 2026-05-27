/* SelectionsRow — Stitch revamp 2026-05-27 (rev 2).
 *
 * Horizontal row of 3 image-forward editorial tiles. Each tile shows
 * a country pill on the image, scholarship name with a verified pill
 * inline, two-line description, and Funding / Institution meta rows.
 *
 * Always shows — even without a profile. Caller passes the top-N
 * ranked scholarships; this row caps display at the visible width
 * (3 on desktop, scroll-snap on mobile).
 */
import { CheckCircle2, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { CountryArt } from "@/lib/countryArt";
import { accentForCountry, shortCountry, canonicalCountry } from "@/lib/countryAccent";
import { cleanScholarshipName, cleanProvider, compactAward } from "@/lib/scholarshipFields";
import { ALL_COUNTRIES } from "@/data/countries";

type Lang = "en" | "ru";

export interface SelectionTileScholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  funding_country?: string | null;
  citizenship_requirements?: string | null;
  coverage_type: string | null;
  award_amount_text: string | null;
  estimated_total_value_usd?: number | null;
  application_deadline: string | null;
  cover_image_url?: string | null;
  canonical_overview?: string | null;
  provider_trust_tier?: "high" | "verified" | null;
}

const t = (lang: Lang, en: string, ru: string) => (lang === "ru" ? ru : en);

interface SelectionTileProps {
  s: SelectionTileScholarship;
  index: number;
  onSelect: () => void;
  isBookmarked: boolean;
  onBookmark: (e: React.MouseEvent) => void;
  lang?: Lang;
}

/* Pull a sensible 2-line description from a scholarship row. Prefers
 * canonical_overview (curated), falls back to a constructed line from
 * coverage type + provider so the card never looks empty. */
const deriveDescription = (s: SelectionTileScholarship, lang: Lang): string => {
  if (s.canonical_overview && s.canonical_overview.trim().length > 20) {
    return s.canonical_overview.trim();
  }
  const ru = lang === "ru";
  const cov = s.coverage_type;
  if (cov === "full_ride") return ru ? "Полное финансирование с проживанием и стипендией." : "Fully-funded award covering tuition, living costs, and travel.";
  if (cov === "tuition_only") return ru ? "Покрытие стоимости обучения." : "Tuition support for an accredited degree programme.";
  if (cov === "stipend") return ru ? "Ежемесячная стипендия на период обучения." : "Monthly stipend support across the duration of study.";
  if (cov === "partial") return ru ? "Частичное финансирование обучения." : "Partial funding toward your degree costs.";
  return ru ? "Конкурсное финансирование от ведущего фонда." : "Competitive funding from a leading provider.";
};

const SelectionTile = ({ s, index, onSelect, isBookmarked: _isBookmarked, onBookmark: _onBookmark, lang = "en" }: SelectionTileProps) => {
  void _isBookmarked; void _onBookmark;
  const accent = accentForCountry(s.host_country);
  const country = s.host_country ? shortCountry(s.host_country, { tight: false }) : null;
  const countryLabel = country ? country.toUpperCase() : t(lang, "GLOBAL", "ГЛОБАЛЬНО");
  const flag = s.host_country
    ? (ALL_COUNTRIES.find(c => c.v.toLowerCase() === canonicalCountry(s.host_country!).toLowerCase())?.f
        ?? ALL_COUNTRIES.find(c => c.v.toLowerCase() === s.host_country!.toLowerCase())?.f)
    : null;
  const cleanedName = cleanScholarshipName(s.scholarship_name);
  const cleanedProv = cleanProvider(s.provider_name);
  const award = compactAward(s);
  const verified = s.provider_trust_tier === "high";
  const description = deriveDescription(s, lang);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.06, 0.2), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className="group relative shrink-0 snap-start w-[320px] sm:w-auto rounded-2xl overflow-hidden bg-card border border-border hover:border-foreground/25 hover:shadow-lg transition-all cursor-pointer flex flex-col sm:flex-row"
    >
      {/* Image — horizontal layout on tablet+: image takes the left
       *  ~42% of the tile, content fills the right. Mobile (single
       *  column) keeps the stacked image-on-top look. The aspect ratio
       *  is the visual driver for tile height — 16:11 on mobile,
       *  fixed-height (h-full) on desktop so the row sits compact. */}
      <div className={`relative w-full sm:w-[42%] shrink-0 aspect-[16/11] sm:aspect-auto sm:min-h-[180px] bg-gradient-to-br ${accent} overflow-hidden`}>
        {s.cover_image_url ? (
          <img
            src={s.cover_image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <CountryArt
            country={s.host_country}
            className="absolute inset-0 h-full w-full opacity-45 text-white p-6"
          />
        )}
        {/* Subtle navy fade top-left so the country pill reads against
         *  light images. */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[hsl(var(--navy-deep))]/35 via-[hsl(var(--navy-deep))]/10 to-transparent pointer-events-none" />
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] bg-white/95 text-foreground px-2 py-1 rounded shadow-sm">
          {flag ? (
            <span className="text-[11px] leading-none" aria-hidden>{flag}</span>
          ) : (
            <Globe className="h-3 w-3" />
          )}
          {countryLabel}
        </span>
      </div>

      {/* Caption — name + verified, description, meta rows. */}
      <div className="p-4 sm:p-4 flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="font-heading text-[15px] sm:text-[16px] font-bold leading-tight tracking-[-0.01em] text-foreground group-hover:text-gold-dark transition-colors line-clamp-2 min-w-0">
            {cleanedName}
          </h3>
          {verified && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-success bg-success/10 px-1.5 py-0.5 rounded mt-0.5">
              <CheckCircle2 className="h-3 w-3" />
              {t(lang, "Verified", "Проверено")}
            </span>
          )}
        </div>

        <p className="text-[12px] text-muted-foreground leading-snug line-clamp-2">
          {description}
        </p>

        <div className="mt-auto pt-2 border-t border-border/60 space-y-1">
          <div className="flex items-center justify-between gap-3 text-[11px] min-w-0">
            <span className="text-muted-foreground/80 shrink-0">{t(lang, "Funding", "Финансирование")}</span>
            <span className="font-semibold text-foreground truncate text-right">
              {award || t(lang, "Funded", "Финансируется")}
            </span>
          </div>
          {cleanedProv && (
            <div className="flex items-center justify-between gap-3 text-[11px] min-w-0">
              <span className="text-muted-foreground/80 shrink-0">{t(lang, "Institution", "Учреждение")}</span>
              <span className="text-foreground/85 truncate text-right">{cleanedProv}</span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export interface SelectionsRowProps {
  items: SelectionTileScholarship[];
  cardProps: (s: SelectionTileScholarship, i: number) => {
    onSelect: () => void;
    isBookmarked: boolean;
    onBookmark: (e: React.MouseEvent) => void;
  };
  lang?: Lang;
}

export const SelectionsRow = ({ items, cardProps, lang = "en" }: SelectionsRowProps) => {
  if (items.length === 0) return null;
  /* Rev 4: 2 tiles per row on desktop (horizontal-layout tiles), 1
   * per row on mobile with horizontal scroll-snap. Cap visible at 2;
   * scroll reveals more on mobile only. */
  const visibleItems = items.slice(0, 4);
  return (
    <div className="relative -mx-5 sm:mx-0">
      <div
        className="flex sm:grid sm:grid-cols-2 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pl-5 pr-5 sm:pl-0 sm:pr-0 pb-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        role="list"
        aria-label={lang === "ru" ? "Подборка для вас" : "Selections for you"}
      >
        {visibleItems.slice(0, 2).map((s, i) => {
          const props = cardProps(s, i);
          return (
            <div role="listitem" key={s.scholarship_id} className="sm:contents">
              <SelectionTile s={s} index={i} lang={lang} {...props} />
            </div>
          );
        })}
        {/* Mobile-only: reveal items 3-4 in the horizontal scroll. */}
        <div className="contents sm:hidden">
          {visibleItems.slice(2).map((s, i) => {
            const props = cardProps(s, i + 2);
            return (
              <div role="listitem" key={s.scholarship_id}>
                <SelectionTile s={s} index={i + 2} lang={lang} {...props} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
