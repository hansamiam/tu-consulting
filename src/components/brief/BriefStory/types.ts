/**
 * BriefStory — local types for the Wrapped-style story deck.
 * Maps the v6/v7 BriefSections payload into the shapes each slide
 * consumes. Designer handoff at ~/Downloads/Top Uni AI/.
 */
import type {
  BriefSections,
  CountryBucket,
  EssaySeed,
  GapEntry,
  MondayMove,
} from "../types";

// StoryVariant retired 2026-05-25 — the Editorial/Bold/Quiet picker
// was an internal design exploration, never meant to ship as a
// user-facing tab. We ship one quiet, magazine-style layout.

export interface StudentMeta {
  firstName: string;
  lastName: string;
  /** "11th grade" — already-formatted, ready to render. */
  gradeLabel?: string;
  /** "Almaty" — city or country fallback. */
  city?: string;
  /** "CS & Philosophy" — comma- or amp-joined field/major. */
  field?: string;
  /** ISO date string the brief was generated at. */
  generatedAt?: string;
}

/** Sidebar funnel meta — uses derived numbers. */
export interface FunnelMeta {
  /** Total scholarships scanned (catalog size at brief-gen time). */
  from: number;
  /** Number that matched the profile. */
  to: number;
  /** Number of distinct target countries. */
  countries: number;
  /** "$184K" style display string (sum of estimated values). */
  funding?: string;
}

/** Top-of-shortlist row on Slide 04. Pulled from the handoff payload's
 *  topMatches[0] when present, else the first bucket's first school. */
export interface TopMatch {
  /** Short brand or program identifier — "PPLE" / "MIT" / "Chevening". */
  short: string;
  /** "University of Amsterdam" — full institution name. */
  name: string;
  /** "Netherlands" — host country. */
  location?: string;
  /** Whole-number fit score 0–100, or undefined if not computed. */
  fit?: number;
  /** "Holland Scholarship · €5K" — funding line. */
  funding?: string;
  /** "Jan 15, 2027" — deadline display. */
  deadline?: string;
}

/** Country row on Slide 04. */
export interface CountryRow {
  flag: string;
  name: string;
  count: number;
  /** "PPLE · UCU" — comma- or middot-joined school shortlist. */
  anchors?: string;
  /** "Target" / "Reach" / "Safety" — short verdict pill. */
  note?: string;
}

/** Compiled props the orchestrator passes down to slides. */
export interface StoryData {
  student: StudentMeta;
  cover: {
    intro: string;
    promise: string;
  };
  archetype?: {
    name: string;
    tagline?: string;
    body?: string;
    confidence?: number;
  };
  stand?: {
    headline?: string;
    body?: string;
    pullquote?: string;
  };
  funnel?: FunnelMeta;
  topMatch?: TopMatch;
  countries?: CountryRow[];
  essay?: {
    pre?: string;
    closer?: string;
    body?: string;
  };
  block?: {
    headline?: string;
    body?: string;
    items: Array<{ priority: "high" | "medium"; title: string; action: string }>;
  };
  mondayMove?: {
    headline?: string;
    sub?: string;
    body?: string;
    duration?: string;
  };
}

export interface BriefStoryProps {
  /** The streamed/cached brief payload. */
  sections: BriefSections;
  /** Student profile data — pulled from the saved wizard input. */
  student: StudentMeta;
  /** Optional override of the funnel numbers when known from the
   *  generation context (e.g. handoff payload). */
  funnel?: FunnelMeta;
  /** Optional override of the top match. */
  topMatch?: TopMatch;
  /** Stream-mode loading state — when true, render a soft skeleton until
   *  the first section arrives. */
  loading?: boolean;
  /** Stream-mode error from the parent. */
  error?: string | null;
}

// Re-exports so slide components only import from this module.
export type { BriefSections, CountryBucket, EssaySeed, GapEntry, MondayMove };
