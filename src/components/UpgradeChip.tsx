/**
 * UpgradeChip — quiet, persistent upgrade prompt.
 *
 * The pattern that doesn't annoy: present-but-ignorable. Auto-hides for
 * paid members. Renders as a small chip / inline strip with a single
 * sentence on what they'll unlock. No animation, no toast, no modal,
 * no countdown. Just one line of copy + a link to /pricing.
 *
 * Use sparingly — once per surface, near the bottom or as a sidebar
 * footer. Multiple UpgradeChips on the same screen kill the signal.
 *
 * Variants:
 *   "footer"   — full-width quiet strip, used at the bottom of a long page
 *   "inline"   — compact pill, slots into a row of links
 *   "sidebar"  — left-bordered card-like, sits under a sticky sidebar
 */
import { Link } from "react-router-dom";
import { ArrowRight, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";

interface Props {
  /** Unique label for analytics — pipeline-footer, discover-sidebar, etc. */
  surface: string;
  /** One-liner hook. Should be context-aware ("you've saved 12 — Pipeline tracks all 12 with Pro"). */
  message: string;
  variant?: "footer" | "inline" | "sidebar";
  language?: "en" | "ru";
  className?: string;
}

export const UpgradeChip = ({ surface, message, variant = "inline", language = "en", className = "" }: Props) => {
  const { subscription } = useAuth();
  // Use is_active (paid + period valid OR earned trial) so a user
  // whose subscription was canceled in Stripe (DB tier still "pro"
  // until backfilled) sees the chip again — they should be prompted
  // to resubscribe, not hidden as a "still member".
  const isMember = subscription.is_active || subscription.is_founding_member;
  if (isMember) return null;

  const ru = language === "ru";
  const cta = ru ? "Открыть Pro" : "Unlock with Pro";
  const pricingHref = ru ? "/pricing/ru" : "/pricing";

  const onClick = () => {
    void track("upgrade_chip_clicked", { surface });
  };

  if (variant === "footer") {
    return (
      <Link
        to={pricingHref}
        onClick={onClick}
        className={`block border-t border-border/60 bg-canvas-soft/40 hover:bg-canvas-soft/70 transition-colors ${className}`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between gap-3 text-[13px]">
          <span className="inline-flex items-center gap-2 text-foreground/75">
            <Crown className="h-3.5 w-3.5 text-gold-dark shrink-0" />
            <span>{message}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-gold-dark font-medium tabular-nums shrink-0">
            {cta} <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    );
  }

  if (variant === "sidebar") {
    return (
      <Link
        to={pricingHref}
        onClick={onClick}
        className={`block rounded-xl border border-border bg-card/60 hover:border-gold/30 hover:bg-card transition-all px-3 py-3 group ${className}`}
      >
        <div className="flex items-start gap-2.5">
          <Crown className="h-3.5 w-3.5 text-gold-dark shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-foreground/80 leading-snug">{message}</p>
            <p className="text-[11px] text-gold-dark mt-1.5 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              {cta} <ArrowRight className="h-2.5 w-2.5" />
            </p>
          </div>
        </div>
      </Link>
    );
  }

  // inline pill
  return (
    <Link
      to={pricingHref}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[12px] text-foreground/75 hover:text-foreground bg-foreground/[0.04] hover:bg-foreground/[0.06] border border-border/60 px-2.5 py-1 rounded-full transition-colors ${className}`}
    >
      <Crown className="h-3 w-3 text-gold-dark" />
      <span>{message}</span>
      <ArrowRight className="h-2.5 w-2.5 text-foreground/50" />
    </Link>
  );
};
