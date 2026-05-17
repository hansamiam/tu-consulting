/**
 * Brief v6 magazine payload types — mirrors the JSON shapes produced
 * by supabase/functions/_shared/brief-sections.ts.
 *
 * Keep in sync with that file. Both ends are duck-typed at runtime
 * (the renderer falls back gracefully on missing keys), but these
 * types catch most mistakes at compile time.
 */

export type SectionId =
  | "whereYouStand"
  | "whereYouCanLand"
  | "howYoullPay"
  | "whatToWrite"
  | "whatsBlockingYou"
  | "whatToDoThisMonth";

export const SECTION_ORDER: SectionId[] = [
  "whereYouStand",
  "whereYouCanLand",
  "howYoullPay",
  "whatToWrite",
  "whatsBlockingYou",
  "whatToDoThisMonth",
];

export const SECTION_KICKERS: Record<SectionId, string> = {
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

export interface ScholarshipEntry {
  name: string;
  coverage?: string;
  awardText?: string;
  /** ISO date YYYY-MM-DD, "Rolling", "TBA", or arbitrary string. */
  deadline?: string;
  howProfileMaps?: string;
  firstTask?: string;
}

export interface HowYoullPayPayload extends SectionCommon {
  entries?: ScholarshipEntry[];
  stackingNote?: string;
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

export type AnySectionPayload =
  | WhereYouStandPayload
  | WhereYouCanLandPayload
  | HowYoullPayPayload
  | WhatToWritePayload
  | WhatsBlockingYouPayload
  | WhatToDoThisMonthPayload;

export type BriefSections = Partial<{
  whereYouStand: WhereYouStandPayload;
  whereYouCanLand: WhereYouCanLandPayload;
  howYoullPay: HowYoullPayPayload;
  whatToWrite: WhatToWritePayload;
  whatsBlockingYou: WhatsBlockingYouPayload;
  whatToDoThisMonth: WhatToDoThisMonthPayload;
}>;
