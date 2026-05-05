/* ExpandedScholarshipDialog — centered, enlarged detail surface that
 * opens from the right-side DetailSheet's "View full strategy" CTA.
 *
 * Why this exists: the right-side pull-up DetailSheet had grown to
 * include the full personalized deep dive (match breakdown, odds, 30-
 * day plan), which made the panel stretch vertically with text that
 * cut off, wrapped weirdly, and felt dense. The split:
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
  Bookmark, BookmarkCheck, ExternalLink, X, Wallet, Calendar,
  GraduationCap, Globe, Sparkles,
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

interface Props {
  s: ScholarshipLite | null;
  profile: ProfileLite;
  onClose: () => void;
  onApply: () => void;
  onSave: () => void;
  isBookmarked: boolean;
}

const fmtDays = (d: string | null): { text: string; tone: "danger" | "warn" | "neutral" } => {
  if (!d) return { text: "Rolling deadline", tone: "neutral" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { text: "Closed", tone: "neutral" };
  if (days === 0) return { text: "Closes today", tone: "danger" };
  if (days <= 7)  return { text: `${days} days left`, tone: "danger" };
  if (days <= 30) return { text: `${days} days left`, tone: "warn" };
  return { text: `${d} · ${days} days`, tone: "neutral" };
};

const COVERAGE_LABEL: Record<string, string> = {
  full_ride: "Full ride",
  tuition_only: "Tuition only",
  stipend: "Stipend",
  partial: "Partial funding",
};

export const ExpandedScholarshipDialog = ({ s, profile, onClose, onApply, onSave, isBookmarked }: Props) => {
  if (!s) return null;
  const cleanedName = cleanScholarshipName(s.scholarship_name);
  const cleanedProv = cleanProvider(s.provider_name);
  const country = s.host_country ? shortCountry(s.host_country) : null;
  const award = compactAward(s) ?? COVERAGE_LABEL[s.coverage_type] ?? null;
  const dl = fmtDays(s.application_deadline);
  const accent = s.host_country ? accentForCountry(s.host_country) : "from-foreground/40 to-foreground/60";

  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden gap-0 [&>button]:hidden">
        <div className="flex flex-col max-h-[92vh]">
          {/* Hero strip — country gradient, name, provider, headline facts */}
          <div className={`relative bg-gradient-to-br ${accent} text-white overflow-hidden`}>
            <CountryArt country={s.host_country} className="absolute inset-0 h-full w-full opacity-15 text-white" />
            <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" aria-hidden />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative px-6 sm:px-9 py-7 sm:py-9">
              {country && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 mb-2.5">
                  Scholarship · {country}
                </p>
              )}
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-tight mb-2 max-w-3xl">
                {cleanedName}
              </h2>
              {cleanedProv && (
                <p className="text-sm sm:text-base text-white/85 mb-5">{cleanedProv}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="gold" size="sm" onClick={onApply} disabled={!s.official_url} className="gap-1.5">
                  Apply on official site
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={onSave}
                  className="gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {isBookmarked ? "Saved" : "Save to pipeline"}
                </Button>
              </div>
            </div>
          </div>

          {/* Headline facts row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-border bg-card">
            <Fact icon={<Wallet className="h-3.5 w-3.5" />} label="Award" value={award ?? "—"} />
            <Fact
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Deadline"
              value={dl.text}
              tone={dl.tone}
            />
            <Fact
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              label="Levels"
              value={(s.target_degree_level ?? []).map(humanizeDegreeLabel).join(", ") || "Any"}
            />
            <Fact
              icon={<Globe className="h-3.5 w-3.5" />}
              label="Citizenship"
              value={s.citizenship_requirements ? truncate(s.citizenship_requirements, 40) : "Open"}
            />
          </div>

          {/* Scrollable body — ScholarshipDeepDive carries the personalised
              analysis (match breakdown, odds, strategy, 30-day plan).
              That's the substantive content that didn't fit cleanly in
              the right side panel. */}
          <div className="overflow-y-auto flex-1 px-6 sm:px-9 py-6 sm:py-8 space-y-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-2 inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Personalized for you
              </p>
              <h3 className="font-heading text-xl font-bold tracking-tight text-foreground mb-4">
                Your fit, your odds, your move
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
    <div className="px-5 py-3.5 border-r border-border last:border-r-0 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(4n)]:border-r-0 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">{label}</span>
      </div>
      <p className={`text-sm tabular-nums leading-tight truncate ${valueCls}`}>{value}</p>
    </div>
  );
};

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
