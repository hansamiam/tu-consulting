/**
 * DiscoverEntranceGate
 *
 * One-shot entrance animation that plays when the user lands on
 * /discover for the first time in a session.
 *
 * 2026-05-10 rebuild — the previous 1.4s version felt abrupt + not
 * premium. This pass slows the whole sequence to ~2.6s, layers in:
 *   1. A wordmark that fades in BEFORE the gates start moving (the
 *      moment lands as deliberate, not jumpy)
 *   2. Two staged glow blooms (a small inner one as the seam cracks,
 *      a larger outer one as the gates clear) so the light feels like
 *      it's coming THROUGH the gap, not just appearing
 *   3. A "content rise" pane behind the gates — a soft cream/card
 *      gradient that floats up from below as the halves part, so the
 *      database visually emerges into view rather than just appearing
 *      after the gates leave. Matches the user's "have the database
 *      float up when opened" ask.
 *   4. Slower, smoother easing curves and longer overlap between
 *      stages so motion never feels mechanical.
 *
 * Suppression rules unchanged:
 *   · sessionStorage gate to prevent re-trigger in the same tab
 *   · prefers-reduced-motion: reduce skips the animation entirely
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "topuni-discover-entrance-played";

// Premium pacing — 2.6s total. The Apple-grade "open window" feel
// requires the user to perceive distinct beats: 1) wordmark settles,
// 2) seam cracks open, 3) content rises into the frame as the gates
// clear. Faster than this reads as a transition; slower drags.
const SEQUENCE_MS = 2600;

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
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
        aria-hidden
      >
        {/* Content-rise pane — cream/card-coloured gradient sitting
            BEHIND everything, rising from below as the gates clear.
            User reads it as the database itself emerging into view.
            Subtle gold-tinted vignette so the rise has warmth without
            looking like a separate panel. */}
        <motion.div
          initial={{ y: "18%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg,
              hsl(var(--background)) 0%,
              hsl(var(--background)) 60%,
              hsl(var(--card)) 100%)`,
          }}
        >
          {/* Faint gold vignette across the rising pane — adds the
              "premium" warmth the user asked for. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at center, hsl(var(--gold) / 0.10) 0%, transparent 55%)",
            }}
          />
        </motion.div>

        {/* Inner glow — small bloom right at the seam as the crack
            opens. Subtle, fast, signals "light is coming through". */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.55, 0], scale: [0.5, 1.0, 1.4] }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], times: [0, 0.55, 1], delay: 0.55 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28vw] h-[28vw] max-w-[340px] max-h-[340px] rounded-full"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--gold) / 0.7) 0%, hsl(var(--gold) / 0.25) 40%, transparent 70%)",
            filter: "blur(6px)",
          }}
        />

        {/* Outer glow — larger, slower bloom that crescendos as the
            gates fully clear. This is what gives the "warm light
            spilling out" sensation rather than a flat reveal. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.45, 0], scale: [0.7, 1.6, 2.4] }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], times: [0, 0.5, 1], delay: 0.85 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[820px] max-h-[820px] rounded-full"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--gold) / 0.4) 0%, hsl(var(--gold) / 0.12) 35%, transparent 65%)",
            filter: "blur(12px)",
          }}
        />

        {/* Wordmark — settles in BEFORE the gates start moving so the
            moment reads deliberate. Stays through the seam reveal,
            then gracefully fades + drifts up as the gates clear. */}
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: [0, 1, 1, 0], y: [14, 0, -2, -10], scale: [0.96, 1, 1, 0.99] }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1], times: [0, 0.22, 0.6, 1] }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.36em] text-gold-light/90 mb-3">
            TopUni
          </p>
          <p className="font-heading text-4xl sm:text-6xl font-bold tracking-[-0.025em] text-gold-light drop-shadow-[0_0_24px_hsl(var(--gold)/0.55)]">
            Discover
          </p>
          {/* Quiet sub-line that lands during the held-still beat.
              Adds editorial weight without competing with the wordmark. */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 0.7, 0], y: [6, 0, -4] }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], times: [0, 0.5, 1], delay: 0.55 }}
            className="text-[10px] sm:text-xs font-medium tracking-[0.24em] uppercase text-primary-foreground/55 mt-4"
          >
            Verified scholarships · ranked for you
          </motion.p>
        </motion.div>

        {/* Left gate half — slower close-to-open transition with a
            sharper-anticipation easing curve so the start feels held
            and the end glides. */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "-104%" }}
          transition={{ duration: 1.6, ease: [0.65, 0, 0.18, 1], delay: 0.55 }}
          className="absolute left-0 top-0 h-full w-1/2 origin-right"
          style={{
            backgroundImage:
              "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 88%, hsl(var(--gold) / 0.42) 100%)",
            boxShadow: "10px 0 48px -6px hsl(var(--gold) / 0.45)",
          }}
        />
        {/* Right gate half */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "104%" }}
          transition={{ duration: 1.6, ease: [0.65, 0, 0.18, 1], delay: 0.55 }}
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
