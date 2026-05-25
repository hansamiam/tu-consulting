/* AcademyHookCta — Discover v1 F12 upsell stitch.
 *
 * Small reusable CTA block. Lives below ScholarshipDeepDive in the
 * detail sheet, and inside the "expired but reopens_annually" banner.
 * Doesn't require Academy infra to exist — it just nudges to the
 * strategy brief wizard, which is what the user can actually do today.
 *
 * Variants:
 *   - detail_sheet (default): "Want help winning this one?"
 *   - expired_reopens: "We'll help you target next cycle"
 *   - generic: parent passes its own headline/body
 *
 * Bilingual EN/RU. Punchy copy, no Sparkles. Single-action — the
 * F12 plan calls these "lightweight stitches," not full landing
 * pages, so visual weight stays minimal.
 */
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type Lang = "en" | "ru";
type Variant = "detail_sheet" | "expired_reopens" | "generic";

interface Props {
  variant?: Variant;
  /** Override copy. When set, ignores the variant defaults. */
  headline?: string;
  body?: string;
  /** Where the primary button goes. Defaults to the wizard. */
  href?: string;
  /** Override the button label. */
  ctaLabel?: string;
  lang?: Lang;
  /** Optional className to slot in alongside the default block class. */
  className?: string;
}

const COPY: Record<Variant, { en: { headline: string; body: string; cta: string }; ru: { headline: string; body: string; cta: string } }> = {
  detail_sheet: {
    en: {
      headline: "Want help winning this one?",
      body: "Get your Top Uni strategy — your fit, the angle, what to prepare first.",
      cta: "Get my strategy",
    },
    ru: {
      headline: "Хотите помочь подать сильно?",
      body: "Получите стратегию Top Uni — где вы подходите, какой угол, что готовить в первую очередь.",
      cta: "Получить стратегию",
    },
  },
  expired_reopens: {
    en: {
      headline: "We'll help you target the next cycle",
      body: "This program reopens annually. Get your strategy now and be ready when applications open again.",
      cta: "Get my strategy",
    },
    ru: {
      headline: "Подготовим вас к следующему циклу",
      body: "Программа открывается каждый год. Получите стратегию сейчас — будете готовы, когда снова откроют подачу.",
      cta: "Получить стратегию",
    },
  },
  generic: {
    en: { headline: "", body: "", cta: "Get my strategy" },
    ru: { headline: "", body: "", cta: "Получить стратегию" },
  },
};

export const AcademyHookCta = ({
  variant = "detail_sheet",
  headline,
  body,
  href = "/topuni-ai",
  ctaLabel,
  lang = "en",
  className = "",
}: Props) => {
  const copy = COPY[variant][lang === "ru" ? "ru" : "en"];
  const finalHeadline = headline ?? copy.headline;
  const finalBody = body ?? copy.body;
  const finalCta = ctaLabel ?? copy.cta;

  return (
    <div
      className={[
        "rounded-xl border border-border/60 bg-muted/30 px-5 py-4",
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        className,
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        {finalHeadline && (
          <p className="text-sm font-semibold leading-tight">{finalHeadline}</p>
        )}
        {finalBody && (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{finalBody}</p>
        )}
      </div>
      <Button asChild size="sm" className="shrink-0">
        <a href={href} className="inline-flex items-center gap-1.5">
          {finalCta}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );
};

export default AcademyHookCta;
