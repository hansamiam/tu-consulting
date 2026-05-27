/* SelectionsRow — Stitch revamp 2026-05-27.
 *
 * Horizontal scroll-snap row of medium portrait tiles (3:4) for the
 * top profile-aligned scholarships. Replaces the prior 3-col grid for
 * `sections.strong`. Edge-peek on mobile teaches the user to scroll;
 * desktop shows ~3 across with no scrollbar.
 *
 * Reuses the same country accent / CountryArt / clean* helpers as
 * ScholarCard, so the visual language stays consistent — this is a
 * shape variant, not a tonal shift.
 */
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, CheckCircle2 } from "lucide-react";
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
  provider_trust_tier?: "high" | "verified" | null;
}

const t = (lang: Lang, en: string, ru: string) => (lang === "ru" ? ru : en);

const fmtDaysLeft = (iso: string | null, lang: Lang): { text: string; tone: "danger" | "warn" | "neutral" } => {
  if (!iso) return { text: t(lang, "Rolling", "Без даты"), tone: "neutral" };
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: t(lang, "Closed", "Закрыто"), tone: "neutral" };
  if (days === 0) return { text: t(lang, "Closes today", "Закрытие сегодня"), tone: "danger" };
  if (days <= 7) return { text: t(lang, `${days}d left`, `${days} дн`), tone: "danger" };
  if (days <= 30) return { text: t(lang, `${days}d left`, `${days} дн`), tone: "warn" };
  return { text: t(lang, `${days}d`, `${days} дн`), tone: "neutral" };
};

interface SelectionTileProps {
  s: SelectionTileScholarship;
  index: number;
  onSelect: () => void;
  isBookmarked: boolean;
  onBookmark: (e: React.MouseEvent) => void;
  lang?: Lang;
}

const SelectionTile = ({ s, index, onSelect, isBookmarked, onBookmark, lang = "en" }: SelectionTileProps) => {
  const accent = accentForCountry(s.host_country);
  const country = s.host_country ? shortCountry(s.host_country, { tight: true }) : null;
  const flag = country
    ? ALL_COUNTRIES.find(c => c.v.toLowerCase() === canonicalCountry(s.host_country!).toLowerCase())?.f
      ?? ALL_COUNTRIES.find(c => c.v.toLowerCase() === s.host_country!.toLowerCase())?.f
    : null;
  const award = compactAward(s);
  const dl = fmtDaysLeft(s.application_deadline, lang);
  const verified = s.provider_trust_tier === "high";
  const isFullRide = s.coverage_type === "full_ride";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(index * 0.05, 0.25), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      onClick={onSelect}
      className="group relative shrink-0 snap-center w-[260px] sm:w-[300px] rounded-xl overflow-hidden bg-card border border-border hover:border-foreground/25 hover:shadow-lg transition-all cursor-pointer flex flex-col"
    >
      {/* Top visual — 3:4 country accent surface with CountryArt
          silhouette and the kicker label / save button overlaid. Image
          support could plug in via `cover_image_url` later; for now
          the silhouette is the editorial visual. */}
      <div className={`relative aspect-[3/4] bg-gradient-to-br ${accent} overflow-hidden`}>
        {s.cover_image_url ? (
          <img
            src={s.cover_image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <CountryArt
            country={s.host_country}
            className="absolute inset-0 h-full w-full opacity-50 text-white p-6"
          />
        )}
        {/* Bottom navy fade so the kicker reads against any silhouette. */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" />

        {/* Save button — top-right. */}
        <button
          onClick={onBookmark}
          aria-label={isBookmarked ? t(lang, "Unsave", "Убрать") : t(lang, "Save", "Сохранить")}
          className="absolute top-2.5 right-2.5 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/85 hover:bg-white text-foreground backdrop-blur-sm transition-colors shadow-sm"
        >
          {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-gold-dark" /> : <Bookmark className="h-4 w-4" />}
        </button>

        {/* Verified kicker — top-left, gold pill. */}
        {verified && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] bg-gold text-primary px-2 py-1 rounded-full shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            {t(lang, "Verified", "Проверено")}
          </span>
        )}

        {/* Full-ride sticker — bottom-right when applicable. */}
        {isFullRide && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] bg-primary text-primary-foreground px-2 py-1 rounded-full">
            {t(lang, "Full ride", "Полное")}
          </span>
        )}

        {/* Country + flag — bottom-left, white text over the fade. */}
        {country && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
            {flag && <span className="text-[13px] leading-none" aria-hidden>{flag}</span>}
            <span>{country}</span>
          </div>
        )}
      </div>

      {/* Caption — name + award + deadline pill. */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <h3 className="font-heading text-[15px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground group-hover:text-gold-dark transition-colors line-clamp-2">
          {cleanScholarshipName(s.scholarship_name)}
        </h3>
        {(() => {
          const p = cleanProvider(s.provider_name);
          if (!p) return null;
          return (
            <p className="text-[11px] text-muted-foreground/85 line-clamp-1 leading-snug">{p}</p>
          );
        })()}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 min-w-0">
          {award ? (
            <span className="text-[12px] font-semibold text-gold-dark truncate">{award}</span>
          ) : (
            <span className="text-[12px] text-muted-foreground/70 italic">{t(lang, "Funded", "Финансируется")}</span>
          )}
          <span
            className={`shrink-0 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${
              dl.tone === "danger"
                ? "bg-destructive/12 text-destructive"
                : dl.tone === "warn"
                  ? "bg-gold/15 text-gold-dark"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {dl.text}
          </span>
        </div>
      </div>
    </motion.article>
  );
};

export interface SelectionsRowProps {
  items: SelectionTileScholarship[];
  /** Map a scholarship to its existing Discover card props. We pass
   *  only the keys we need (select + bookmark) to keep this component
   *  focused; status/hide/compare live in the open detail dialog. */
  cardProps: (s: SelectionTileScholarship, i: number) => {
    onSelect: () => void;
    isBookmarked: boolean;
    onBookmark: (e: React.MouseEvent) => void;
  };
  lang?: Lang;
}

export const SelectionsRow = ({ items, cardProps, lang = "en" }: SelectionsRowProps) => {
  if (items.length === 0) return null;
  return (
    <div className="relative -mx-5 sm:-mx-8">
      {/* Edge fade — subtle right gradient hints there's more to scroll
          on viewports where the row clips. Hidden on desktop where the
          row typically fits without clipping. */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 sm:hidden" />
      <div
        className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pl-5 sm:pl-8 pr-5 sm:pr-8 pb-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        role="list"
        aria-label={lang === "ru" ? "Подборка для вас" : "Selections for you"}
      >
        {items.map((s, i) => {
          const props = cardProps(s, i);
          return (
            <div role="listitem" key={s.scholarship_id}>
              <SelectionTile s={s} index={i} lang={lang} {...props} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
