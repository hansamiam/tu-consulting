import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award, Calendar, ExternalLink, Bookmark, BookmarkCheck, ArrowUpRight, Target,
} from "lucide-react";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { toast } from "sonner";
import { useFocusScholarship } from "@/components/EnrichedMarkdown";
import { cleanScholarshipName, compactAward } from "@/lib/scholarshipFields";
import { shortCountry } from "@/lib/countryAccent";

/**
 * <InlineScholarshipCard /> — the in-brief scholarship pill.
 *
 * When the AI brief mentions a real scholarship from our database (e.g.
 * "Chevening Scholarships"), the markdown renderer detects the name and
 * swaps the plain bold text for this card. The card lets the student:
 *   • See the deadline + funding at a glance
 *   • Click into the full /scholarships/:id page
 *   • Save to their pipeline (one tap, useApplicationTracker.toggleShortlist)
 *   • Open the official URL
 *
 * Compact horizontal layout — fits flush in a paragraph or a list item
 * without visually breaking the markdown flow. Slightly bordered + gold
 * accent on hover so the reader knows it's interactive.
 */

export interface InlineScholarshipData {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  application_deadline: string | null;
  official_url: string | null;
  /** Verification metadata — see migration 20260504000000.
   *  Both optional to keep the type back-compat with older callers. */
  verification_status?: string | null;
  last_verified_at?: string | null;
}

interface Props {
  scholarship: InlineScholarshipData;
  /** Show the full provider/country line. Default true. */
  showMeta?: boolean;
}

const COVERAGE_LABEL: Record<string, string> = {
  full_ride: "Full ride",
  tuition_only: "Tuition",
  stipend: "Stipend",
  partial: "Partial",
  other: "Funded",
};

function deadlineDisplay(d: string | null): { text: string; cls: string } {
  if (!d) return { text: "Rolling", cls: "text-muted-foreground" };
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days <= 0)  return { text: "Closed", cls: "text-muted-foreground/60 line-through" };
  if (days <= 7)  return { text: `${days}d left`, cls: "text-destructive font-semibold" };
  if (days <= 30) return { text: `${days}d left`, cls: "text-amber-700 dark:text-amber-400 font-medium" };
  if (days <= 90) return { text: `${days}d`, cls: "text-foreground/70" };
  return { text: `${Math.ceil(days / 30)}mo`, cls: "text-muted-foreground" };
}

export function InlineScholarshipCard({ scholarship: s, showMeta = true }: Props) {
  const tracker = useApplicationTracker();
  const isSaved = tracker.shortlist.has(s.scholarship_id);
  const dl = deadlineDisplay(s.application_deadline);
  const coverage = COVERAGE_LABEL[s.coverage_type] ?? "Funded";
  // Focus mode — when this card matches the brief's focus scholarship,
  // wear a stronger ring and a "Your focus" badge. Visually completes
  // the loop from the detail-page CTA → wizard → brief.
  const focusedId = useFocusScholarship();
  const isFocused = !!focusedId && focusedId === s.scholarship_id;

  // Detect language from the URL pathname — this card is rendered
  // inside both EN and RU briefs (via EnrichedMarkdown which doesn't
  // pass a language prop), and a Russian user shouldn't see an
  // English save toast or English aria-labels.
  const isRu = typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/ru") ||
     /\/(?:ru)(?:$|\/)/.test(window.location.pathname));

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    tracker.toggleShortlist(s.scholarship_id);
    toast.success(
      isSaved
        ? (isRu ? "Удалено из воронки" : "Removed from your pipeline")
        : (isRu ? "Сохранено в воронку" : "Saved to your pipeline"),
      { description: cleanScholarshipName(s.scholarship_name) }
    );
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex flex-col my-2 not-italic font-normal align-middle"
    >
      {isFocused && (
        <span className="inline-flex self-start items-center gap-1 px-2 py-0.5 mb-1 rounded-full text-[9px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary">
          <Target className="w-2.5 h-2.5" />
          Your focus
        </span>
      )}
      <span className={`group inline-flex flex-wrap items-stretch ${
        isFocused
          ? "border-2 border-gold/55 bg-gold/[0.08] ring-2 ring-gold/25"
          : "border border-gold/35 bg-gold/[0.04] hover:bg-gold/10 hover:border-gold/55"
      } rounded-lg overflow-hidden transition-colors max-w-full`}>
        {/* Body — clickable through to detail page */}
        <Link
          to={`/scholarships/${s.scholarship_id}`}
          className="flex items-center gap-2 px-3 py-2 min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Award className="w-3.5 h-3.5 text-gold-dark shrink-0" />
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0 min-w-0">
            <span className="font-semibold text-foreground text-sm leading-tight group-hover:text-gold-dark transition-colors truncate max-w-[280px]">
              {cleanScholarshipName(s.scholarship_name)}
            </span>
            {showMeta && s.host_country && (
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">· {shortCountry(s.host_country)}</span>
            )}
            {(() => {
              const award = compactAward({
                coverage_type: s.coverage_type,
                award_amount_text: s.award_amount_text,
                estimated_total_value_usd: null,
              }) || coverage;
              // Full-ride label stripped 2026-05-27 from inline pills
              // ("strip all full ride stickers from entries"). Show the
              // $-figure when we have one, otherwise show nothing rather
              // than the bare "Full ride" sticker.
              if (!award || /^Full ride$/i.test(award) || award === "Funded") return null;
              return (
                <span className="text-[11px] text-foreground/70 whitespace-nowrap">· {award}</span>
              );
            })()}
            <span className={`text-[11px] tabular-nums whitespace-nowrap inline-flex items-center gap-0.5 ${dl.cls}`}>
              <Calendar className="w-2.5 h-2.5 inline-block" /> {dl.text}
            </span>
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 group-hover:text-gold-dark group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </Link>

        {/* Save button — adds to application_tracker via the existing hook */}
        <button
          onClick={handleSave}
          aria-label={isSaved
            ? (isRu ? "Убрать из воронки" : "Remove from pipeline")
            : (isRu ? "Сохранить в воронку" : "Save to pipeline")}
          title={isSaved
            ? (isRu ? "Сохранено · нажмите чтобы убрать" : "Saved · click to remove")
            : (isRu ? "Сохранить в воронку" : "Save to your pipeline")}
          className={`shrink-0 px-2.5 border-l transition-colors ${
            isSaved
              ? "bg-gold/15 border-gold/40 text-gold-dark hover:bg-gold/25"
              : "border-gold/30 text-muted-foreground hover:bg-gold/10 hover:text-gold-dark"
          }`}
        >
          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>

        {/* Optional external link */}
        {s.official_url && (
          <a
            href={s.official_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={isRu ? "Открыть официальную страницу" : "Open the official scholarship page"}
            title={isRu ? "Официальный сайт" : "Official site"}
            className="shrink-0 px-2.5 border-l border-gold/30 text-muted-foreground hover:bg-gold/10 hover:text-gold-dark transition-colors flex items-center"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </span>
    </motion.span>
  );
}
