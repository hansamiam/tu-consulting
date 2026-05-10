/**
 * Brief section specs — declarative per-section prompts + validators for
 * the multi-pass premium brief pipeline in topuni-ai-pathway.
 *
 * The basic tier still uses one monolithic system prompt. Premium tier
 * runs each of these sections as a focused LLM call in parallel, then
 * the edge function streams them to the client in the order defined here.
 *
 * Each section is fully self-contained — the prompt embeds the profile,
 * the retrieved DB context, and the section-specific instructions. No
 * narrative dependency between sections (a section won't reference an
 * earlier section's specific wording), so they can run in true parallel.
 *
 * Validators check structural invariants the brief renderer relies on
 * (e.g. the "30-day call" line in positioning, the three-bucket ###
 * sub-headings in shortlist). On validation failure the edge function
 * regenerates that section ONCE with a stricter prompt; if it fails a
 * second time we keep the first attempt and move on (degrading
 * gracefully beats blocking the whole brief).
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
  /** Identifier — used in logs + telemetry. Not user-facing. */
  id: string;
  /** Section H2 heading the renderer detects (e.g. "## Strategic positioning").
   *  The completion MUST start with this heading. */
  heading: string;
  /** Build the focused user-prompt for this section. */
  buildPrompt: (ctx: BriefContext) => string;
  /** Optional structural validator. A failure here triggers ONE regen. */
  validate?: (markdown: string, ctx: BriefContext) => ValidatorResult;
  /** Reasoning effort for premium-tier model calls. */
  reasoning?: { effort: "low" | "medium" | "high" };
}

import { EDITORIAL_RULES } from "./editorial-rules.ts";

// SHARED_RULES = the centralized editorial rules + a section-spec
// instruction (always start with the H2 heading the renderer expects).
// Editing the banned-word list happens in editorial-rules.ts now —
// see comment there.
const SHARED_RULES = `
${EDITORIAL_RULES}
- Begin your response with the section heading exactly as instructed.`;

const profileBlock = (ctx: BriefContext): string => {
  const p = ctx.profile;
  // The wizard saves skipped fields as "" rather than dropping the key,
  // so plain `?? fallback` would let `IELTS: ` (empty) reach the prompt
  // and the LLM would treat that as a real datum. `pf` collapses falsy
  // strings to the fallback before they hit the LLM.
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

/* ─── Section specs ──────────────────────────────────────────────────── */

const positioning: SectionSpec = {
  id: "positioning",
  heading: "## Strategic positioning",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `Output: just the "## Strategic positioning" section, in ${ctx.lang}.

OPEN with a single thesis sentence (≤30 words) that names this student's strongest signal AND biggest competitive reality in one breath — this sentence is the report's editorial pull-quote, so it must stand on its own without context. After that opening sentence, write 2-3 paragraphs of full competitive positioning analysis ${ctx.audienceLine}: quantitative GPA percentile context, IELTS band relative to thresholds at the student's target countries, where the profile is strongest, where it is weakest. Cite numbers.

After the paragraphs, output exactly this on its own line:
**Your 30-day call:** [one specific, single-sentence strategic action this student should take in the next 30 days]

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

DATABASE CONTEXT:
${dbBlock(ctx)}

Begin your response with: ## Strategic positioning`,
  validate: (md) => {
    if (md.length < 600) return { ok: false, reason: `too short (${md.length} chars)` };
    // The renderer's StrategicPositioning component pulls out the call line.
    if (!/(your\s+30-day\s+call|стратегический\s+шаг|30-?дневный\s+шаг)/i.test(md)) {
      return { ok: false, reason: "missing 30-day call line" };
    }
    if (!/^##\s+strategic\s+positioning/im.test(md) && !/^##\s+стратегическ/im.test(md)) {
      return { ok: false, reason: "missing required H2 heading" };
    }
    return { ok: true };
  },
};

const shortlist: SectionSpec = {
  id: "shortlist",
  heading: "## Your university shortlist",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `Output: just the "## Your university shortlist" section, in ${ctx.lang}.

Pull 6-10 real universities from the DATABASE CONTEXT below — chosen to be the SHARPEST cut, not the broadest list. Organize into three buckets, in this exact order, using exactly these labels:

### Strong fits — apply with confidence
3-5 universities. For each:
- **University name** — one tight sentence on why THIS student fits THIS program (cite a real profile signal — GPA, field, country alignment, named activity).
- Specific program(s) + admission threshold (IELTS, GPA cutoff) when known.
- One concrete career anchor: typical starting salary band in the student's field, ONE notable employer, OR one alumni outcome — pick the strongest single fact, not all of them.

### Aligned options — competitive but achievable
2-3 universities. Same format.

### Worth keeping on the radar
1-2 universities. Same format.

Do NOT invent universities. Pull only from the database section. NO long uni lists with thin justifications — the report's value is curation, not coverage.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

DATABASE CONTEXT:
${dbBlock(ctx)}

Begin your response with: ## Your university shortlist`,
  validate: (md) => {
    // Each bucket should be present.
    const buckets = [/strong fits/i, /aligned options/i, /worth keeping/i];
    const missing = buckets.filter(rx => !rx.test(md));
    if (missing.length > 0) return { ok: false, reason: `${missing.length} bucket(s) missing` };
    if (md.length < 600) return { ok: false, reason: `too short (${md.length} chars)` };
    return { ok: true };
  },
};

const careerRoi: SectionSpec = {
  id: "career_roi",
  heading: "## Career ROI breakdown",
  reasoning: { effort: "medium" },
  buildPrompt: (ctx) => `Output: just the "## Career ROI breakdown" section, in ${ctx.lang}.

For each top-3 recommended university (the strongest 3 fits from the shortlist this student would build from the DATABASE CONTEXT below):
- Typical starting salary range in this student's target field
- Employment rate within 6 months of graduation
- Notable employers from each program
- Long-term trajectory (where alumni are 5-10 years later)

Format as ### sub-sections per university, with a clear name heading and bulleted facts.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

DATABASE CONTEXT:
${dbBlock(ctx)}

Begin your response with: ## Career ROI breakdown`,
  validate: (md) => {
    if (md.length < 400) return { ok: false, reason: `too short (${md.length} chars)` };
    return { ok: true };
  },
};

const fundingPathway: SectionSpec = {
  id: "funding",
  heading: "## Funding pathway",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `Output: just the "## Funding pathway" section, in ${ctx.lang}.

Pick 3-5 specific scholarships from the DATABASE CONTEXT — the ones THIS student should actually apply to first. Cut speculative options; quality > quantity. For each:
- **Scholarship name** — award amount + coverage type (full ride / tuition / stipend / partial).
- One sentence on how the student's profile maps to the program's stated audience. Cite a real signal ("3.7 GPA in CS from Kazakhstan + the robotics activity lands you in their typical admit profile"). Do NOT predict odds in percentages or label as 'reach' / 'safety' / 'long shot' / 'within reach'.
- Application timing — deadline + WHEN the student should start drafting.
- The first concrete document or task to start now (essay prompt, recommender, transcript pull).

End with a single one-line "Stack:" callout naming a plausible combination of 2 scholarships from the list above that together would fully fund the student. ONE line, not a sub-section.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

DATABASE CONTEXT:
${dbBlock(ctx)}

Begin your response with: ## Funding pathway`,
  validate: (md) => {
    if (md.length < 500) return { ok: false, reason: `too short (${md.length} chars)` };
    return { ok: true };
  },
};

const visa: SectionSpec = {
  id: "visa",
  heading: "## Visa and post-graduation pathway",
  reasoning: { effort: "medium" },
  buildPrompt: (ctx) => `Output: just the "## Visa and post-graduation pathway" section, in ${ctx.lang}.

For each of the student's top 3 target countries (from the profile's targetCountries):
- Student visa difficulty (specific to this student's nationality)
- Post-study work visa details and duration
- Path to permanent residency timeline
- Realistic challenges this student should plan for

Format as ### sub-sections per country.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

DATABASE CONTEXT:
${dbBlock(ctx)}

Begin your response with: ## Visa and post-graduation pathway`,
  validate: (md) => {
    if (md.length < 400) return { ok: false, reason: `too short (${md.length} chars)` };
    return { ok: true };
  },
};

const essays: SectionSpec = {
  id: "essays",
  heading: "## Three personalized essay angles",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `Output: just the "## Three personalized essay angles" section, in ${ctx.lang}.

Three distinct narrative angles this student could lead with. For EACH, use this exact structure (do not deviate):

### Angle 1: [one-sentence concept]
**Why it works for you:** [2-3 sentences citing specific details from this student's profile]
**Anchor it with:** [a specific story, detail, or experience]
**Plays best to:** [which 2-3 target universities this angle plays best to and why]

### Angle 2: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

### Angle 3: [one-sentence concept]
**Why it works for you:** ...
**Anchor it with:** ...
**Plays best to:** ...

If the student supplied a "Top activity" or "Personal story" in the profile, at LEAST one angle's "Anchor it with" line MUST pull from that directly.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

Begin your response with: ## Three personalized essay angles`,
  validate: (md) => {
    const angles = (md.match(/^###\s+angle\s+[123]/gim) || []).length
                + (md.match(/^###\s+(угол|ракурс|вариант)\s+[123]/gim) || []).length;
    if (angles < 3) return { ok: false, reason: `only ${angles} angles produced` };
    return { ok: true };
  },
};

const monthlyBudget: SectionSpec = {
  id: "monthly_budget",
  heading: "## Monthly budget breakdown",
  reasoning: { effort: "low" },
  buildPrompt: (ctx) => `Output: just the "## Monthly budget breakdown" section, in ${ctx.lang}.

For the top 3 recommended cities (from the student's targetCountries):
- Rent, food, transport, insurance, books, leisure (realistic ranges)
- Part-time work options and typical earnings if visa allows
- Total monthly cost and how scholarship coverage maps onto it

Format as ### sub-sections per city.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

Begin your response with: ## Monthly budget breakdown`,
  validate: (md) => {
    if (md.length < 300) return { ok: false, reason: `too short (${md.length} chars)` };
    return { ok: true };
  },
};

const honestGaps: SectionSpec = {
  id: "honest_gaps",
  heading: "## Honest gaps to close",
  reasoning: { effort: "medium" },
  buildPrompt: (ctx) => `Output: just the "## Honest gaps to close" section, in ${ctx.lang}.

2-3 specific weaknesses in the profile. For each, use this exact structure (do not deviate):

### Gap 1: [short headline of the gap]
**Priority:** [high | medium | low]
**Why it matters:** [2-3 sentences citing specific thresholds or context]
**Action this month:** [one specific action they can start now]
**30-60 day plan:** [the next-step plan after that]

### Gap 2: [short headline]
... same fields ...

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

Begin your response with: ## Honest gaps to close`,
  validate: (md) => {
    const gaps = (md.match(/^###\s+gap\s+\d/gim) || []).length
              + (md.match(/^###\s+(пробел|недотяг)\s+\d/gim) || []).length;
    if (gaps < 2) return { ok: false, reason: `only ${gaps} gaps produced` };
    return { ok: true };
  },
};

const actionPlan: SectionSpec = {
  id: "action_plan",
  heading: "## 90-day action plan",
  reasoning: { effort: "medium" },
  buildPrompt: (ctx) => `Output: just the "## 90-day action plan" section, in ${ctx.lang}.

Week-by-week from today, grouped as Weeks 1-2 / 3-6 / 7-12. 3-4 concrete actions per group, with specific deliverables. Reference the student's specific scores and target countries. Concrete actions only — no "research more" filler.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

DATABASE CONTEXT (for naming specific scholarships in the action items):
${dbBlock(ctx)}

Begin your response with: ## 90-day action plan`,
  validate: (md) => {
    const weekHeadings = (md.match(/weeks?\s+\d/gim) || []).length;
    if (weekHeadings < 3) return { ok: false, reason: `only ${weekHeadings} week-bucket headings found` };
    return { ok: true };
  },
};

const finalWord: SectionSpec = {
  id: "final_word",
  heading: "## Final word",
  reasoning: { effort: "low" },
  buildPrompt: (ctx) => `Output: just the "## Final word" section, in ${ctx.lang}.

One short paragraph (3-4 sentences) of specific encouragement based on this student's strongest signal — what they should believe about their candidacy as they go execute. Do not give generic motivation. Do not say "good luck." Cite something concrete from their profile and tell them why it matters.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

Begin your response with: ## Final word`,
  validate: (md) => {
    if (md.length < 200) return { ok: false, reason: `too short (${md.length} chars)` };
    return { ok: true };
  },
};

/** Premium tier section list, in render order. Sections are produced in
 *  parallel; the edge function streams them to the client in this order.
 *
 *  Consolidated 2026-05-10: cut careerRoi / visa / monthlyBudget /
 *  finalWord because 9 sections diluted the report. Generic by-country
 *  visa info, generic city cost-of-living tables, salary-band lookups,
 *  and end-of-report encouragement paragraphs were not what made the
 *  brief decision-grade — they padded length and competed with the
 *  sections that actually move the student. The 5 surviving sections
 *  carry the full strategic value: positioning + 30-day call, the
 *  curated shortlist (now with ONE career anchor folded in per uni so
 *  ROI doesn't disappear entirely), funding, the essay angles
 *  (highest differentiator), and honest gaps (decision-protection).
 *  The retired sections stay defined below in case we re-enable them
 *  for a deeper "premium-plus" tier. */
export const PREMIUM_SECTIONS: SectionSpec[] = [
  positioning,
  shortlist,
  fundingPathway,
  essays,
  honestGaps,
];

// Retired (kept for reference / potential premium-plus reinstatement):
// careerRoi, visa, monthlyBudget, finalWord, actionPlan
void careerRoi; void visa; void monthlyBudget; void finalWord; void actionPlan;

/** Stricter regen prompt addendum applied on validator failure. */
export function buildRegenPrompt(spec: SectionSpec, ctx: BriefContext, reason: string): string {
  return spec.buildPrompt(ctx) + `

CRITICAL: Your previous attempt failed validation: "${reason}". Re-output the section, this time strictly following the structure. Begin with the H2 heading exactly as written. Do not skip required sub-sections or labels.`;
}
