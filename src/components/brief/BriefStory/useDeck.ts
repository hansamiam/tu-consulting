/**
 * useDeck — state machine for the story-deck nav.
 * Handles slide index, autoplay timing, keyboard nav, and progress-
 * segment fill via requestAnimationFrame.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const AUTOPLAY_MS_PER_SLIDE = 6500;

interface UseDeckOptions {
  total: number;
  /** Initial slide index. Defaults to 0. */
  initial?: number;
  /** When true, the deck starts paused. Defaults to false (autoplay). */
  startPaused?: boolean;
}

interface DeckApi {
  active: number;
  playing: boolean;
  /** 0–100 fill % for the ACTIVE segment. Earlier segments are at 100;
   *  later ones at 0. The progress bar uses this to animate the
   *  currently-playing segment. */
  segmentFill: number;
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
  toggle: () => void;
  restart: () => void;
}

export const useDeck = ({ total, initial = 0, startPaused = false }: UseDeckOptions): DeckApi => {
  const [active, setActive] = useState(Math.max(0, Math.min(initial, Math.max(0, total - 1))));
  const [playing, setPlaying] = useState(!startPaused);
  const [segmentFill, setSegmentFill] = useState(0);

  // requestAnimationFrame tick — fills the active segment in real time.
  // Pauses cleanly when `playing` flips false. Resets at the bottom of
  // each segment so a re-visit doesn't pick up at the old %.
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startTimeRef.current = null;
      return;
    }
    startTimeRef.current = performance.now();
    setSegmentFill(0);

    const tick = (now: number) => {
      if (startTimeRef.current === null) return;
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(100, (elapsed / AUTOPLAY_MS_PER_SLIDE) * 100);
      setSegmentFill(pct);
      if (pct >= 100) {
        // Advance — but stop at the end (don't loop).
        setActive((i) => {
          if (i + 1 >= total) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, active, total]);

  const goTo = useCallback((i: number) => {
    setActive(Math.max(0, Math.min(i, total - 1)));
  }, [total]);

  const next = useCallback(() => {
    setActive((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const prev = useCallback(() => {
    setActive((i) => Math.max(i - 1, 0));
  }, []);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const restart = useCallback(() => {
    setActive(0);
    setPlaying(false);
  }, []);

  // Keyboard nav. Skip when an input is focused so users typing don't
  // accidentally page through the deck.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return { active, playing, segmentFill, goTo, next, prev, toggle, restart };
};
