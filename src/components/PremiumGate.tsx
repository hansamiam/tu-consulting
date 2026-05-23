import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { ProComparisonModal } from "@/components/ProComparisonModal";

/**
 * <PremiumGate /> — soft-blur overlay that wraps gated content.
 *
 * Pattern: child content renders in muted+blurred state behind a CTA card
 * that explains what's locked + drives to /pricing. Earns its premium feel
 * by NOT being annoying — content underneath is visible enough to set
 * expectations, opaque enough to feel scarce.
 *
 * Fires gate_seen the first time the gate scrolls into view, and
 * gate_upgrade_clicked when the user clicks through. Both events feed the
 * /admin/funnel dashboard so we can measure conversion.
 *
 * Usage:
 *
 *   <PremiumGate
 *     gateId="discover-saves-unlimited"
 *     headline="Members save every match — not just the first five"
 *     subline="Unlock with TopUni Membership."
 *   >
 *     <div>{lockedContent}</div>
 *   </PremiumGate>
 */
interface Props {
  gateId: string;            // unique per gate, used in analytics metadata
  headline: string;
  subline?: string;
  /** Override the default /pricing destination if needed. */
  ctaHref?: string;
  /** Override the default CTA text. */
  ctaLabel?: string;
  children: React.ReactNode;
}

export const PremiumGate = ({
  gateId, headline, subline, ctaHref, ctaLabel, children,
}: Props) => {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const seenRef = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Fire `gate_seen` once per render of this gate, when it first
  // intersects the viewport. We don't want to fire on render-but-not-visible
  // because gates often live below the fold.
  useEffect(() => {
    if (!wrapperRef.current || seenRef.current) return;
    const el = wrapperRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !seenRef.current) {
          seenRef.current = true;
          void track("gate_seen", { gate_id: gateId });
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [gateId]);

  const handleClick = () => {
    void track("gate_upgrade_clicked", { gate_id: gateId });
    if (ctaHref) {
      navigate(ctaHref);
    } else {
      setModalOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative not-prose">
      {/* Underlying content — blurred + opacity-dimmed but still discernible
          so the user knows "yes, there's real stuff here behind this gate". */}
      <div className="select-none pointer-events-none filter blur-[5px] opacity-50" aria-hidden="true">
        {children}
      </div>

      {/* Gate card — centered absolute layer */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 flex items-center justify-center px-4"
      >
        <div className="max-w-md w-full bg-card border border-gold/40 rounded-2xl shadow-lg p-6 sm:p-7 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary mb-3">
            <Crown className="w-3 h-3" />
            TopUni Membership
          </div>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight leading-snug mb-2">
            {headline}
          </h3>
          {subline && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {subline}
            </p>
          )}
          <Button variant="gold" onClick={handleClick} className="gap-1.5 w-full sm:w-auto">
            <Lock className="w-3.5 h-3.5" />
            {ctaLabel ?? "See what unlocks"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <p className="text-[10px] text-muted-foreground/70 mt-3">
            $39/month · 30-day money-back guarantee · cancel anytime
          </p>
        </div>
      </motion.div>
      <ProComparisonModal open={modalOpen} onOpenChange={setModalOpen} gateId={gateId} />
    </div>
  );
};
