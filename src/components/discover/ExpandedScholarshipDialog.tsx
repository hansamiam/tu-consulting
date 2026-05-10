/* ExpandedScholarshipDialog — centered, enlarged detail surface that
 * opens from the right-side DetailSheet's "Personalized strategy" CTA.
 *
 * Why this exists: the right-side pull-up DetailSheet had grown to
 * include the full personalized deep dive (match breakdown, odds,
 * how-to-win, ideal-candidate), which made the panel stretch
 * vertically with text that cut off, wrapped weirdly, and felt dense.
 * The split:
 *
 *   · Right-side DetailSheet  → CONCISE, focused on "is this for me?"
 *     — overview + requirements + strategy notes only.
 *   · This dialog            → ENLARGED, centered, with the full deep
 *     dive AI analysis laid out with breathing room.
 *
 * Replaces what used to be a Link to /scholarships/:id (which yanked
 * users out of the Discover flow entirely). The /scholarships/:id
 * page still exists for SEO / direct shares; this dialog is the
 * in-app surface. */
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  duration_text: string | null;
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
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden gap-0 [&>button]:hidden">
        <div className="flex flex-col max-h-[92vh]">
          {/* Hero strip — country gradient, name, provider, headline facts.
              When cover_image_url is enriched in we use it as the hero
              backdrop (program-specific poster / campus photo) and keep
              the country gradient as a fallback when the image fails
              to load. */}
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
              <CountryArt country={s.host_country} className="absolute inset-0 h-full w-full opacity-15 text-white" />
            )}
            <span className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-black/40" aria-hidden />
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
                {/* NEW pill — consistent across cards / sheet header /
                    dialog so the freshness signal travels with the row. */}
                {s.created_at && Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-100 bg-emerald-500/25 ring-1 ring-emerald-300/40 px-1.5 py-0.5 rounded">
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

          {/* Headline facts row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-border bg-card">
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
          <div className="overflow-y-auto flex-1 px-6 sm:px-9 py-6 sm:py-8 space-y-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark dark:text-gold mb-2">
                {t("Personalized for you", "Персонально для вас")}
              </p>
              <h3 className="font-heading text-xl font-bold tracking-tight text-foreground mb-4">
                {t("Your fit, your odds, your move", "Ваше совпадение, ваши шансы, ваш следующий шаг")}
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
      </DialogContent>
    </Dialog>
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
    <div className="px-5 py-3.5 border-r border-border last:border-r-0 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(4n)]:border-r-0 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0 min-w-0">
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
