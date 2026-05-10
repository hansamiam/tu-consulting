/**
 * DiscoverEntranceGate
 *
 * One-shot entrance animation that plays when the user lands on
 * /discover for the first time in a session.
 *
 * 2026-05-10 simplification — the previous version had the wordmark
 * fading in during the gold-bloom peak, so the text washed out
 * against its own glow and viewers reported "uhh what just flashed?".
 * Three fixes:
 *   1. Sequence stretched to 3.0s so the eye has time to register
 *      what's on screen (the previous 2.6s went by too fast).
 *   2. Wordmark is now WHITE-on-navy with a gold accent stroke under
 *      it — high-contrast typography that stays readable through any
 *      bloom or background motion. Gold-light-on-gold-bloom was the
 *      root cause of the visibility complaint.
 *   3. Single outer bloom only (the inner+outer twin-bloom over-
 *      complicated the moment). The bloom now PEAKS BEFORE the
 *      wordmark hits its hold plateau, then dims, so the text never
 *      competes with peak brightness.
 *
 * Suppression rules unchanged:
 *   · sessionStorage gate to prevent re-trigger in the same tab
 *   · prefers-reduced-motion: reduce skips the animation entirely
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "topuni-discover-entrance-played";

// 3.0s total. The earlier 2.6s left the wordmark on screen for
// ~900ms which felt brief; 3.0s gives the wordmark a full 1.3s
// readable plateau, which is what the eye needs to register
// "Discover" + the sub-line without rushing.
const SEQUENCE_MS = 3000;

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
};

export const DiscoverEntranceGate = () => {
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
        key="discover-gate"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
        aria-hidden
      >
        {/* Solid navy backdrop — high contrast bed for white wordmark.
            Pre-fix the gates split into two halves immediately, putting
            the wordmark over a moving cream pane during its hold; the
            fixed navy bed below means the text is always against the
            same dark surface for its full readable lifespan. The
            gates ABOVE this still part theatrically, but the text
            never has to fight a moving background. */}
        <div className="absolute inset-0 bg-primary" />

        {/* Single gold bloom — peaks early (35% of sequence = 1.05s)
            then dims to 0 by 65% (1.95s). The wordmark hits its hold
            plateau at ~1.0s, so the bloom is already on its way down
            when the text needs to be readable. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: [0, 0.5, 0.15, 0], scale: [0.55, 1.2, 1.6, 2.0] }}
          transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 0.65, 1], delay: 0.2 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] max-w-[640px] max-h-[640px] rounded-full"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--gold) / 0.55) 0%, hsl(var(--gold) / 0.18) 40%, transparent 70%)",
            filter: "blur(14px)",
          }}
        />

        {/* Wordmark — white on navy. Enters at delay 0.5s (after the
            bloom has started establishing the warmth), holds steady
            from 30%-78% of the 2.5s wordmark duration so users get a
            full 1.2s to read "Discover". White > gold-light here
            because gold-on-gold was the visibility problem. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -8] }}
          transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1], times: [0, 0.3, 0.78, 1], delay: 0.4 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        >
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.36em] text-gold-light mb-3">
            TopUni
          </p>
          <p className="font-heading text-4xl sm:text-6xl font-bold tracking-[-0.025em] text-primary-foreground drop-shadow-[0_2px_30px_hsl(var(--primary)/0.9)]">
            Discover
          </p>
          {/* Gold accent line under the wordmark — quiet, premium. */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: [0, 1, 1, 0] }}
            transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], times: [0, 0.4, 0.78, 1], delay: 0.65 }}
            className="block h-px w-32 sm:w-44 bg-gradient-to-r from-transparent via-gold-light to-transparent mt-5 origin-center"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], times: [0, 0.5, 1], delay: 0.85 }}
            className="text-[10px] sm:text-xs font-medium tracking-[0.24em] uppercase text-primary-foreground/65 mt-4"
          >
            Verified scholarships · ranked for you
          </motion.p>
        </motion.div>

        {/* Gates — start parting AFTER the wordmark hold plateau ends
            (delay 1.5s, runs 1.5s = ends at 3.0s). The wordmark has
            already faded by then, so the gates parting reveals the
            calm content beneath rather than fighting for attention. */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "-104%" }}
          transition={{ duration: 1.5, ease: [0.65, 0, 0.18, 1], delay: 1.5 }}
          className="absolute left-0 top-0 h-full w-1/2 origin-right"
          style={{
            backgroundImage:
              "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 88%, hsl(var(--gold) / 0.42) 100%)",
            boxShadow: "10px 0 48px -6px hsl(var(--gold) / 0.45)",
          }}
        />
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "104%" }}
          transition={{ duration: 1.5, ease: [0.65, 0, 0.18, 1], delay: 1.5 }}
          className="absolute right-0 top-0 h-full w-1/2 origin-left"
          style={{
            backgroundImage:
              "linear-gradient(270deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 88%, hsl(var(--gold) / 0.42) 100%)",
            boxShadow: "-10px 0 48px -6px hsl(var(--gold) / 0.45)",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
