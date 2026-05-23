/* ExpandedScholarshipDialog — right-side slide-in detail surface
 * (a "quick-draw panel"). 2026-05-18 final: restored the heavy
 * country-gradient hero + full-bleed CountryArt silhouette the user
 * explicitly asked back for. Wrapped in <Sheet> (right-side) rather
 * than the older centered <Dialog>.
 *
 * Slides in from the right at max-w-[640px] on desktop / full width
 * on mobile. Background scroll locked while open. The whole panel
 * scrolls internally; the hero strip pins to the top so the action
 * row stays reachable as the user scrolls the AI deep dive below. */
import { useMemo } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  X,
  Calendar,
  GraduationCap,
  Globe,
} from "lucide-react";
import { ScholarshipDeepDive } from "@/components/scholarship/ScholarshipDeepDive";
import { AcademyHookCta } from "@/components/discover/AcademyHookCta";
import {
  cleanScholarshipName, cleanProvider, humanizeDegreeLabel,
} from "@/lib/scholarshipFields";
import { shortCountry, accentForCountry } from "@/lib/countryAccent";
import { CountryArt } from "@/lib/countryArt";

interface ScholarshipLite {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  deadline_type: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  citizenship_requirements: string | null;
  official_url: string | null;
  duration_text?: string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
}

interface ProfileLite {
  country: string;
  field: string;
  degrees: string[];
  gpa: string;
  gpaScale: string;
  ielts: string;
  toefl: string;
  sat: string;
}

type Lang = "en" | "ru";

interface Props {
  s: ScholarshipLite | null;
  profile: ProfileLite;
  onClose: () => void;
  onApply: () => void;
  onSave: () => void;
  isBookmarked: boolean;
  lang?: Lang;
}

const fmtDays = (d: string | null, lang: Lang): { text: string; tone: "danger" | "warn" | "neutral" } => {
  const ru = lang === "ru";
  if (!d) return { text: ru ? "Без дедлайна" : "Rolling deadline", tone: "neutral" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { text: ru ? "Закрыто" : "Closed", tone: "neutral" };
  if (days === 0) return { text: ru ? "Закрывается сегодня" : "Closes today", tone: "danger" };
  if (days <= 7)  return { text: ru ? `${days} дн осталось` : `${days} days left`, tone: "danger" };
  if (days <= 30) return { text: ru ? `${days} дн осталось` : `${days} days left`, tone: "warn" };
  return { text: ru ? `${d} · ${days} дн` : `${d} · ${days} days`, tone: "neutral" };
};

export const ExpandedScholarshipDialog = ({ s, profile, onClose, onApply, onSave, isBookmarked, lang = "en" }: Props) => {
  // Stable deep-dive profile (memo'd to prevent re-firing the LLM call
  // on every Discover re-render — was a perf bug earlier today).
  const deepDiveProfile = useMemo(() => ({
    fullName: undefined,
    nationality: profile.country,
    major: profile.field,
    field: profile.field,
    gradeLevel: profile.degrees?.[0] || "",
    targetCountries: s?.host_country ? [s.host_country] : undefined,
    gpa: profile.gpa,
    gpaScale: profile.gpaScale,
    ielts: profile.ielts,
    toefl: profile.toefl,
    sat: profile.sat,
  }), [
    profile.country, profile.field, profile.degrees, s?.host_country,
    profile.gpa, profile.gpaScale, profile.ielts, profile.toefl, profile.sat,
  ]);

  if (!s) return null;
  const ru = lang === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const cleanedName = cleanScholarshipName(s.scholarship_name);
  const cleanedProv = cleanProvider(s.provider_name);
  const country = s.host_country ? shortCountry(s.host_country) : null;
  const dl = fmtDays(s.application_deadline, lang);
  const accent = s.host_country ? accentForCountry(s.host_country) : "from-foreground/40 to-foreground/60";

  return (
    <Sheet open={!!s} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] p-0 overflow-hidden gap-0 [&>button]:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Hero strip — heavy country gradient + full-bleed CountryArt
              silhouette + black overlay + white text. User wants this
              dramatic country-identity treatment back (the cream
              "cleaned up" version was too thin). */}
          <div className={`relative bg-gradient-to-br ${accent} text-white overflow-hidden`}>
            {s.cover_image_url ? (
              <img
                src={s.cover_image_url}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <CountryArt country={s.host_country} className="absolute inset-0 h-full w-full opacity-20 text-white" />
            )}
            <span className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/55" aria-hidden />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur transition-colors"
              aria-label={t("Close", "Закрыть")}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative px-6 sm:px-9 py-7 sm:py-9">
              <div className="flex items-center gap-2 mb-2.5">
                {country && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
                    {t("Scholarship", "Стипендия")} · {country}
                  </p>
                )}
                {s.created_at && Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-100 bg-emerald-600/40 ring-1 ring-emerald-300/40 px-1.5 py-0.5 rounded">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    {ru ? "Новое" : "New"}
                  </span>
                )}
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-tight mb-2 max-w-3xl">
                {cleanedName}
              </h2>
              {cleanedProv && (
                <p
                  className="text-sm sm:text-base text-white/90 mb-5 leading-snug"
                  style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } as React.CSSProperties}
                >
                  {cleanedProv}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="gold" size="sm" onClick={onApply} disabled={!s.official_url} className="gap-1.5">
                  {t("Apply on official site", "Подать на официальном сайте")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={onSave}
                  className="gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {isBookmarked ? t("Saved", "Сохранено") : t("Save", "Сохранить")}
                </Button>
              </div>
            </div>
          </div>

          {/* 2026-05-19: simple bold-label list. Previous design was a
              3-up grid of boxes; "Citizenship" + long values got
              truncated and the square chrome read as heavy. Switched
              to inline label-value pairs — easier to scan and never
              clips text. */}
          <div className="px-6 sm:px-9 py-4 border-b border-border bg-card space-y-1.5">
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{t("Deadline", "Дедлайн")}:</span>{" "}
              <span className={
                dl.tone === "danger" ? "text-destructive font-semibold"
                : dl.tone === "warn" ? "text-amber-700 dark:text-amber-400 font-medium"
                : "text-foreground/85"
              }>{dl.text}</span>
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{t("Levels", "Уровни")}:</span>{" "}
              <span className="text-foreground/85">
                {(s.target_degree_level ?? []).map(humanizeDegreeLabel).join(", ") || t("Any", "Любой")}
              </span>
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{t("Citizenship", "Гражданство")}:</span>{" "}
              <span className="text-foreground/85">
                {s.citizenship_requirements || t("Open", "Открыто всем")}
              </span>
            </p>
          </div>

          {/* Scrollable body — ScholarshipDeepDive carries the personalised
              analysis (match breakdown, how-to-win, ideal-candidate). */}
          <div className="overflow-y-auto flex-1 px-6 sm:px-9 py-5 sm:py-6 space-y-5">
            <div>
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground mb-4">
                {t("Personalised for you", "Персонально для вас")}
              </h3>
              <ScholarshipDeepDive
                scholarshipId={s.scholarship_id}
                profile={deepDiveProfile}
              />
            </div>
            {/* F12 stitch — Academy upsell below the deep-dive analysis.
                Soft "want help winning this?" pointer to the strategy
                brief wizard. Doesn't require Academy infra to ship — it
                nudges to /topuni-ai which is live today. */}
            <AcademyHookCta variant="detail_sheet" lang={lang} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Fact = ({
  icon, label, value, tone = "neutral",
}: {
  icon: React.ReactNode; label: string; value: string;
  tone?: "neutral" | "warn" | "danger";
}) => {
  const valueCls =
    tone === "danger" ? "text-destructive font-semibold"
    : tone === "warn" ? "text-amber-700 dark:text-amber-400 font-medium"
    : "text-foreground";
  return (
    <div className="px-5 py-3.5 border-r border-border last:border-r-0 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">{label}</span>
      </div>
      <p className={`text-sm leading-tight ${valueCls}`} style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } as React.CSSProperties}>
        {value}
      </p>
    </div>
  );
};
