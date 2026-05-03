import { Crown, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { EnrichedMarkdown } from "@/components/EnrichedMarkdown";
import { CareerRoiChart } from "@/components/brief/CareerRoiChart";
import { VisaPathwayChart } from "@/components/brief/VisaPathwayChart";

import type { InlineScholarshipData } from "@/components/InlineScholarshipCard";
import type { CareerRoiSection, VisaPathwaySection } from "@/types/briefStructured";

/* PremiumSection — visual treatment for sections that only appear at the
   premium tier (Career ROI, Visa Pathway, etc.). The container says
   "this is the deep stuff" without us writing the words.

   When a structured-data payload is supplied (`careerRoiData` /
   `visaPathwayData`), the corresponding chart renders ABOVE the narrative.
   The chart is enrichment, not a hard dependency — if extraction fails
   (returns null), the markdown narrative still renders cleanly. */

type Kind = "career" | "visa";

/* Section ids match the SectionSpec.id strings in
   supabase/functions/_shared/brief-sections.ts so the regen call hits
   the right per-section prompt on the backend. */
const KIND_TO_SECTION_ID: Record<Kind, string> = {
  career: "career_roi",
  visa: "visa",
};

const KIND_COPY: Record<Kind, { en: { eyebrow: string }; ru: { eyebrow: string } }> = {
  career: {
    en: { eyebrow: "Career ROI · Premium analysis" },
    ru: { eyebrow: "Карьерный ROI · Премиум-анализ" },
  },
  visa: {
    en: { eyebrow: "Visa & post-grad pathway · Premium analysis" },
    ru: { eyebrow: "Виза и работа после · Премиум-анализ" },
  },
};

export const PremiumSection = ({
  kind, markdown, isRu, scholarships, careerRoiData, visaPathwayData,
  onRegen, isRegenerating = false,
}: {
  kind: Kind;
  markdown: string;
  isRu: boolean;
  scholarships: InlineScholarshipData[];
  careerRoiData?: CareerRoiSection | null;
  visaPathwayData?: VisaPathwaySection | null;
  /** Optional regen handler. When provided, a per-section "regenerate"
   *  affordance renders in the header. The handler receives the
   *  SectionSpec id (e.g. "career_roi") that the backend's
   *  topuni-ai-pathway recognizes via the regenSection body field. */
  onRegen?: (sectionId: string) => void;
  isRegenerating?: boolean;
}) => {
  // Strip the leading "## Heading" — we render our own styled header.
  const lines = markdown.split("\n");
  let headingLine = "";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("## ")) {
      headingLine = trimmed.slice(3).trim();
      bodyStart = i + 1;
      break;
    }
  }
  const body = lines.slice(bodyStart).join("\n").trim();

  const copy = KIND_COPY[kind][isRu ? "ru" : "en"];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="not-prose my-12 rounded-2xl overflow-hidden border border-gold/30 bg-gradient-to-br from-gold/[0.06] via-card to-card relative"
    >
      {/* Vertical gold rail on the left */}
      <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-gold-dark via-gold to-gold-dark" />

      <div className="px-6 sm:px-8 py-7 sm:py-8">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary">
            <Crown className="w-3 h-3" />
            {isRu ? "Pro" : "Pro"}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
            {copy.eyebrow}
          </span>
          {onRegen && (
            <button
              onClick={() => onRegen(KIND_TO_SECTION_ID[kind])}
              disabled={isRegenerating}
              className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-gold-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed print:hidden"
              title={isRu ? "Перегенерировать этот раздел" : "Regenerate just this section"}
            >
              {isRegenerating
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              {isRegenerating ? (isRu ? "Создаём…" : "Regenerating…") : (isRu ? "Перегенерировать" : "Regenerate")}
            </button>
          )}
        </div>

        <h2 className="font-heading text-2xl sm:text-[28px] font-bold text-foreground leading-[1.1] tracking-[-0.02em] mb-5">
          {headingLine}
        </h2>

        {/* Structured-data chart renders ABOVE the narrative when extraction
            succeeded. Falls through to narrative-only when extraction
            returned null or the structured pass hadn't completed yet. */}
        {kind === "career" && careerRoiData && (
          <CareerRoiChart data={careerRoiData} isRu={isRu} />
        )}
        {kind === "visa" && visaPathwayData && (
          <VisaPathwayChart data={visaPathwayData} isRu={isRu} />
        )}

        {/* Restore the prose container locally so EnrichedMarkdown styling
            still applies inside the not-prose wrapper. */}
        <div className="prose prose-sm max-w-none dark:prose-invert
                       [&_h3]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:tracking-tight
                       [&_p]:text-foreground/85 [&_p]:leading-relaxed
                       [&_li]:text-foreground/85 [&_li]:leading-relaxed
                       [&_strong]:text-foreground [&_strong]:font-semibold">
          <EnrichedMarkdown scholarships={scholarships}>{body}</EnrichedMarkdown>
        </div>
      </div>
    </motion.section>
  );
};
