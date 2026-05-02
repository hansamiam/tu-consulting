import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award, Calendar, GraduationCap, MapPin, Crown, ArrowRight, Share2,
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
}

const COPY = {
  en: {
    closesIn: (n: number) => `🔴 CLOSES IN ${n} DAY${n === 1 ? "" : "S"}`,
    daysLeft: (n: number) => `🟡 ${n} DAYS LEFT`,
    monthsLeft: (n: number) => `🟢 ${n} MONTH${n === 1 ? "" : "S"}`,
    rolling: "🟢 ROLLING DEADLINE",
    closed: "⚫ CLOSED",
    coverage: { full_ride: "Full ride", tuition_only: "Tuition", stipend: "Stipend", partial: "Partial", other: "Funding" },
    featured: "FEATURED",
    viewDetails: "View details",
    share: "Share",
    levels: { bachelor: "Bachelor", master: "Master", phd: "PhD", postdoc: "Postdoc" },
  },
  ru: {
    closesIn: (n: number) => {
      const last = n % 10, lastTwo = n % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `🔴 ЗАКРЫТИЕ ЧЕРЕЗ ${n} ДНЕЙ`;
      if (last === 1) return `🔴 ЗАКРЫТИЕ ЧЕРЕЗ ${n} ДЕНЬ`;
      if (last >= 2 && last <= 4) return `🔴 ЗАКРЫТИЕ ЧЕРЕЗ ${n} ДНЯ`;
      return `🔴 ЗАКРЫТИЕ ЧЕРЕЗ ${n} ДНЕЙ`;
    },
    daysLeft: (n: number) => {
      const last = n % 10, lastTwo = n % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `🟡 ${n} ДНЕЙ ОСТАЛОСЬ`;
      if (last === 1) return `🟡 ${n} ДЕНЬ ОСТАЛСЯ`;
      if (last >= 2 && last <= 4) return `🟡 ${n} ДНЯ ОСТАЛОСЬ`;
      return `🟡 ${n} ДНЕЙ ОСТАЛОСЬ`;
    },
    monthsLeft: (n: number) => {
      const last = n % 10, lastTwo = n % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `🟢 ${n} МЕСЯЦЕВ`;
      if (last === 1) return `🟢 ${n} МЕСЯЦ`;
      if (last >= 2 && last <= 4) return `🟢 ${n} МЕСЯЦА`;
      return `🟢 ${n} МЕСЯЦЕВ`;
    },
    rolling: "🟢 БЕЗ ЖЁСТКОГО ДЕДЛАЙНА",
    closed: "⚫ ЗАКРЫТО",
    coverage: { full_ride: "Полное", tuition_only: "Обучение", stipend: "Стипендия", partial: "Частичное", other: "Финансирование" },
    featured: "ИЗБРАННОЕ",
    viewDetails: "Подробнее",
    share: "Поделиться",
    levels: { bachelor: "Бакалавр", master: "Магистр", phd: "PhD", postdoc: "Постдок" },
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

export function ScholarshipCard({ row: r, language = "en", onShare, index = 0, compact = false }: Props) {
  const t = COPY[language];
  const featured = !!r.is_featured;

  // Deadline urgency
  const days = r.application_deadline
    ? Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000)
    : null;
  let urgencyText: string;
  let urgencyClass: string;
  if (days === null) {
    urgencyText = r.application_deadline ? t.rolling : t.rolling;
    urgencyClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
  } else if (days <= 0) {
    urgencyText = t.closed;
    urgencyClass = "bg-muted text-muted-foreground border-border";
  } else if (days <= 14) {
    urgencyText = t.closesIn(days);
    urgencyClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40";
  } else if (days <= 30) {
    urgencyText = t.daysLeft(days);
    urgencyClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";
  } else if (days <= 365) {
    urgencyText = t.monthsLeft(Math.round(days / 30));
    urgencyClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
  } else {
    urgencyText = t.monthsLeft(Math.round(days / 30));
    urgencyClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  const valueText = r.award_amount_text || fmtValue(r.estimated_total_value_usd);
  const coverageLabel = (t.coverage as Record<string, string>)[r.coverage_type] ?? t.coverage.other;
  const hue = hueFromName(r.provider_name || r.scholarship_name);

  // Build 3-5 tags
  const tags: { icon: React.ReactNode; label: string; tone?: "primary" | "muted" }[] = [];
  if (r.host_country) tags.push({ icon: <MapPin className="w-3 h-3" />, label: r.host_country });
  if (r.target_degree_level && r.target_degree_level.length > 0) {
    const levels = r.target_degree_level.slice(0, 2).map((l) => (t.levels as Record<string, string>)[l.toLowerCase()] ?? l);
    tags.push({ icon: <GraduationCap className="w-3 h-3" />, label: levels.join(" · ") });
  }
  if (r.target_fields && r.target_fields.length > 0 && r.target_fields[0].toLowerCase() !== "any") {
    tags.push({ label: r.target_fields[0], icon: null as unknown as React.ReactNode });
  }
  if (coverageLabel) tags.push({ icon: <Award className="w-3 h-3" />, label: coverageLabel, tone: "primary" });

  const detailPath = `/scholarships/${r.scholarship_id}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={`group relative bg-card rounded-2xl ${compact ? "p-4" : "p-5 sm:p-6"} transition-all duration-200
        border ${featured ? "border-gold/45 shadow-[0_2px_18px_-8px_hsl(var(--gold)/0.45)]" : "border-border hover:border-foreground/20"}
        hover:shadow-md`}
    >
      {/* Featured ribbon */}
      {featured && (
        <div className="absolute -top-2.5 right-5 inline-flex items-center gap-1 bg-gradient-to-r from-gold-dark to-gold text-primary text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full shadow-sm">
          <Crown className="w-3 h-3" />
          {t.featured}
        </div>
      )}

      {/* Top row: avatar + headline + share */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-heading font-bold text-sm text-white tracking-tight shadow-sm ring-1 ring-black/5"
          style={{ background: `linear-gradient(135deg, hsl(${hue}, 55%, 45%), hsl(${(hue + 35) % 360}, 60%, 38%))` }}
          aria-label={r.provider_name || ""}
        >
          {initials(r.provider_name || r.scholarship_name)}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={detailPath} className="block">
            <h3 className={`font-heading font-bold text-foreground tracking-tight leading-snug group-hover:text-gold-dark transition-colors ${compact ? "text-base" : "text-lg sm:text-xl"}`}>
              {r.scholarship_name}
            </h3>
          </Link>
          {r.provider_name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.provider_name}</p>
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

      {/* Funding amount — prominent */}
      {valueText && (
        <div className="flex items-baseline gap-2 mb-3">
          <Award className="w-4 h-4 text-gold-dark" />
          <span className="font-heading font-bold text-2xl tabular-nums text-foreground tracking-tight leading-none">
            {valueText}
          </span>
          <span className="text-xs text-muted-foreground">{coverageLabel}</span>
        </div>
      )}

      {/* Why-this-fits (if available) */}
      {r.why_this_fits && !compact && (
        <p className="text-sm text-foreground/80 leading-relaxed mb-3 line-clamp-2">
          {r.why_this_fits}
        </p>
      )}

      {/* Deadline pill */}
      <div className="mb-4">
        <Badge variant="outline" className={`text-[10px] font-bold tracking-[0.12em] ${urgencyClass}`}>
          <Calendar className="w-3 h-3 mr-1" />
          {urgencyText}
        </Badge>
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
