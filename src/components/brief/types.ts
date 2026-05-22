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
  | "whatToDoThisMonth";

export const SECTION_ORDER: SectionId[] = [
  "archetype",
  "whereYouStand",
  "whereYouCanLand",
  "howYoullPay",
  "whatToWrite",
  "whatsBlockingYou",
  "whatToDoThisMonth",
];

export const SECTION_KICKERS: Record<SectionId, string> = {
  archetype: "00 · Your archetype",
  whereYouStand: "01 · Where you stand",
  whereYouCanLand: "02 · Where you can land",
  howYoullPay: "03 · How you'll pay",
  whatToWrite: "04 · What to write",
  whatsBlockingYou: "05 · What's blocking you",
  whatToDoThisMonth: "06 · What to do this month",
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

export interface WhereYouCanLandPayload extends SectionCommon {
  entries?: SchoolEntry[];
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

export interface WhatToWritePayload extends SectionCommon {
  entries?: EssayEntry[];
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

export interface WhatToDoThisMonthPayload extends SectionCommon {
  weeks?: WeekBlock[];
  closingLine?: string;
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

export type AnySectionPayload =
  | ArchetypePayload
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
}>;
