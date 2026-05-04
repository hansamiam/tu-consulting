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

const SHARED_RULES = `
- Be specific and quantitative. Reference the student's actual numbers (GPA, IELTS, country) by name.
- Cite scholarship and university names verbatim from the database section. Do NOT invent options not present in the data.
- Do not use the words "stretch," "long shot," "real shot," "safety school."
- Confident, direct voice. Output clean markdown only — no commentary, no fences, no preamble.
- Begin your response with the section heading exactly as instructed.`;

const profileBlock = (ctx: BriefContext): string => {
  const p = ctx.profile;
  const targets = (p.targetCountries ?? []).join(", ") || "Open";
  const lines = [
    `- Name: ${p.fullName || "—"}`,
    `- GPA: ${p.gpa ?? "—"}${p.gpaScale ? ` / ${p.gpaScale}` : ""}`,
    `- IELTS: ${p.ielts ?? "Not taken"}`,
    `- SAT: ${p.sat ?? "Not taken"}`,
    `- Grade level: ${p.gradeLevel ?? "—"}`,
    `- Target countries: ${targets}`,
    `- Intended major: ${p.major ?? "Undecided"}`,
    `- Budget: ${p.budget ?? "Unspecified"}`,
    `- Needs scholarship: ${p.scholarshipNeeded ?? "—"}`,
    `- Timeline: ${p.timeline ?? "Flexible"}`,
  ];
  if (p.prestige != null) lines.push(`- Priorities (1-5): Prestige ${p.prestige}, Scholarship ${p.scholarship}, Career ROI ${p.careerRoi}, Visa ${p.visaAccess}, Location ${p.locationPref}`);
  if (p.topActivity)   lines.push(`- Top activity / achievement: ${p.topActivity}`);
  if (p.personalStory) lines.push(`- Personal story (their own words): ${p.personalStory}`);
  if (p.namedSchools)  lines.push(`- Specific schools on their list: ${p.namedSchools}`);
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

Pull 15-20 real universities from the DATABASE CONTEXT below. Organize into three buckets, in this exact order, using exactly these labels:

### Strong fits — apply with confidence
6-8 universities. For each:
- **University name** — fit score (0-100%) with one-line justification specific to this student
- Specific program(s) with admission requirements (IELTS, GPA cutoff)
- Historical acceptance rate context
- One unique selling point specific to this student

### Aligned options — competitive but achievable
5-7 universities. Same format.

### Worth keeping on the radar
3-5 universities. Same format.

Do NOT invent universities. Pull only from the database section.

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
    if (md.length < 800) return { ok: false, reason: `too short (${md.length} chars)` };
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
  heading: "## Funding deep-dive",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `Output: just the "## Funding deep-dive" section, in ${ctx.lang}.

For 4-6 specific scholarships from the DATABASE CONTEXT that match this profile:
- **Scholarship name** with award amount
- Probability assessment: primary target / secondary / stretch
- Specific application strategy and timeline
- Key documents this student needs to start gathering now

Then add a sub-section:

### Combined funding scenarios
2-3 plausible combinations of scholarships, partial aid, and country-specific need-based programs that could fully fund this student. Estimate total funding for each scenario.

${SHARED_RULES}

STUDENT PROFILE:
${profileBlock(ctx)}

DATABASE CONTEXT:
${dbBlock(ctx)}

Begin your response with: ## Funding deep-dive`,
  validate: (md) => {
    if (md.length < 600) return { ok: false, reason: `too short (${md.length} chars)` };
    if (!/combined\s+funding|scenarios|сценари/i.test(md)) return { ok: false, reason: "missing combined funding sub-section" };
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
 *  parallel; the edge function streams them to the client in this order. */
export const PREMIUM_SECTIONS: SectionSpec[] = [
  positioning,
  shortlist,
  careerRoi,
  fundingPathway,
  visa,
  essays,
  monthlyBudget,
  honestGaps,
  actionPlan,
  finalWord,
];

/** Stricter regen prompt addendum applied on validator failure. */
export function buildRegenPrompt(spec: SectionSpec, ctx: BriefContext, reason: string): string {
  return spec.buildPrompt(ctx) + `

CRITICAL: Your previous attempt failed validation: "${reason}". Re-output the section, this time strictly following the structure. Begin with the H2 heading exactly as written. Do not skip required sub-sections or labels.`;
}
