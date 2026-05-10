/**
 * TopUniAIEntrance
 *
 * Lighter entrance animation for /topuni-ai. Premium-aesthetic but
 * deliberately not as elaborate as DiscoverEntranceGate — the brief
 * intake is the start of work, not a moment of revelation, so the
 * treatment focuses on a brief wordmark beat then dissolves into the
 * intake form.
 *
 * Sequence (~1.7s total):
 *   0.0 - 0.6s   Wordmark fades in (TopUni AI + tagline). No motion
 *                of the page yet.
 *   0.6 - 1.2s   Wordmark holds with a quiet gold underscore that
 *                grows from center as a one-second "settling" beat.
 *   1.2 - 1.7s   Wordmark + curtain fade out, no movement on the
 *                underlying intake form so the form arrives stable
 *                rather than jumping in.
 *
 * Suppression matches DiscoverEntranceGate:
 *   · sessionStorage gate per-tab session
 *   · prefers-reduced-motion: reduce skips entirely
 *
 * The component returns null when not active so it's safe to mount
 * at the top of TopUniAI.tsx unconditionally.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "topuni-ai-entrance-played";

// 2026-05-10 fix: pre-fix the wordmark faded in on top of a still-
// brightening gold halo, so during the bloom peak the text washed
// out against its own glow — viewers reported "uhh what just
// flashed?". Two fixes: (1) the halo finishes blooming BEFORE the
// wordmark hits full opacity, so the text never competes with peak
// brightness, (2) total sequence stretched 1.7s → 2.4s so the
// wordmark holds long enough for the eye to register what it said.
const SEQUENCE_MS = 2400;

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
};

interface Props {
  language?: "en" | "ru";
}

export const TopUniAIEntrance = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (prefersReducedMotion()) return false;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return false;
    } catch { /* ignore */ }
    return true;
  });

  useEffect(() => {
    if (!active) return;
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    const timer = window.setTimeout(() => setActive(false), SEQUENCE_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="topuni-ai-entrance"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center bg-background/85 backdrop-blur-md"
        aria-hidden
      >
        {/* Soft gold halo. Re-timed so the bloom PEAKS at 35% (~840ms)
            and dims to ~12% by 60% (~1.45s), well before the wordmark
            hits full strength. Pre-fix the halo and the text both
            peaked at the same moment, washing the text out against
            its own glow. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: [0, 0.45, 0.18, 0], scale: [0.85, 1.15, 1.3, 1.45] }}
          transition={{ duration: 2.3, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 0.6, 1] }}
          className="absolute w-[40vw] h-[40vw] max-w-[480px] max-h-[480px] rounded-full"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--gold) / 0.30) 0%, hsl(var(--gold) / 0.10) 40%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />

        {/* Wordmark — enters AFTER the halo peak (delay 0.55s) so it
            never competes with the bloom's brightness. Holds a long
            steady plateau (35%-78% of sequence) so the eye actually
            reads "TopUni AI" before the dissolve. Stronger drop-
            shadow so the gold-dark "AI" stays readable through any
            residual glow. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -4] }}
          transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], times: [0, 0.25, 0.78, 1], delay: 0.55 }}
          className="relative flex flex-col items-center text-center"
        >
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.36em] text-gold-dark mb-3">
            TopUni
          </p>
          <p className="font-heading text-4xl sm:text-5xl font-bold tracking-[-0.03em] text-foreground drop-shadow-[0_2px_24px_hsl(var(--background)/0.85)]">
            {ru ? "TopUni " : "TopUni "}<span className="text-gold-dark drop-shadow-[0_1px_8px_hsl(var(--background)/0.65)]">AI</span>
          </p>

          {/* Underscore grows from center during the held beat. */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: [0, 1, 1, 0] }}
            transition={{ duration: 1.7, ease: [0.16, 1, 0.3, 1], times: [0, 0.4, 0.78, 1], delay: 0.7 }}
            className="block h-px w-32 sm:w-44 bg-gradient-to-r from-transparent via-gold-dark to-transparent mt-5 origin-center"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], times: [0, 0.5, 1], delay: 0.85 }}
            className="text-[11px] sm:text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground/85 mt-4"
          >
            {ru ? "Стратегия за минуты" : "Strategy in minutes"}
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
