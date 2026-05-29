/* AcademyHookCta — Discover detail-sheet membership upsell.
 *
 * NAVY TOKEN NOTE (Stream F audit 2026-05-25):
 *   This component intentionally uses bg-muted/30 (cream surface) — not navy.
 *   Its primary CTA uses <Button> default variant which resolves to bg-primary
 *   (--primary: 210 58% 22%) — the canonical brand-navy matching the footer.
 *   No hardcoded hex. No navy clash here.
 *   Use className="bg-brand-navy" for any future navy surfaces in this component.
 *
 * Lives below the static scholarship info in the detail sheet and inside
 * the "expired but reopens_annually" banner. Sam re-pointed this from a
 * "strategy report" prompt to a MEMBERSHIP prompt on 2026-05-25 — live
 * workshops + office hours with the team is the differentiated offer
 * vs. the free strategy report.
 *
 * Variants:
 *   - detail_sheet (default): "Want live support?"
 *   - expired_reopens: "We'll help you target next cycle"
 *   - generic: parent passes its own headline/body
 *
 * Bilingual EN/RU. Punchy copy, no Sparkles. Single-action.
 */
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/adminMode";

type Lang = "en" | "ru";
type Variant = "detail_sheet" | "expired_reopens" | "generic";

interface Props {
  variant?: Variant;
  /** Override copy. When set, ignores the variant defaults. */
  headline?: string;
  body?: string;
  /** Where the primary button goes. Defaults to /pricing — membership. */
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
      headline: "Want live support?",
      body: "Monthly workshops and office hours with our expert team.",
      cta: "Become a member",
    },
    ru: {
      headline: "Нужна живая поддержка?",
      body: "Ежемесячные воркшопы и office hours с командой.",
      cta: "Стать членом",
    },
  },
  expired_reopens: {
    en: {
      headline: "We'll help you target the next cycle",
      body: "Monthly workshops and office hours with our expert team — be ready when applications reopen.",
      cta: "Become a member",
    },
    ru: {
      headline: "Подготовим вас к следующему циклу",
      body: "Ежемесячные воркшопы и office hours с командой — будете готовы, когда снова откроют подачу.",
      cta: "Стать членом",
    },
  },
  generic: {
    en: { headline: "", body: "", cta: "Become a member" },
    ru: { headline: "", body: "", cta: "Стать членом" },
  },
};

export const AcademyHookCta = ({
  variant = "detail_sheet",
  headline,
  body,
  href = "/pricing",
  ctaLabel,
  lang = "en",
  className = "",
}: Props) => {
  // 2026-05-29: hide the upsell for users who are already paying members
  // (or admin emails). The whole CTA is "Become a member" — showing it
  // to someone who already did costs trust + visual noise. Members get
  // the live workshops + office hours regardless of this surface; this
  // card is purely a conversion ask.
  const { user, subscription } = useAuth();
  const isMember = !!subscription && (
    subscription.is_active ||
    subscription.is_founding_member ||
    isAdminUser(user)
  );
  if (isMember) return null;

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
