/**
 * Brief v6 magazine payload types — mirrors the JSON shapes produced
 * by supabase/functions/_shared/brief-sections.ts.
 *
 * Keep in sync with that file. Both ends are duck-typed at runtime
 * (the renderer falls back gracefully on missing keys), but these
 * types catch most mistakes at compile time.
 */

export type SectionId =
  /** v7 Phase 2: the archetype hook card. Emitted first by the
   *  topuni-ai-pathway when the pre-plan call resolves; renders
   *  above the 5 substantive sections. Payload is
   *  ArchetypePayload (below) — name + tagline + color come from
   *  the closed library (archetype-library.ts) on the server. */
  | "archetype"
  | "whereYouStand"
  | "whereYouCanLand"
  | "howYoullPay"
  | "whatToWrite"
  | "whatsBlockingYou"
  | "whatToDoThisMonth"
  /** v7 Phase 3 stage-2: brief → Discover handoff card. Emitted
   *  LAST in the SSE stream after the 6 section events. Payload
   *  is HandoffPayload — archetype id + country buckets + 3 live
   *  matched scholarships. Replaces the generic NextStepsCard at
   *  the tail of the brief. */
  | "handoff";

export const SECTION_ORDER: SectionId[] = [
  "archetype",
  "whereYouStand",
  "whereYouCanLand",
  "howYoullPay",
  "whatToWrite",
  "whatsBlockingYou",
  "whatToDoThisMonth",
  "handoff",
];

export const SECTION_KICKERS: Record<SectionId, string> = {
  archetype: "00 · Your archetype",
  whereYouStand: "01 · Where you stand",
  whereYouCanLand: "02 · Where you can land",
  howYoullPay: "03 · How you'll pay",
  whatToWrite: "04 · What to write",
  whatsBlockingYou: "05 · What's blocking you",
  whatToDoThisMonth: "06 · What to do this month",
  handoff: "07 · What's next",
};

interface SectionCommon {
  kicker?: string;
  headline?: string;
  lead?: string;
}

export interface WhereYouStandPayload extends SectionCommon {
  body?: string;
  pullquote?: string;
}

export interface SchoolEntry {
  tier: "reach" | "target" | "safety";
  name: string;
  country?: string;
  whyItFits?: string;
  threshold?: string;
  careerAnchor?: string;
}

/** v7 Phase 3 (#13 part 2): country-bucket replacement for the
 *  reach/target/safety shape. Each bucket names a destination
 *  country with 1-3 schools and a one-line lore line per school
 *  (who thrives there, what the campus rhythm is). The prompt's
 *  pile-contrast and visa-realism logic produces these directly
 *  off the intake's targetCountries — no reach/target/safety
 *  language anywhere in the prose. */
export interface CountryBucketSchool {
  /** Exact school name from the universities DB. */
  name: string;
  /** 1 sentence — the school's PERSONALITY for this student.
   *  Grounded in this student's identity claim + pile contrast. */
  lore?: string;
}

export interface CountryBucket {
  /** Short country name. */
  country: string;
  /** Optional comma-separated city anchors. */
  cities?: string;
  schools: CountryBucketSchool[];
}

export interface WhereYouCanLandPayload extends SectionCommon {
  /** Legacy v6 shape — reach/target/safety entries. Kept optional
   *  so cached briefs render via the fallback path while their
   *  cache row drifts out within ~7 days. New v7 prompts produce
   *  `buckets` instead. */
  entries?: SchoolEntry[];
  /** v7 shape — 1-3 country buckets, each with 1-3 schools. */
  buckets?: CountryBucket[];
}

/* 2026-05-18: Repurposed. Was per-scholarship row. Now a funding-LANE
   row (govt scholarship, university merit, fellowship, etc.) since the
   brief no longer lists specific awards — the live database at
   /discover is the source of truth and updates daily. We kept the
   field names so cached briefs still render. */
export interface ScholarshipEntry {
  /** Funding lane / category label. e.g. "Government scholarships",
   *  "University merit aid", "Research fellowship". */
  name: string;
  /** Typical coverage label. e.g. "Full tuition + stipend". */
  coverage?: string;
  /** Typical award range. e.g. "$30K-50K / year". */
  awardText?: string;
  /** Typical cycle window. e.g. "Fall cycle (Oct-Jan)", "Rolling". */
  deadline?: string;
  /** Why this LANE fits THIS student's profile. */
  howProfileMaps?: string;
  /** First step to start applying within this lane. */
  firstTask?: string;
}

export interface HowYoullPayPayload extends SectionCommon {
  entries?: ScholarshipEntry[];
  stackingNote?: string;
  /** CTA copy directing the student to /discover for their live
   *  personalized match list. */
  discoverCallout?: string;
}

export interface EssayEntry {
  title: string;
  whyItWorks?: string;
  anchorItWith?: string;
  playsBestTo?: string;
}

/** v7 Phase 3 (#13 part 2): essay-seed replacement for the
 *  three-angles shape. The prompt produces a SINGLE primary
 *  seed in speculative tense. */
export interface EssaySeed {
  /** 1 sentence display title for the seed. */
  title?: string;
  /** 3-5 sentences in speculative tense ("sometime in the last
   *  two years...", "maybe X, maybe Y..."). The student finds the
   *  moment; the brief names where to look. */
  body: string;
  /** Imperative-with-permission closer. Names where the essay
   *  starts; does not coerce. */
  closer?: string;
}

export interface WhatToWritePayload extends SectionCommon {
  /** Legacy v6 shape — 3 essay angles. Kept optional for cache
   *  compat. */
  entries?: EssayEntry[];
  /** v7 shape — 1 primary essay seed in speculative tense. */
  essaySeed?: EssaySeed;
}

export interface GapEntry {
  priority: "high" | "medium";
  title: string;
  whyItMatters?: string;
  actionThisMonth?: string;
  next60Days?: string;
}

export interface WhatsBlockingYouPayload extends SectionCommon {
  entries?: GapEntry[];
}

export interface WeekBlock {
  label: string;
  focus?: string;
  tasks?: string[];
}

/** v7 Phase 3 (#13 part 2): Monday Move replacement for the
 *  4-week-plan shape. The brief ends on ONE concrete artifact-
 *  building task, not a 4-week schedule. */
export interface MondayMove {
  /** 1 sentence verb-led headline ("Open a Google Doc titled X").
   *  Mirrors the section's main headline but kept as its own
   *  field so the renderer can emphasize it without re-deriving. */
  headline?: string;
  /** 3-5 sentences explaining the move, anchored to Cards 02-03,
   *  with at least one explicit low-bar permission phrase
   *  ("don't polish" / "just list" / "stop when you have three"). */
  body: string;
  /** 1 sentence in "Once X exists, Y starts" pattern. */
  closer?: string;
}

export interface WhatToDoThisMonthPayload extends SectionCommon {
  /** Legacy v6 shape — 4-week schedule. Kept optional for cache compat. */
  weeks?: WeekBlock[];
  /** Legacy v6 closing line. Optional. */
  closingLine?: string;
  /** v7 shape — ONE Monday move. */
  mondayMove?: MondayMove;
}

/** v7 Phase 2: the archetype-card payload streamed before any
 *  section event. Server populates name/tagline/color from the
 *  closed library lookup; the renderer never invents these or
 *  ships the library. Confidence is informational — when < 60
 *  the render can lean lighter on the identity claim. */
export interface ArchetypePayload {
  id: string;
  name: string;
  tagline: string;
  color: string;
  confidence?: number;
  reason?: string;
}

/** v7 Phase 3 stage-2: the brief → Discover handoff payload.
 *  Streamed as the LAST SSE event after every section completes.
 *  HandoffBridge.tsx consumes it: builds a personalized headline
 *  from buildHandoffHeadline(archetypeId, countryBuckets) and
 *  renders 3 ScholarshipPreview rows + an Open Discover CTA. */
export interface ScholarshipPreview {
  id: string;
  name: string;
  /** Short country name — used for the flag emoji + label. */
  country?: string;
  /** Display string for the award amount, e.g. "$50K / year". */
  awardText?: string;
  /** ISO date or YYYY-MM-DD; renderer computes "Deadline in N days". */
  deadlineISO?: string;
  /** Optional 1-sentence "why this fits you" pulled from the
   *  scholarship's why_this_fits column (or generated later). */
  fitNote?: string;
}

export interface HandoffPayload {
  /** Archetype id from the closed library — used to pick the
   *  headline template via buildHandoffHeadline(). */
  archetypeId?: string;
  /** Subset of intake.targetCountries from the brief plan. */
  countryBuckets?: string[];
  /** Up to 3 matched scholarships from the live DB. */
  topMatches?: ScholarshipPreview[];
}

export type AnySectionPayload =
  | ArchetypePayload
  | HandoffPayload
  | WhereYouStandPayload
  | WhereYouCanLandPayload
  | HowYoullPayPayload
  | WhatToWritePayload
  | WhatsBlockingYouPayload
  | WhatToDoThisMonthPayload;

export type BriefSections = Partial<{
  archetype: ArchetypePayload;
  whereYouStand: WhereYouStandPayload;
  whereYouCanLand: WhereYouCanLandPayload;
  howYoullPay: HowYoullPayPayload;
  whatToWrite: WhatToWritePayload;
  whatsBlockingYou: WhatsBlockingYouPayload;
  whatToDoThisMonth: WhatToDoThisMonthPayload;
  handoff: HandoffPayload;
}>;
