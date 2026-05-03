import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award, Calendar, GraduationCap, MapPin, Crown, ArrowRight, Share2,
  Users, Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * The product's premium scholarship card. Used on every listing surface
 * (Discover, ScholarshipsByFilter, AIMatch results, CountryGuide, etc.).
 *
 * Designed to feel like Linear / Vercel cards — not a school project:
 *  - Bold heading with provider initials avatar
 *  - Prominent funding amount with icon
 *  - Color-coded urgency: red <14d, amber <30d, green/neutral otherwise
 *  - Featured rows render with a gold border + FEATURED ribbon
 *  - Hover lifts subtly (shadow + 1px translate)
 *  - Fade-in entrance animation
 *  - Optional share button hands off to the parent's modal
 *
 * The card never deep-knows where it lives — just takes a row + optional
 * onShare callback.
 */

export interface ScholarshipCardData {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  is_featured?: boolean | null;
  why_this_fits?: string | null;
  // Optional personal-match inputs — when present, the card renders an
  // "X% match" pill computed live from the user's localStorage profile.
  // These columns SHOULD be selected by the parent if available; missing
  // fields just downgrade the score precision, never break it.
  eligible_countries?: string[] | null;
  citizenship_requirements?: string | null;
  min_gpa?: number | null;
  gpa_scale?: number | null;
  min_ielts?: number | null;
  min_toefl?: number | null;
}

/** Activity stats — passed in by the parent if available. The card hides
 *  social-proof badges below threshold so we never show "1 tracking". */
export interface ScholarshipCardStats {
  save_count_total?: number | null;
  save_count_7d?: number | null;
  view_count_7d?: number | null;
  trending_score?: number | null;
}

interface Props {
  row: ScholarshipCardData;
  language?: "en" | "ru";
  /** Called when user clicks the share icon. If absent, share button hides. */
  onShare?: (row: ScholarshipCardData) => void;
  /** Slight stagger when rendering a list — pass the row index. */
  index?: number;
  /** Compact = used in narrow contexts (sidebars, AI results). */
  compact?: boolean;
  /** Activity & Signal stats. If a card crosses thresholds, social-proof
   *  badges render. Pass undefined to hide entirely. */
  stats?: ScholarshipCardStats;
}

// Urgency text deliberately drops the circle emojis (🔴🟡🟢⚫). The container
// pill already carries color via urgencyClass, and a single inline dot renders
// the urgency level via the dot prop on the pill — so the emoji was just visual
// noise on top of styled UI. Cleaner labels, same urgency signal.
const COPY = {
  en: {
    closesIn: (n: number) => `Closes in ${n} day${n === 1 ? "" : "s"}`,
    daysLeft: (n: number) => `${n} days left`,
    monthsLeft: (n: number) => `${n} month${n === 1 ? "" : "s"}`,
    rolling: "Rolling deadline",
    closed: "Closed",
    coverage: { full_ride: "Full ride", tuition_only: "Tuition", stipend: "Stipend", partial: "Partial", other: "Funding" },
    featured: "FEATURED",
    viewDetails: "View details",
    share: "Share",
    levels: { bachelor: "Bachelor", master: "Master", phd: "PhD", postdoc: "Postdoc" },
    tracking: (n: number) => `${n} tracking`,
    hot: "HOT",
  },
  ru: {
    closesIn: (n: number) => {
      const last = n % 10, lastTwo = n % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `Закрытие через ${n} дней`;
      if (last === 1) return `Закрытие через ${n} день`;
      if (last >= 2 && last <= 4) return `Закрытие через ${n} дня`;
      return `Закрытие через ${n} дней`;
    },
    daysLeft: (n: number) => {
      const last = n % 10, lastTwo = n % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `${n} дней осталось`;
      if (last === 1) return `${n} день остался`;
      if (last >= 2 && last <= 4) return `${n} дня осталось`;
      return `${n} дней осталось`;
    },
    monthsLeft: (n: number) => {
      const last = n % 10, lastTwo = n % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `${n} месяцев`;
      if (last === 1) return `${n} месяц`;
      if (last >= 2 && last <= 4) return `${n} месяца`;
      return `${n} месяцев`;
    },
    rolling: "Без жёсткого дедлайна",
    closed: "Закрыто",
    coverage: { full_ride: "Полное", tuition_only: "Обучение", stipend: "Стипендия", partial: "Частичное", other: "Финансирование" },
    featured: "ИЗБРАННОЕ",
    viewDetails: "Подробнее",
    share: "Поделиться",
    levels: { bachelor: "Бакалавр", master: "Магистр", phd: "PhD", postdoc: "Постдок" },
    tracking: (n: number) => {
      const last = n % 10, lastTwo = n % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `${n} студентов отслеживают`;
      if (last === 1) return `${n} студент отслеживает`;
      if (last >= 2 && last <= 4) return `${n} студента отслеживают`;
      return `${n} студентов отслеживают`;
    },
    hot: "ХИТ",
  },
} as const;

/** Initials extractor — used for the provider avatar. */
function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter((w) => /^[A-Za-zА-Яа-я]/.test(w));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Stable "hash" of the provider name → one of N HSL hues for the avatar background. */
function hueFromName(name: string | null | undefined): number {
  if (!name) return 220;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

function fmtValue(v: number | null | undefined): string | null {
  if (!v) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${v}`;
}

export function ScholarshipCard({ row: r, language = "en", onShare, index = 0, compact = false, stats }: Props) {
  const t = COPY[language];
  const featured = !!r.is_featured;
  // Social-proof thresholds: a card with 1 saver shouldn't shout. We only
  // surface "X tracking" once it crosses real critical mass. "Hot" requires
  // both recent velocity AND total — guards against single-burst noise.
  const totalSaves = stats?.save_count_total ?? 0;
  const recentSaves = stats?.save_count_7d ?? 0;
  const showTracking = totalSaves >= 5;
  const isHot = totalSaves >= 10 && recentSaves >= 3;

  // Deadline urgency
  const days = r.application_deadline
    ? Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000)
    : null;
  // Restrained urgency palette — red ONLY when truly urgent (≤7d).
  // Past that we step down to amber and finally muted, instead of
  // painting every card with a colored alarm.
  let urgencyText: string;
  let urgencyClass: string;
  if (days === null) {
    urgencyText = t.rolling;
    urgencyClass = "bg-muted/40 text-muted-foreground border-transparent";
  } else if (days <= 0) {
    urgencyText = t.closed;
    urgencyClass = "bg-muted/40 text-muted-foreground border-transparent line-through";
  } else if (days <= 7) {
    urgencyText = t.closesIn(days);
    urgencyClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40";
  } else if (days <= 30) {
    urgencyText = t.daysLeft(days);
    urgencyClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";
  } else {
    // 30+ days → no color noise, just a quiet count
    urgencyText = days <= 365 ? t.monthsLeft(Math.round(days / 30)) : t.monthsLeft(Math.round(days / 30));
    urgencyClass = "bg-muted/30 text-muted-foreground border-transparent";
  }

  // Funding presentation rules:
  //   - If we have a numeric USD value, prefer the formatted dollar amount
  //     ($35K, $1.2M) as the BIG headline. Concise, scannable, premium.
  //   - If we don't have a number but DO have short award_amount_text
  //     (≤24 chars, e.g. "Full tuition + $35K"), use it as the headline.
  //   - If award_amount_text is long-form prose ("Partial scholarships,
  //     significant reduction in fees, $100M+ awarded to 80,000 students"),
  //     never put it in the headline — fall back to the coverage label as
  //     the headline ("Partial funding") and surface the prose as a single
  //     muted line below.
  const fmtUsd = fmtValue(r.estimated_total_value_usd);
  const shortAward = r.award_amount_text && r.award_amount_text.length <= 24
    ? r.award_amount_text
    : null;
  const longAwardText = r.award_amount_text && r.award_amount_text.length > 24
    ? r.award_amount_text
    : null;
  const coverageLabel = (t.coverage as Record<string, string>)[r.coverage_type] ?? t.coverage.other;
  const headlineValue: string | null = fmtUsd ?? shortAward ?? coverageLabel;
  const showSubtitle = !!fmtUsd || !!shortAward; // when we have a real value, show "· coverage" beside it
  const hue = hueFromName(r.provider_name || r.scholarship_name);

  // Tags row — country + level + field. Coverage is omitted here on
  // purpose: it's already shown above as the subtitle to the funding
  // amount, and seeing "Full ride" twice on the same card looks noisy.
  const tags: { icon: React.ReactNode; label: string; tone?: "primary" | "muted" }[] = [];
  if (r.host_country) tags.push({ icon: <MapPin className="w-3 h-3" />, label: r.host_country });
  if (r.target_degree_level && r.target_degree_level.length > 0) {
    const levels = r.target_degree_level.slice(0, 2).map((l) => (t.levels as Record<string, string>)[l.toLowerCase()] ?? l);
    tags.push({ icon: <GraduationCap className="w-3 h-3" />, label: levels.join(" · ") });
  }
  if (r.target_fields && r.target_fields.length > 0 && r.target_fields[0].toLowerCase() !== "any") {
    tags.push({ label: r.target_fields[0], icon: null as unknown as React.ReactNode });
  }

  const detailPath = `/scholarships/${r.scholarship_id}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={`group relative bg-card rounded-xl ${compact ? "p-3.5" : "p-4 sm:p-5"} transition-all duration-200
        border ${featured ? "border-gold/45 shadow-[0_2px_18px_-8px_hsl(var(--gold)/0.45)]" : "border-border hover:border-foreground/20"}
        hover:shadow-md`}
    >
      {/* Featured / Hot ribbon — Hot wins if both apply (more rare, more
          interesting signal). Hot uses a flame gradient distinct from the
          gold Featured ribbon so the two states are visually different. */}
      {isHot ? (
        <div className="absolute -top-2.5 right-5 inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full shadow-sm">
          <Flame className="w-3 h-3" />
          {t.hot}
        </div>
      ) : featured && (
        <div className="absolute -top-2.5 right-5 inline-flex items-center gap-1 bg-gradient-to-r from-gold-dark to-gold text-primary text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full shadow-sm">
          <Crown className="w-3 h-3" />
          {t.featured}
        </div>
      )}

      {/* Top row: avatar + headline + share */}
      <div className="flex items-start gap-2.5 mb-3">
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-heading font-bold text-[11px] text-white tracking-tight shadow-sm ring-1 ring-black/5"
          style={{ background: `linear-gradient(135deg, hsl(${hue}, 55%, 45%), hsl(${(hue + 35) % 360}, 60%, 38%))` }}
          aria-label={r.provider_name || ""}
        >
          {initials(r.provider_name || r.scholarship_name)}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={detailPath} className="block">
            <h3 className={`font-heading font-bold text-foreground tracking-tight leading-snug group-hover:text-gold-dark transition-colors line-clamp-2 ${compact ? "text-sm" : "text-[15px] sm:text-base"}`}>
              {r.scholarship_name}
            </h3>
          </Link>
          {r.provider_name && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.provider_name}</p>
          )}
        </div>
        {onShare && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShare(r); }}
            className="shrink-0 -mt-1 -mr-1 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={t.share}
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Funding amount — prominent, but never overgrown when the source data
          is a long descriptive paragraph. Two visual rules:
            • Headline always fits on one line. If the value comes from
              short award_amount_text (≤24 chars) it sits at xl; otherwise
              the formatted USD or coverage label sits at 2xl.
            • Long descriptive award text gets its own muted line below. */}
      {headlineValue && (
        <div className="mb-3 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <Award className="w-4 h-4 text-gold-dark shrink-0" />
            <span className="font-heading font-bold text-xl sm:text-2xl tabular-nums text-foreground tracking-tight leading-none truncate">
              {headlineValue}
            </span>
            {showSubtitle && (
              <span className="text-xs text-muted-foreground truncate">· {coverageLabel}</span>
            )}
          </div>
          {longAwardText && (
            <p className="text-[11px] text-muted-foreground/80 leading-snug mt-1.5 line-clamp-2">
              {longAwardText}
            </p>
          )}
        </div>
      )}

      {/* Why-this-fits (if available) */}
      {r.why_this_fits && !compact && (
        <p className="text-sm text-foreground/80 leading-relaxed mb-3 line-clamp-2">
          {r.why_this_fits}
        </p>
      )}

      {/* Deadline pill + optional social proof on the right */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={`text-[10px] font-bold tracking-[0.12em] ${urgencyClass}`}>
          <Calendar className="w-3 h-3 mr-1" />
          {urgencyText}
        </Badge>
        {showTracking && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums" title="Students tracking this scholarship in their pipeline">
            <Users className="w-3 h-3" />
            {t.tracking(totalSaves)}
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.slice(0, 5).map((tag, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border
              ${tag.tone === "primary"
                ? "bg-gold/10 text-gold-dark border-gold/30"
                : "bg-muted/40 text-muted-foreground border-border"}`}
          >
            {tag.icon}
            {tag.label}
          </span>
        ))}
      </div>

      {/* CTA */}
      <Link to={detailPath} className="block">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between group-hover:border-gold/50 group-hover:bg-gold/5 group-hover:text-foreground transition-colors"
        >
          {t.viewDetails}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </Link>
    </motion.article>
  );
}

/** Skeleton variant — used while listing data is loading. */
export function ScholarshipCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      className="bg-card rounded-2xl p-5 sm:p-6 border border-border"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted/60 rounded animate-pulse w-1/2" />
        </div>
      </div>
      <div className="h-7 bg-muted rounded animate-pulse w-1/3 mb-3" />
      <div className="h-5 bg-muted/60 rounded-full animate-pulse w-2/5 mb-4" />
      <div className="flex gap-1.5 mb-4">
        <div className="h-5 bg-muted/60 rounded animate-pulse w-16" />
        <div className="h-5 bg-muted/60 rounded animate-pulse w-20" />
        <div className="h-5 bg-muted/60 rounded animate-pulse w-14" />
      </div>
      <div className="h-9 bg-muted/40 rounded-md animate-pulse" />
    </motion.div>
  );
}
