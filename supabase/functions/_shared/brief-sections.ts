/**
 * Brief section specs — v6 (magazine redesign).
 *
 * Six journey sections that each produce a STRUCTURED JSON payload
 * (not markdown). The renderer in src/components/brief/* owns 100%
 * of visual choices; this file just orchestrates one LLM call per
 * section and validates the JSON shape.
 *
 * Journey order:
 *   01 whereYouStand      — current profile interpreted, sets the thesis
 *   02 whereYouCanLand    — 3 schools (reach / target / safety)
 *   03 howYoullPay        — 3-5 scholarships ordered by deadline
 *   04 whatToWrite        — 3 essay angles
 *   05 whatsBlockingYou   — 2-3 gaps with priority + action
 *   06 whatToDoThisMonth  — 4-week plan with checkable tasks
 *
 * Each section streams as one complete `data: {section, payload}` SSE
 * event. The renderer fills its block as soon as that event arrives;
 * sections not yet streamed render as skeletons in journey position.
 *
 * Validators check JSON keys + entry counts. A failure triggers ONE
 * regen with a stricter prompt; if regen also fails we keep the first
 * attempt and move on (degrading > blocking the whole brief).
 *
 * The four legacy v5 specs (careerRoi, visa, monthlyBudget, finalWord)
 * were retired in the 2026-05-10 cull; the v5 list (positioning,
 * shortlist, fundingPathway, essays, honestGaps) is retired here. If
 * you need them back, dig through git history at this file's prior rev.
 */

export interface BriefContext {
  /** Pre-built context block: retrieved scholarships + universities. */
  dbContext: string;
  /** Profile payload from the wizard (or wizard + Pro depth fields). */
  profile: {
    fullName?: string;
    nationality?: string;
    gpa?: string | number | null;
    gpaScale?: string | number | null;
    ielts?: string | number | null;
    sat?: string | number | null;
    gradeLevel?: string;
    targetCountries?: string[];
    major?: string;
    budget?: string;
    scholarshipNeeded?: string;
    timeline?: string;
    prestige?: number;
    scholarship?: number;
    careerRoi?: number;
    visaAccess?: number;
    locationPref?: number;
    topActivity?: string;
    personalStory?: string;
    namedSchools?: string;
  };
  /** "English" or "Russian". */
  lang: string;
  audienceLine: string;
}

export interface ValidatorResult {
  ok: boolean;
  reason?: string;
}

export interface SectionSpec {
  /** Identifier — used in logs, SSE event payloads, renderer mapping. */
  id: string;
  /** Display heading the renderer surfaces. NOT used by the LLM in
   *  the new JSON-mode flow — the LLM emits the heading in its `headline`
   *  payload key. Kept here so the renderer + section list stay in
   *  sync at a glance. */
  heading: string;
  /** Build the focused user-prompt for this section. */
  buildPrompt: (ctx: BriefContext) => string;
  /** JSON shape validator — parse + key + count checks. */
  validate?: (rawJson: string, ctx: BriefContext) => ValidatorResult;
  /** Reasoning effort for premium-tier model calls. */
  reasoning?: { effort: "low" | "medium" | "high" };
}

import { EDITORIAL_RULES } from "./editorial-rules.ts";

const SHARED_JSON_RULES = `
${EDITORIAL_RULES}

OUTPUT FORMAT — STRICT:
- Output ONLY a single JSON object matching the schema below.
- No markdown fences, no preamble, no trailing prose.
- Every required key MUST be present. If you would emit generic copy
  ("write a strong essay", "pursue your dreams", "leverage your strengths"),
  OMIT that optional key instead. Empty arrays/strings beat platitudes.
- Strings use plain text. No markdown bold, italics, headers, or bullets
  inside string values — those belong in the renderer, not the data.`;

const profileBlock = (ctx: BriefContext): string => {
  const p = ctx.profile;
  const pf = (v: unknown, fallback: string): string => {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    return s.length > 0 ? s : fallback;
  };
  const targets = (p.targetCountries ?? []).filter(Boolean).join(", ") || "Open";
  const gpaScale = pf(p.gpaScale, "");
  const lines = [
    `- Name: ${pf(p.fullName, "—")}`,
    `- GPA: ${pf(p.gpa, "—")}${gpaScale ? ` / ${gpaScale}` : ""}`,
    `- IELTS: ${pf(p.ielts, "Not taken")}`,
    `- SAT: ${pf(p.sat, "Not taken")}`,
    `- Grade level: ${pf(p.gradeLevel, "—")}`,
    `- Target countries: ${targets}`,
    `- Intended major: ${pf(p.major, "Undecided")}`,
    `- Budget: ${pf(p.budget, "Unspecified")}`,
    `- Needs scholarship: ${pf(p.scholarshipNeeded, "—")}`,
    `- Timeline: ${pf(p.timeline, "Flexible")}`,
  ];
  if (p.prestige != null) lines.push(`- Priorities (1-5): Prestige ${p.prestige}, Scholarship ${p.scholarship}, Career ROI ${p.careerRoi}, Visa ${p.visaAccess}, Location ${p.locationPref}`);
  if (pf(p.topActivity, ""))   lines.push(`- Top activity / achievement: ${p.topActivity}`);
  if (pf(p.personalStory, "")) lines.push(`- Personal story (their own words): ${p.personalStory}`);
  if (pf(p.namedSchools, ""))  lines.push(`- Specific schools on their list: ${p.namedSchools}`);
  return lines.join("\n");
};

const dbBlock = (ctx: BriefContext): string => ctx.dbContext;

/** Parse helper — returns the parsed object or null if not valid JSON. */
const tryParse = (raw: string): unknown | null => {
  try { return JSON.parse(raw); } catch { return null; }
};

/* ─── Section specs (journey order) ──────────────────────────────────── */

/* 01 — Where You Stand */
const whereYouStand: SectionSpec = {
  id: "whereYouStand",
  heading: "Where you stand",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing the OPENING section of a personalized admissions strategy
brief, in the voice of a real admissions counselor talking to ${ctx.audienceLine}.
This section interprets WHO THIS STUDENT IS right now — what their profile
reads like to admissions readers, what they have going for them, what's
under-leveraged. It sets the thesis the rest of the brief argues.

STUDENT PROFILE:
${profileBlock(ctx)}

LIVE CONTEXT (cohort + matched programs for your reference):
${dbBlock(ctx)}

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "01 · Where you stand",
  "headline": "string — a 4-8 word display title that captures the thesis. NOT generic ('Your strong start') — specific to this student ('A policy-leaning STEM profile') ",
  "lead": "string — ONE sentence (max ~30 words) that anchors the brief. This sentence gets a drop cap in the renderer, so the FIRST WORD should be punchy and concrete. NAME the student's positioning in one breath.",
  "body": "string — 2-3 short paragraphs (separate with \\n\\n) interpreting their profile. What admissions officers see at first glance. What's the under-leveraged angle. What competitive band they're in. No platitudes, no superlatives.",
  "pullquote": "string — ONE sentence framed as a directive call. Pattern: 'Your 30-day call: <single concrete action>'. The action must be measurable and shippable in ≤30 days. Example: 'Your 30-day call: publish one 1500-word analysis of an open data set in your major — public link, GitHub or Medium.'"
}

${SHARED_JSON_RULES}`,
  validate: (raw) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    for (const k of ["kicker","headline","lead","body","pullquote"]) {
      const v = obj[k];
      if (typeof v !== "string" || v.trim().length < 10) {
        return { ok: false, reason: `missing or too short: ${k}` };
      }
    }
    if (!/30[- ]day/i.test(obj.pullquote as string)) {
      return { ok: false, reason: "pullquote missing '30-day call' framing" };
    }
    return { ok: true };
  },
};

/* 02 — Where You Can Land */
const whereYouCanLand: SectionSpec = {
  id: "whereYouCanLand",
  heading: "Where you can land",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing the SCHOOLS section — naming EXACTLY 3 universities this
student should put on their list. One reach, one target, one safety.
Pulled from the LIVE CONTEXT below; do not invent schools.

STUDENT PROFILE:
${profileBlock(ctx)}

LIVE CONTEXT (use these schools — pick from the matched list):
${dbBlock(ctx)}

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "02 · Where you can land",
  "headline": "string — 4-8 word display line tying these 3 schools to the student's thesis. Example: 'Three doors into U.S. policy graduate work.'",
  "lead": "string — ONE sentence (max ~30 words) framing why THIS particular trio fits the student. Drop-cap rendered.",
  "entries": [
    {
      "tier": "reach",
      "name": "string — exact school name as in LIVE CONTEXT",
      "country": "string — short country name",
      "whyItFits": "string — 1 sentence naming the SPECIFIC reason this school matches this student. Cite the angle. NOT 'great fit' or 'strong program' — name what.",
      "threshold": "string — 1 line summarising the admission bar: 'GPA 3.8+ · IELTS 7.5 · top-2% class rank' or 'Acceptance rate ~7%'. Use real numbers from context where present.",
      "careerAnchor": "string — 1 line naming WHO hires graduates / where alumni go. Real names beat categories. Example: 'McKinsey, Goldman, IMF; ~60% finance/consulting'."
    },
    { "tier": "target", ... same shape ... },
    { "tier": "safety", ... same shape ... }
  ]
}

EXACTLY 3 entries in order: reach, target, safety.

${SHARED_JSON_RULES}`,
  validate: (raw) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const entries = obj.entries as unknown[] | undefined;
    if (!Array.isArray(entries) || entries.length !== 3) {
      return { ok: false, reason: "entries must be array of length 3" };
    }
    const tiers = entries.map((e) => (e as { tier?: string }).tier);
    if (!tiers.includes("reach") || !tiers.includes("target") || !tiers.includes("safety")) {
      return { ok: false, reason: "entries must include reach + target + safety tiers" };
    }
    return { ok: true };
  },
};

/* 03 — How You'll Pay */
const howYoullPay: SectionSpec = {
  id: "howYoullPay",
  heading: "How you'll pay",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing the FUNDING section — 3 to 5 scholarships ranked by best-
fit-for-this-student × urgency. Pull from LIVE CONTEXT only; do not
invent. Order by application_deadline ASCENDING (closest deadline first).

STUDENT PROFILE:
${profileBlock(ctx)}

LIVE CONTEXT (use these scholarships):
${dbBlock(ctx)}

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "03 · How you'll pay",
  "headline": "string — 4-8 word display line capturing the funding strategy. Example: 'Stack three awards, cover four years.'",
  "lead": "string — ONE sentence (max ~30 words) framing the funding picture for this student. Drop-cap rendered.",
  "entries": [
    {
      "name": "string — exact scholarship name from LIVE CONTEXT",
      "coverage": "string — short coverage label: 'Full ride' | 'Tuition only' | 'Stipend' | 'Partial' | 'Travel grant' | 'Research funding'",
      "awardText": "string — short award value: '$50K/year' or '~$310K total' or 'Full tuition + stipend'",
      "deadline": "string — ISO date YYYY-MM-DD, or 'Rolling', or 'TBA'",
      "howProfileMaps": "string — 1-2 sentences naming the SPECIFIC profile elements this student should lead with on this application. Cite the angle. Skip generic 'strong applicants'.",
      "firstTask": "string — ONE concrete action they should take FIRST this week. Example: 'Request the supervisor letter from Prof. Chen — 4-week lead time.'"
    },
    ... 3 to 5 entries total ...
  ],
  "stackingNote": "string — 1-2 sentences explaining how these awards combine (or compete) for THIS student. Pattern: 'These three are stackable; together they'd cover X. The fourth is mutually exclusive with the first because both restrict to Y.' Skip if there's no real stacking insight."
}

${SHARED_JSON_RULES}`,
  validate: (raw) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const entries = obj.entries as unknown[] | undefined;
    if (!Array.isArray(entries) || entries.length < 3 || entries.length > 5) {
      return { ok: false, reason: "entries must be array of 3-5" };
    }
    return { ok: true };
  },
};

/* 04 — What to Write */
const whatToWrite: SectionSpec = {
  id: "whatToWrite",
  heading: "What to write",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing the ESSAYS section — EXACTLY 3 distinct essay angles this
student could lead with. Each angle pulls from a different part of their
profile so the brief surfaces multiple compelling stories, not one
overused thread.

STUDENT PROFILE:
${profileBlock(ctx)}

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "04 · What to write",
  "headline": "string — 4-8 word display line. Example: 'Three stories the reader hasn't heard yet.'",
  "lead": "string — ONE sentence (max ~30 words) framing the essay strategy. Drop-cap rendered.",
  "entries": [
    {
      "title": "string — short evocative angle title, max 6 words. Example: 'The civic-tech bridge' or 'Quiet builder, loud results'.",
      "whyItWorks": "string — 1-2 sentences naming WHY this angle resonates with admissions readers at the schools in section 02. Specific: 'Cambridge values measurable civic impact over scale of audience'.",
      "anchorItWith": "string — 1 sentence naming the ONE concrete moment/project/datum this essay should center on. Pulled from the student's profile.",
      "playsBestTo": "string — 1 sentence naming WHICH school(s) / scholarship(s) this angle plays best to. Specific names, not 'top schools'."
    },
    ... 3 entries total ...
  ]
}

${SHARED_JSON_RULES}`,
  validate: (raw) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const entries = obj.entries as unknown[] | undefined;
    if (!Array.isArray(entries) || entries.length !== 3) {
      return { ok: false, reason: "entries must be exactly 3 angles" };
    }
    return { ok: true };
  },
};

/* 05 — What's Blocking You */
const whatsBlockingYou: SectionSpec = {
  id: "whatsBlockingYou",
  heading: "What's blocking you",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing the GAPS section — 2 to 3 HONEST gaps in this student's
profile that need closing before they apply. Be a coach, not a cheerleader.
If everything is on track, OMIT the section by emitting an empty entries
array — the renderer handles that gracefully.

STUDENT PROFILE:
${profileBlock(ctx)}

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "05 · What's blocking you",
  "headline": "string — 4-8 word display line. Example: 'Two gaps to close before October.'",
  "lead": "string — ONE sentence (max ~30 words) framing the gaps work honestly. Drop-cap rendered.",
  "entries": [
    {
      "priority": "high" | "medium",
      "title": "string — short gap title, max 8 words. Example: 'Test-score ceiling for top-3 reach'.",
      "whyItMatters": "string — 1-2 sentences naming the SPECIFIC consequence if unaddressed. Not 'might hurt your chances' — name what.",
      "actionThisMonth": "string — ONE concrete action they should take THIS MONTH. Should fit in 30 days.",
      "next60Days": "string — 1 sentence describing the follow-through over the next 60 days."
    },
    ... 0 to 3 entries total ...
  ]
}

${SHARED_JSON_RULES}`,
  validate: (raw) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const entries = obj.entries as unknown[] | undefined;
    if (!Array.isArray(entries)) return { ok: false, reason: "entries must be array" };
    if (entries.length > 3) return { ok: false, reason: "max 3 gap entries" };
    return { ok: true };
  },
};

/* 06 — What to Do This Month */
const whatToDoThisMonth: SectionSpec = {
  id: "whatToDoThisMonth",
  heading: "What to do this month",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing the CLOSING section — a concrete 4-week action plan. This
is the brief's payoff: the student should finish reading knowing exactly
what to do tomorrow. Each week has a focus + 3-5 specific tasks.

STUDENT PROFILE:
${profileBlock(ctx)}

CONTEXT REFERENCES — pull task specifics from the schools/scholarships/
gaps in earlier sections so the plan is grounded, not generic:
${dbBlock(ctx)}

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "06 · What to do this month",
  "headline": "string — 4-8 word display line. Example: 'Your next 28 days, mapped.'",
  "lead": "string — ONE sentence (max ~30 words) framing the plan. Drop-cap rendered.",
  "weeks": [
    {
      "label": "Week 1",
      "focus": "string — ONE sentence naming the week's focus. Example: 'Start the recommender pipeline + draft your strongest essay angle.'",
      "tasks": [
        "string — 1 specific actionable task, ≤14 words, present-tense imperative",
        "...3-5 tasks per week..."
      ]
    },
    { "label": "Week 2", ... },
    { "label": "Week 3", ... },
    { "label": "Week 4", ... }
  ],
  "closingLine": "string — ONE final sentence of momentum. Quiet confidence, not hype. Example: 'Ship Week 1 and the rest follows.'"
}

EXACTLY 4 weeks. Each week MUST have 3-5 tasks.

${SHARED_JSON_RULES}`,
  validate: (raw) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const weeks = obj.weeks as unknown[] | undefined;
    if (!Array.isArray(weeks) || weeks.length !== 4) {
      return { ok: false, reason: "weeks must be array of length 4" };
    }
    for (const w of weeks) {
      const tasks = (w as { tasks?: unknown[] }).tasks;
      if (!Array.isArray(tasks) || tasks.length < 3 || tasks.length > 5) {
        return { ok: false, reason: "each week must have 3-5 tasks" };
      }
    }
    return { ok: true };
  },
};

export const PREMIUM_SECTIONS: SectionSpec[] = [
  whereYouStand,
  whereYouCanLand,
  howYoullPay,
  whatToWrite,
  whatsBlockingYou,
  whatToDoThisMonth,
];

export function buildRegenPrompt(spec: SectionSpec, ctx: BriefContext, reason: string): string {
  return `${spec.buildPrompt(ctx)}

YOUR PREVIOUS ATTEMPT FAILED VALIDATION: ${reason}

Re-emit the JSON object meeting every constraint above. Output ONLY the
JSON. No fences, no preamble.`;
}
