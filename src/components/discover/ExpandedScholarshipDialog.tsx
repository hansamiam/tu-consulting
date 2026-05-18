/* ExpandedScholarshipDialog — right-side slide-in detail surface
 * (a "quick-draw panel"). Used to be a centered Dialog; 2026-05-18
 * the product moved to a bulletin/dashboard reframe and the user
 * specifically asked for the side-panel layout back, but with a
 * polished visual format — wider than the old narrow strip, single
 * gold accent, breathable typography, no chaotic multi-colored
 * kickers.
 *
 * Slides in from the right at max-w-[640px] on desktop / full width
 * on mobile. Background scroll locked while open. The whole panel
 * scrolls internally; the hero strip pins to the top so the action
 * row stays reachable as the user scrolls the AI deep dive below. */
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  X,
  Wallet,
  Calendar,
  GraduationCap,
  Globe,
} from "lucide-react";
import { ScholarshipDeepDive } from "@/components/scholarship/ScholarshipDeepDive";
import {
  cleanScholarshipName, cleanProvider, compactAward, humanizeDegreeLabel,
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
  /* Optional program-specific cover image (renders as hero band when
   * present; country gradient + landmark silhouette is the fallback). */
  cover_image_url?: string | null;
  /* When the row first landed in our catalogue. Drives the NEW pill
   * surfaced in the dialog hero — same 7-day window as cards/sheet. */
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

const COVERAGE_LABEL: Record<string, { en: string; ru: string }> = {
  full_ride:    { en: "Full ride",       ru: "Полное" },
  tuition_only: { en: "Tuition only",    ru: "Только обучение" },
  stipend:      { en: "Stipend",         ru: "Стипендия" },
  partial:      { en: "Partial funding", ru: "Частичное" },
};

export const ExpandedScholarshipDialog = ({ s, profile, onClose, onApply, onSave, isBookmarked, lang = "en" }: Props) => {
  if (!s) return null;
  const ru = lang === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const cleanedName = cleanScholarshipName(s.scholarship_name);
  const cleanedProv = cleanProvider(s.provider_name);
  const country = s.host_country ? shortCountry(s.host_country) : null;
  const coverageLabel = COVERAGE_LABEL[s.coverage_type];
  const award = compactAward(s) ?? (coverageLabel ? coverageLabel[ru ? "ru" : "en"] : null);
  const dl = fmtDays(s.application_deadline, lang);
  const accent = s.host_country ? accentForCountry(s.host_country) : "from-foreground/40 to-foreground/60";

  return (
    <Sheet open={!!s} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] p-0 overflow-hidden gap-0 [&>button]:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Hero strip — 2026-05-10 cleaned up per user direction
              "really really clean up this section". Pre-fix the hero
              was a heavy region-coloured gradient with white text +
              dark overlays, which combined with the cover image made
              for a loud magenta/purple/cyan band. Now: cream canvas-
              soft surface, faint silhouette engraving on the right,
              foreground typography, gold-dark eyebrow + foreground H.
              Matches the minimal cream treatment we landed on for
              Discover cards. Cover images still surface inside the
              detail Sheet (which is the better place for them). */}
          <div className="relative bg-canvas-soft border-b border-gold/15 overflow-hidden">
            <CountryArt country={s.host_country} className="absolute right-6 top-1/2 -translate-y-1/2 h-16 w-32 opacity-[0.10] text-foreground pointer-events-none" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-foreground/[0.06] hover:bg-foreground/[0.12] text-foreground/70 hover:text-foreground transition-colors"
              aria-label={t("Close", "Закрыть")}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative px-6 sm:px-9 py-6 sm:py-7 pr-14 sm:pr-16">
              <div className="flex items-center gap-2 mb-2">
                {country && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
                    {t("Scholarship", "Стипендия")} · {country}
                  </p>
                )}
                {s.created_at && Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-1 ring-emerald-500/30 px-1.5 py-0.5 rounded">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {ru ? "Новое" : "New"}
                  </span>
                )}
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-tight mb-1.5 max-w-3xl text-foreground">
                {cleanedName}
              </h2>
              {cleanedProv && (
                <p
                  className="text-sm text-muted-foreground mb-4 leading-snug"
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
                  className="gap-1.5"
                >
                  {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {isBookmarked ? t("Saved", "Сохранено") : t("Save", "Сохранить")}
                </Button>
              </div>
            </div>
          </div>

          {/* Headline facts row. 2-up in the side sheet — 4-up at the
              prior centered-dialog width was readable, but at 640px
              column width the value strings ("£20,400/year stipend +
              travel + visa…") were truncating mid-word. 2-up gives
              each fact ~280px of horizontal room. */}
          <div className="grid grid-cols-2 gap-0 border-b border-border bg-card">
            <Fact icon={<Wallet className="h-3.5 w-3.5" />} label={t("Award", "Финансирование")} value={award ?? "—"} />
            <Fact
              icon={<Calendar className="h-3.5 w-3.5" />}
              label={t("Deadline", "Дедлайн")}
              value={dl.text}
              tone={dl.tone}
            />
            <Fact
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              label={t("Levels", "Уровни")}
              value={(s.target_degree_level ?? []).map(humanizeDegreeLabel).join(", ") || t("Any", "Любой")}
            />
            <Fact
              icon={<Globe className="h-3.5 w-3.5" />}
              label={t("Citizenship", "Гражданство")}
              value={s.citizenship_requirements || t("Open", "Открыто всем")}
            />
          </div>

          {/* Scrollable body — ScholarshipDeepDive carries the personalised
              analysis (match breakdown, how-to-win, ideal-candidate
              profile). That's the substantive content that didn't fit
              cleanly in the right side panel. The kicker here used to
              wear a Award icon, but the round-24 audit retired it —
              "Personalized for you" carries enough meaning on its own
              and the deep-dive content below has its own AI affordances. */}
          <div className="overflow-y-auto flex-1 px-6 sm:px-9 py-5 sm:py-6 space-y-5">
            <div>
              {/* Doubled-up heading retired 2026-05-10 — "PERSONALIZED FOR
                  YOU" eyebrow + "Your fit, your odds, your move" was
                  reading as marketing chrome. Single editorial line
                  carries the section instead. */}
              <h3 className="font-heading text-lg font-bold tracking-tight text-foreground mb-4">
                {t("Personalised for you", "Персонально для вас")}
              </h3>
              <ScholarshipDeepDive
                scholarshipId={s.scholarship_id}
                profile={{
                  fullName: undefined,
                  nationality: profile.country,
                  major: profile.field,
                  field: profile.field,
                  gradeLevel: profile.degrees?.[0] || "",
                  targetCountries: s.host_country ? [s.host_country] : undefined,
                  gpa: profile.gpa,
                  gpaScale: profile.gpaScale,
                  ielts: profile.ielts,
                  toefl: profile.toefl,
                  sat: profile.sat,
                }}
              />
            </div>
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
    <div className="px-5 py-3.5 border-r border-border [&:nth-child(2n)]:border-r-0 [&:nth-child(n+3)]:border-t min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">{label}</span>
      </div>
      {/* Wrap up to 2 lines for fit values that are slightly too long
          for one line ("Outstanding applicants from developing
          countries"). Hard-truncate at 2 lines so the row stays a
          fixed height. */}
      <p className={`text-sm leading-tight ${valueCls}`} style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } as React.CSSProperties}>
        {value}
      </p>
    </div>
  );
};
