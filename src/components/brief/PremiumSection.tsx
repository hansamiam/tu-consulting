import { Crown } from "lucide-react";
import { motion } from "framer-motion";
import { EnrichedMarkdown } from "@/components/EnrichedMarkdown";

import type { InlineScholarshipData } from "@/components/InlineScholarshipCard";

/* PremiumSection — visual treatment for sections that only appear at the
   premium tier (Career ROI, Visa Pathway, etc.). The container says
   "this is the deep stuff" without us writing the words.

   Pull pattern: parse the leading "## title" out of the markdown so the
   wrapper renders a styled header, then EnrichedMarkdown handles the rest.
   No body changes; the AI keeps writing freely and we only re-skin
   the chrome around it. */

type Kind = "career" | "visa";

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
  kind, markdown, isRu, scholarships,
}: {
  kind: Kind;
  markdown: string;
  isRu: boolean;
  scholarships: InlineScholarshipData[];
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
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary">
            <Crown className="w-3 h-3" />
            {isRu ? "Pro" : "Pro"}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
            {copy.eyebrow}
          </span>
        </div>

        <h2 className="font-heading text-2xl sm:text-[28px] font-bold text-foreground leading-[1.1] tracking-[-0.02em] mb-5">
          {headingLine}
        </h2>

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
