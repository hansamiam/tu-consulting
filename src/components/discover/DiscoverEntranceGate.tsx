/**
 * DiscoverEntranceGate
 *
 * One-shot entrance animation that plays once per day per device
 * when the user lands on /discover.
 *
 * 2026-05-10 reworked again — the gates-parting-on-navy reveal felt
 * theatrical but redundant against the new dark TopUni AI intake
 * (a user crossing from intake → discover would see two consecutive
 * full-navy moments). Replaced with a float-up-from-nothing reveal:
 * transparent overlay → wordmark glows in from below, scaling up
 * from 0.92 → 1.0, with a soft gold halo that lifts behind it.
 * No solid backdrop — just a faint cream wash that lets the
 * Discover content underneath be partly visible from the start, so
 * the gate reads like the surface settling INTO place rather than
 * being unveiled from a curtain.
 *
 * Suppression rules unchanged:
 *   · localStorage 24h cooldown (one play per device per day)
 *   · prefers-reduced-motion: reduce skips entirely
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "topuni-discover-entrance-played-at";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// 2.4s total — shorter than the gates version (3.0s) because the
// motion is simpler. The wordmark holds for ~1.0s plateau, then
// dissolves while the halo glow continues rising for another 0.4s
// behind nothing — a quiet outro that lets the page settle.
const SEQUENCE_MS = 2400;

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
      const playedAtRaw = localStorage.getItem(STORAGE_KEY);
      if (playedAtRaw) {
        const playedAt = parseInt(playedAtRaw, 10);
        if (!Number.isNaN(playedAt) && Date.now() - playedAt < COOLDOWN_MS) return false;
      }
    } catch { /* ignore */ }
    return true;
  });

  useEffect(() => {
    if (!active) return;
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
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
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] pointer-events-none overflow-hidden flex items-center justify-center"
        aria-hidden
      >
        {/* Faint cream wash — translucent so the Discover surface
            underneath bleeds through from the start. The reveal isn't
            a curtain pulling open; it's the room itself catching
            light. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.3, 0] }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], times: [0, 0.4, 0.7, 1] }}
          className="absolute inset-0 bg-background"
        />

        {/* Soft gold halo — rises from below the wordmark, expanding
            outward as if a warm light source just lifted into the
            frame. Peaks behind the wordmark, then continues drifting
            up after the wordmark has dissolved (the outro shimmer). */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 60 }}
          animate={{ opacity: [0, 0.45, 0.25, 0], scale: [0.5, 1.1, 1.5, 1.8], y: [60, 0, -20, -50] }}
          transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1], times: [0, 0.4, 0.75, 1] }}
          className="absolute w-[60vw] h-[60vw] max-w-[720px] max-h-[720px] rounded-full"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--gold) / 0.45) 0%, hsl(var(--gold) / 0.14) 40%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />

        {/* Wordmark — lifts up from y=24 into place, scales 0.92→1.0,
            holds steady for ~1.0s, then dissolves upward. The
            "from nothing" feel: opacity starts at 0, no element bg,
            just text materialising in the air with a strong drop-
            shadow keeping it readable through the halo bloom. */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: [0, 1, 1, 0], y: [24, 0, 0, -12], scale: [0.92, 1, 1, 1.02] }}
          transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], times: [0, 0.28, 0.72, 1], delay: 0.3 }}
          className="relative flex flex-col items-center text-center px-6"
        >
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.36em] text-gold-dark mb-3">
            TopUni
          </p>
          <p className="font-heading text-4xl sm:text-6xl font-bold tracking-[-0.025em] text-foreground drop-shadow-[0_4px_30px_hsl(var(--gold)/0.35)]">
            Discover
          </p>
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: [0, 1, 1, 0] }}
            transition={{ duration: 1.7, ease: [0.16, 1, 0.3, 1], times: [0, 0.4, 0.78, 1], delay: 0.55 }}
            className="block h-px w-32 sm:w-44 bg-gradient-to-r from-transparent via-gold-dark to-transparent mt-5 origin-center"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], times: [0, 0.5, 1], delay: 0.7 }}
            className="text-[10px] sm:text-xs font-medium tracking-[0.24em] uppercase text-muted-foreground/85 mt-4"
          >
            Verified scholarships · ranked for you
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
