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
// useMemo dropped 2026-05-25 — only consumer was deepDiveProfile,
// retired with the ScholarshipMiniGuide swap.
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
// 2026-05-25: swapped from ScholarshipDeepDive (per-profile, Gemini-Flash
// per call) to ScholarshipMiniGuide (static, pre-generated per scholarship,
// no API per view). Deep-dive function + component stay in tree for the
// future per-profile feature revival — see
// project_topuni_deep_dive_decisions_2026_05_25.md.
import { ScholarshipMiniGuide } from "@/components/scholarship/ScholarshipMiniGuide";
import { AcademyHookCta } from "@/components/discover/AcademyHookCta";
import {
  cleanScholarshipName, cleanProvider, humanizeDegreeLabel,
} from "@/lib/scholarshipFields";
import { shortCountry, accentForCountry } from "@/lib/countryAccent";
import { CountryArt } from "@/lib/countryArt";
import { useEffect, useState } from "react";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { EditModeToggle } from "@/components/admin/EditModeToggle";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useScholarshipEdit } from "@/components/admin/useScholarshipEdit";
import { AdminMetadataPanel } from "@/components/admin/AdminMetadataPanel";

interface ScholarshipLite {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  early_deadline?: string | null;
  early_decision_type?: string | null;
  deadline_type: string | null;
  is_deadline_inferred?: boolean | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  citizenship_requirements: string | null;
  eligible_countries: string[] | null;
  /* 2026-05-27: data-quality flag for the eligible_countries column.
   * Used to gate the red "not for your nationality" banner — we only
   * confidently warn when audit_status='verified', otherwise the data
   * could be wrong in either direction. */
  eligibility_audit_status?: "unverified" | "verified" | "suspicious" | "broken" | null;
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

const MONTH_LONG_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_LONG_RU = ["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"];

// Citizenship line: prefer the structured eligible_countries array
// (source of truth) over citizenship_requirements (freetext summary that
// often degrades to placeholders like "Hold the nationality of a country
// appearing in the specified list" when the LLM extractor didn't follow
// the source's country-list link). 96/98 published rows have a real
// eligible_countries array as of 2026-05-27.
const OPEN_TO_ALL_MARKERS = ["any", "all", "open", "worldwide", "international"];
function renderCitizenship(
  countries: string[] | null,
  summary: string | null,
  t: (en: string, ru: string) => string,
): string {
  const list = (countries ?? []).map(c => (c ?? "").trim()).filter(Boolean);
  if (list.length === 1 && OPEN_TO_ALL_MARKERS.includes(list[0].toLowerCase())) {
    return t("Open to all nationalities", "Открыто для всех национальностей");
  }
  if (list.length > 0) return list.join(", ");
  return summary || t("Open", "Открыто всем");
}

const fmtDays = (d: string | null, lang: Lang, isInferred?: boolean | null): { text: string; tone: "danger" | "warn" | "neutral" } => {
  const ru = lang === "ru";
  if (!d) return { text: ru ? "Без дедлайна" : "Rolling deadline", tone: "neutral" };
  // 2026-05-27 (pm): inferred annual cycle. Show "TBD (typically [Month])"
  // — month only, NO year. Annual programs reopen on the same month each
  // year, so the year decoration was implying false precision and the
  // word "typically" plus a year felt contradictory.
  if (isInferred) {
    const dt = new Date(d);
    const month = (ru ? MONTH_LONG_RU : MONTH_LONG_EN)[dt.getMonth()] ?? "";
    return {
      text: ru ? `TBD (обычно в ${month})` : `TBD (typically ${month})`,
      tone: "neutral",
    };
  }
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { text: ru ? "Закрыто" : "Closed", tone: "neutral" };
  if (days === 0) return { text: ru ? "Закрывается сегодня" : "Closes today", tone: "danger" };
  if (days <= 7)  return { text: ru ? `${days} дн осталось` : `${days} days left`, tone: "danger" };
  if (days <= 30) return { text: ru ? `${days} дн осталось` : `${days} days left`, tone: "warn" };
  return { text: ru ? `${d} · ${days} дн` : `${d} · ${days} days`, tone: "neutral" };
};

export const ExpandedScholarshipDialog = (props: Props) => {
  return (
    <EditModeProvider>
      <DialogBody {...props} />
    </EditModeProvider>
  );
};

const DialogBody = ({ s: sProp, profile, onClose, onApply, onSave, isBookmarked, lang = "en" }: Props) => {
  // 2026-05-27: admin inline-edit holds optimistic local state so changes
  // appear in the dialog immediately. The parent (Discover) will refetch
  // its catalog on next reload — so the local override is per-open-session.
  const [s, setS] = useState(sProp);
  useEffect(() => { setS(sProp); }, [sProp?.scholarship_id, sProp]);
  const { saving: savingEdit, saveScholarshipField } = useScholarshipEdit(s?.scholarship_id ?? "");
  const editField = (field: string, before: unknown) => async (next: string | string[] | null): Promise<boolean> => {
    if (!s) return false;
    const ok = await saveScholarshipField(field, before, next);
    if (ok) setS({ ...s, [field]: next } as ScholarshipLite);
    return ok;
  };

  if (!s) return null;
  const ru = lang === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const cleanedName = cleanScholarshipName(s.scholarship_name);
  const cleanedProv = cleanProvider(s.provider_name);
  const country = s.host_country ? shortCountry(s.host_country) : null;
  const dl = fmtDays(s.application_deadline, lang, s.is_deadline_inferred);
  // 2026-05-26: US undergrad rows carry a second early-round deadline
  // (REA/EA/ED/SCEA — type lives in early_decision_type). When present,
  // surface it alongside the regular deadline so students see both rather
  // than only the RD date.
  const earlyDl = s.early_deadline ? fmtDays(s.early_deadline, lang) : null;
  const earlyTypeLabel = ((): string | null => {
    const k = (s.early_decision_type || "").toUpperCase();
    if (!k || !earlyDl) return null;
    if (k === "ED" || k === "ED_I") return t("Early Decision", "Early Decision");
    if (k === "ED_II") return t("Early Decision II", "Early Decision II");
    if (k === "EA") return t("Early Action", "Early Action");
    if (k === "REA") return t("Restrictive Early Action", "Restrictive Early Action");
    if (k === "SCEA") return t("Single Choice Early Action", "Single Choice Early Action");
    if (k === "PRIORITY") return t("Priority", "Priority");
    return k;
  })();
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
            {/* Two-layer scrim — a flat dark base sits under a vertical
                gradient. The base (black/35) guarantees minimum
                contrast against bright cover images (light skies,
                pale campus shots) where the prior gradient's mid-band
                (15%) let bright pixels bleed through and clobber the
                white headline. The vertical gradient still concentrates
                shading at the top (eyebrow) and bottom (CTAs). */}
            <span className="absolute inset-0 bg-black/35" aria-hidden />
            <span className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" aria-hidden />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur transition-colors"
              aria-label={t("Close", "Закрыть")}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative px-6 sm:px-9 py-5 sm:py-6">
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
                <InlineEdit field="scholarship_name" variant="text" value={s.scholarship_name} onSave={editField("scholarship_name", s.scholarship_name)} saving={savingEdit}>
                  {cleanedName}
                </InlineEdit>
              </h2>
              {(cleanedProv || s.provider_name !== null) && (
                <p
                  className="text-sm sm:text-base text-white/90 mb-5 leading-snug"
                  style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" } as React.CSSProperties}
                >
                  <InlineEdit field="provider_name" variant="text" value={s.provider_name} onSave={editField("provider_name", s.provider_name)} saving={savingEdit}>
                    {cleanedProv ?? ""}
                  </InlineEdit>
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
            {earlyDl && earlyTypeLabel ? (
              <>
                <p className="text-sm leading-relaxed text-foreground">
                  <span className="font-semibold">{earlyTypeLabel}:</span>{" "}
                  <InlineEdit field="early_deadline" variant="date" value={s.early_deadline ?? null} onSave={editField("early_deadline", s.early_deadline ?? null)} saving={savingEdit} label="Early deadline (ISO)">
                    <span className={
                      earlyDl.tone === "danger" ? "text-destructive font-semibold"
                      : earlyDl.tone === "warn" ? "text-amber-700 dark:text-amber-400 font-medium"
                      : "text-foreground/85"
                    }>{earlyDl.text}</span>
                  </InlineEdit>
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  <span className="font-semibold">{t("Regular Decision", "Regular Decision")}:</span>{" "}
                  <InlineEdit field="application_deadline" variant="date" value={s.application_deadline} onSave={editField("application_deadline", s.application_deadline)} saving={savingEdit} label="Application deadline (ISO)">
                    <span className={
                      dl.tone === "danger" ? "text-destructive font-semibold"
                      : dl.tone === "warn" ? "text-amber-700 dark:text-amber-400 font-medium"
                      : "text-foreground/85"
                    }>{dl.text}</span>
                  </InlineEdit>
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-foreground">
                <span className="font-semibold">{t("Deadline", "Дедлайн")}:</span>{" "}
                <InlineEdit field="application_deadline" variant="date" value={s.application_deadline} onSave={editField("application_deadline", s.application_deadline)} saving={savingEdit} label="Application deadline (ISO)">
                  <span className={
                    dl.tone === "danger" ? "text-destructive font-semibold"
                    : dl.tone === "warn" ? "text-amber-700 dark:text-amber-400 font-medium"
                    : "text-foreground/85"
                  }>{dl.text}</span>
                </InlineEdit>
              </p>
            )}
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{t("Levels", "Уровни")}:</span>{" "}
              <InlineEdit field="target_degree_level" variant="chip-array" value={s.target_degree_level} onSave={editField("target_degree_level", s.target_degree_level)} saving={savingEdit} label="Target levels (e.g. master, phd)">
                <span className="text-foreground/85">
                  {(s.target_degree_level ?? []).map(humanizeDegreeLabel).join(", ") || t("Any", "Любой")}
                </span>
              </InlineEdit>
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{t("Citizenship", "Гражданство")}:</span>{" "}
              <InlineEdit field="eligible_countries" variant="chip-array" value={s.eligible_countries} onSave={editField("eligible_countries", s.eligible_countries)} saving={savingEdit} label="Eligible countries (empty = open to all)">
                <span className="text-foreground/85">
                  {renderCitizenship(s.eligible_countries, s.citizenship_requirements, t)}
                </span>
              </InlineEdit>
            </p>
          </div>

          {/* Scrollable body — ScholarshipMiniGuide reads the pre-generated
              static guide from scholarship_mini_guides. Renders nothing if
              no row exists (graceful degrade — the static prose below
              still renders). */}
          <div className="overflow-y-auto flex-1 px-6 sm:px-9 py-5 sm:py-6 space-y-5">
            <EditModeToggle />
            <AdminMetadataPanel
              scholarship={{
                scholarship_id: s.scholarship_id,
                provider_name: s.provider_name,
                host_country: s.host_country,
                official_url: s.official_url,
                coverage_type: s.coverage_type,
                award_amount_text: s.award_amount_text,
                application_deadline: s.application_deadline,
                target_degree_level: s.target_degree_level,
                target_fields: s.target_fields,
                target_demographics: null,
                eligible_countries: s.eligible_countries,
                citizenship_requirements: s.citizenship_requirements,
              }}
              onSaved={(patch) => setS({ ...s, ...patch } as ScholarshipLite)}
            />
            {/* Full canonical_overview — Sam asked the banner to show
                only the first sentence and to let the rest reveal here
                in the pull-up (2026-05-27). The hero banner stays
                editorial-restrained; this is where the whole story
                lives unclipped. */}
            {((s as ScholarshipLite & { canonical_overview?: string | null }).canonical_overview ?? "").trim().length > 0 && (
              <p className="text-[14px] leading-relaxed text-foreground/85 whitespace-pre-line">
                <InlineEdit
                  field="canonical_overview"
                  variant="textarea"
                  value={(s as ScholarshipLite & { canonical_overview?: string | null }).canonical_overview ?? null}
                  onSave={editField("canonical_overview", (s as ScholarshipLite & { canonical_overview?: string | null }).canonical_overview)}
                  saving={savingEdit}
                  label="Overview"
                >
                  {((s as ScholarshipLite & { canonical_overview?: string | null }).canonical_overview ?? "").trim()}
                </InlineEdit>
              </p>
            )}
            {/* 2026-05-27: Pulled the ScholarshipArchetypeInsight section.
                The (archetype × scholarship) matrix produced one-line AI-slop
                cells ("…demands commitment to a strategic discipline, not
                exploration of options") that read worse than nothing in a
                "Personalized for you" frame. Data + generator stay in tree;
                surface is gone until the cells are regenerated to the
                mini-guide quality bar. ScholarshipMiniGuide carries the
                substantive content. */}
            <ScholarshipMiniGuide scholarshipId={s.scholarship_id} language={lang} />
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
