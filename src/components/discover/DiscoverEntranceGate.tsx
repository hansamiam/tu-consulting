/**
 * DiscoverEntranceGate
 *
 * One-shot entrance animation that plays when the user lands on
 * /discover for the first time in a session. Two navy gate halves
 * slide apart and a gold glow blooms in the gap; the whole thing
 * fades out after ~1.4s and unmounts.
 *
 * Why a separate component: the animation needs its own framer-motion
 * lifecycle and full-screen z-index without leaking transforms into
 * Discover's layout. Self-contained — drop into the top of Discover's
 * render and it manages its own visibility.
 *
 * Suppression rules:
 *   · `sessionStorage["topuni-discover-entrance-played"]` blocks
 *     re-trigger within the same tab session (refresh resets, full
 *     close+reopen also resets — that's fine, fresh session = fresh
 *     entrance)
 *   · `prefers-reduced-motion: reduce` skips the animation entirely
 *     (renders nothing) — accessibility guard.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "topuni-discover-entrance-played";

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
    const timer = window.setTimeout(() => setActive(false), 1400);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="discover-gate"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
        aria-hidden
      >
        {/* Gold glow that blooms at the seam — pops out as the gates
            split open. Sits behind the gate halves so the gap reveals
            it. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.85, 0], scale: [0.6, 1.6, 2.2] }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], times: [0, 0.55, 1] }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--gold) / 0.55) 0%, hsl(var(--gold) / 0.18) 30%, transparent 65%)",
            filter: "blur(8px)",
          }}
        />

        {/* Wordmark — sits behind the gates so it's only visible
            during the seam reveal. Gold lettering on the cracked seam,
            fades fast as the halves fully clear. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: [0, 1, 0], y: [8, 0, -4] }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-light mb-2">
            TopUni
          </p>
          <p className="font-heading text-3xl sm:text-5xl font-bold tracking-[-0.025em] text-gold-light drop-shadow-[0_0_18px_hsl(var(--gold)/0.5)]">
            Discover
          </p>
        </motion.div>

        {/* Left gate half */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "-105%" }}
          transition={{ duration: 1.1, ease: [0.7, 0, 0.16, 1], delay: 0.18 }}
          className="absolute left-0 top-0 h-full w-1/2 origin-right"
          style={{
            backgroundImage:
              "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 88%, hsl(var(--gold) / 0.35) 100%)",
            boxShadow: "8px 0 32px -4px hsl(var(--gold) / 0.35)",
          }}
        />
        {/* Right gate half */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: "105%" }}
          transition={{ duration: 1.1, ease: [0.7, 0, 0.16, 1], delay: 0.18 }}
          className="absolute right-0 top-0 h-full w-1/2 origin-left"
          style={{
            backgroundImage:
              "linear-gradient(270deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 88%, hsl(var(--gold) / 0.35) 100%)",
            boxShadow: "-8px 0 32px -4px hsl(var(--gold) / 0.35)",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
