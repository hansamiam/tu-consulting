import { useMemo } from "react";
import { motion } from "framer-motion";
import { Crown, Share2, Printer, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * BriefMasthead — editorial cover for the strategy report.
 *
 * Sits above the hero KPI strip and frames the brief as a real consulting
 * deliverable: serif name, target context, a synthesis sentence pulled
 * from the AI's strategic-positioning paragraph, and an action row
 * (share / print / download).
 *
 * Why this exists: before this, the brief landed straight into KPI tiles.
 * No moment of "this report was made for me." The masthead is what makes
 * the screenshot a screenshot — the first thing a user shows their parents
 * and the first thing they share.
 *
 * The synthesis sentence is heuristic: we extract the first non-trivial
 * sentence of the "## Strategic positioning" body. If the brief is mid-
 * stream and that section hasn't landed yet, we fall back to a profile-
 * derived line so the masthead never looks empty during streaming.
 */

interface Props {
  studentName: string;
  /** Profile fields used for the right-rail context line and fallback synthesis. */
  profile: {
    gradeLevel?: string;
    major?: string;
    targetCountries?: string[];
    nationality?: string;
  };
  /** Brief markdown — used to extract the synthesis sentence when streamed in. */
  briefContent: string;
  /** Whether the brief is currently streaming. Affects the synthesis fallback + actions. */
  isStreaming: boolean;
  isRu: boolean;
  /** Whether the user has Pro access — controls the "Download PDF" affordance. */
  isPro: boolean;
  /** Called when the user clicks the Share button. Parent owns the rich
   *  share dialog (mint URL, copy, email-me, forward). The masthead just
   *  triggers it — no dialog state lives here. */
  onShare?: () => void;
  /** Called when the user clicks Print. Defaults to window.print(). */
  onPrint?: () => void;
  /** Called when Pro users click Download PDF. */
  onDownloadPdf?: () => void;
}

const t = (en: string, ru: string, isRu: boolean) => (isRu ? ru : en);

/** Pull the first complete sentence from the Strategic Positioning section
 *  body. Returns null if not found or too short — caller falls back to a
 *  profile-derived line. */
function extractSynthesis(brief: string): string | null {
  if (!brief || brief.length < 200) return null;
  const sections = brief.split(/(?=^##\s+)/m);
  const positioning = sections.find((s) => /^##\s+(strategic\s+positioning|стратегическ)/im.test(s));
  if (!positioning) return null;
  const body = positioning.replace(/^##.*\n/, "").trim();
  // Skip headings, lists, the 30-day call line. Keep narrative paragraphs.
  const lines = body.split(/\n+/).filter((l) => {
    const t = l.trim();
    if (!t) return false;
    if (t.startsWith("#")) return false;
    if (/^[-*]\s+/.test(t)) return false;
    if (/^\*\*\s*(your\s+30-?day\s+call|стратегическ.{0,4}\s+шаг)/i.test(t)) return false;
    return true;
  });
  const para = lines.join(" ").replace(/\*+/g, "").trim();
  if (para.length < 80) return null;
  // First sentence — period, question mark, or em-dash followed by space.
  const m = para.match(/^[^.!?]+[.!?](?:\s|$)/);
  const first = (m ? m[0] : para).trim();
  if (first.length < 60 || first.length > 240) {
    // Fall back to first 200 chars at a word boundary.
    const cap = para.slice(0, 200);
    const lastSpace = cap.lastIndexOf(" ");
    return (lastSpace > 60 ? cap.slice(0, lastSpace) : cap).trim();
  }
  return first;
}

export function BriefMasthead({
  studentName, profile, briefContent, isStreaming, isRu, isPro,
  onShare, onPrint, onDownloadPdf,
}: Props) {
  const generatedDate = useMemo(
    () => new Date().toLocaleDateString(isRu ? "ru-RU" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    }),
    [isRu],
  );

  const { synthesis, fromBrief } = useMemo(() => {
    const extracted = extractSynthesis(briefContent);
    if (extracted) return { synthesis: extracted, fromBrief: true };
    // Fallback: profile-derived synthesis. Useful while the brief is streaming
    // and the strategic-positioning section hasn't arrived yet.
    const level = profile.gradeLevel || "";
    const field = profile.major || "";
    const nationality = (profile.nationality || "").trim();
    const targets = (profile.targetCountries || []).slice(0, 3).join(", ");
    if (level && field && targets) {
      // Lead with nationality when available — it's the single highest-
      // signal grounding fact for an admissions brief and immediately
      // tells the reader "this was written for me, not generic".
      const studentDescriptor = nationality
        ? `${nationality} ${level.toLowerCase()}`
        : level.toLowerCase();
      const studentDescriptorRu = nationality
        ? `${level.toLowerCase()} из ${nationality}`
        : level.toLowerCase();
      return {
        synthesis: t(
          `Strategy for a ${studentDescriptor} candidate in ${field} targeting ${targets}.`,
          `Стратегия для ${studentDescriptorRu} в направлении ${field} с целью ${targets}.`,
          isRu,
        ),
        fromBrief: false,
      };
    }
    return {
      synthesis: t(
        "Personalised admissions strategy — pulling matches and drafting your plan.",
        "Персональная стратегия поступления — подбираем совпадения и готовим план.",
        isRu,
      ),
      fromBrief: false,
    };
  }, [briefContent, profile.gradeLevel, profile.major, profile.nationality, profile.targetCountries, isRu]);

  const targetLine = useMemo(() => {
    const parts: string[] = [];
    // Nationality leads when available — same rationale as the synthesis
    // line: it grounds the brief as "for this specific student" before
    // the level/field/targets, which read as universal-shape facts.
    if (profile.nationality) parts.push(t(`From ${profile.nationality}`, `Из ${profile.nationality}`, isRu));
    if (profile.gradeLevel) parts.push(profile.gradeLevel);
    if (profile.major) parts.push(profile.major);
    const tc = (profile.targetCountries || []).slice(0, 3).join(" · ");
    if (tc) parts.push(t(`→ ${tc}`, `→ ${tc}`, isRu));
    return parts.join(" · ");
  }, [profile.gradeLevel, profile.major, profile.nationality, profile.targetCountries, isRu]);

  const handlePrint = () => {
    if (onPrint) onPrint();
    else if (typeof window !== "undefined") window.print();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-label={t("Strategy report cover", "Обложка отчёта", isRu)}
      className="not-prose mb-8 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-gold/[0.04] overflow-hidden print:border-0 print:rounded-none print:bg-white"
    >
      {/* Top eyebrow row — TopUni · Pathway Report   ·   Generated [date] */}
      <div className="flex items-center justify-between gap-2 px-6 sm:px-8 pt-6 pb-3 border-b border-border/60 print:border-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-px w-6 bg-gold-dark shrink-0" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark truncate">
            {t("TopUni · Strategy report", "TopUni · Стратегический отчёт", isRu)}
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums shrink-0">
          {t("Generated", "Создан", isRu)} {generatedDate}
        </p>
      </div>

      {/* Identity block — name, target context, synthesis sentence */}
      <div className="px-6 sm:px-8 pt-6 pb-7">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.02em] leading-[1.1] text-foreground">
            {studentName || t("Your strategy report", "Ваш стратегический отчёт", isRu)}
          </h1>
          {targetLine && (
            <p className="text-xs sm:text-sm text-muted-foreground tracking-tight font-medium">
              {targetLine}
            </p>
          )}
        </div>

        {/* Synthesis pull — italic, gold-rule, lifts the report's thesis to the cover */}
        <div className="relative mt-1 pl-4 border-l-2 border-gold-dark/60">
          <p className="font-heading text-base sm:text-lg italic text-foreground/85 leading-relaxed tracking-tight">
            {isStreaming && !fromBrief ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-dark" />
                <span className="text-muted-foreground not-italic font-normal">{synthesis}</span>
              </span>
            ) : (
              synthesis
            )}
          </p>
        </div>

        {/* Action row — share / print / download. Hidden on print so the cover
            still works as a printed PDF page-1. Pro-only download is a soft
            upsell; non-Pro users see the same button leading to the comparison
            modal via the parent dashboard's Pro-upgrade flow. */}
        <div className="mt-6 flex flex-wrap items-center gap-2 print:hidden">
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              disabled={isStreaming}
              className="gap-1.5 h-9"
              title={isStreaming
                ? t("Wait for the report to finish", "Дождитесь завершения отчёта", isRu)
                : t("Share this report with parents or counsellors", "Поделиться отчётом", isRu)}
            >
              {isStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              {t("Share", "Поделиться", isRu)}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isStreaming}
            className="gap-1.5 h-9"
            title={t("Print or save as PDF via your browser", "Печать или PDF через браузер", isRu)}
          >
            <Printer className="w-3.5 h-3.5" />
            {t("Print", "Печать", isRu)}
          </Button>
          {onDownloadPdf && (
            <Button
              variant={isPro ? "outline" : "gold"}
              size="sm"
              onClick={onDownloadPdf}
              disabled={isStreaming}
              className="gap-1.5 h-9"
            >
              {isPro ? <FileDown className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
              {isPro
                ? t("Download PDF", "Скачать PDF", isRu)
                : t("PDF · Pro", "PDF · Pro", isRu)}
            </Button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
