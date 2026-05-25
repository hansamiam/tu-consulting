/**
 * AUDIT 2026-05-25 (Stream A — copy regen v2) — slop sources identified
 * in the live report and where the current prompts allow them:
 *   (1) whatToWrite tautology ("Your essay starts —" / "That's where the
 *       essay starts.") — both the GOLD EXEMPLAR + the closer-shape
 *       instruction explicitly allow self-referential "That's where it
 *       starts" copy, and the title slot has no "must be a complete
 *       opening sentence" constraint, so the model emits a preamble.
 *   (2) whatsBlockingYou repeat — neither the prompt nor the validator
 *       forbids the section headline echoing the first entry's title,
 *       so the model happily emits the same sentence twice ("You don't
 *       know what you want to study yet." top + body open).
 *   (3) whereYouStand demographic opener ("Most students in Kazakhstan
 *       your age pursue a direct path toward IT or finance.") — the
 *       prompt instructs "PILE-CONTRAST observation. Most kids in their
 *       year go into one of {peerPiles}…" which directly teaches the
 *       Demographic-opener shape; nothing bans it.
 *   (4) whereYouStand slop verbs ("oversaturated piles", "less common
 *       narrative", "potential to be a standout") — banned-vocab list
 *       doesn't include "oversaturated", "less common", "narrative",
 *       "standout", or "potential to be"; nothing flags them.
 *   (5) whereYouStand hedging body ("maybe", "perhaps", "sometime in
 *       the last two years") — speculative-tense markers are explicitly
 *       REQUIRED in whatToWrite but spill into whereYouStand because
 *       no per-section cap exists; "maybe/perhaps/likely/sometime" are
 *       all unbanned globally.
 *   (6) Empty body fields (Hidden Advantage card renders as a floating
 *       italic quote with no surrounding context) — the SHARED_JSON_RULES
 *       say "OMIT that optional key" rather than emit generic; combined
 *       with the lead being "ONE sentence (max ~25 words)" the model
 *       sometimes ships a sub-10-word lead + omits body. Need to make
 *       lead and body non-optional with min content gates.
 *
 * Fix path (A.2-A.6): expand banned-vocab (kill hedging adverbs +
 * demographic-cliché openers + slop verbs), rewrite each section
 * prompt with explicit sentence/word caps + structural rules, add
 * checkHeadlineDoesNotRepeatFirstEntry validator on whatsBlockingYou,
 * rewrite whatToWrite title slot as an actual opening line, ban
 * demographic openers explicitly in whereYouStand prompt.
 *
 * Brief section specs — v7 (spec lock 2026-05-22).
 *
 * Five journey sections (IDs unchanged from v6 for renderer wire-
 * compat — see src/components/brief/types.ts) that each produce a
 * STRUCTURED JSON payload. The renderer in src/components/brief/*
 * still owns 100% of visual choices; this file orchestrates one LLM
 * call per section and validates BOTH the JSON shape AND the
 * semantic content (banned vocab, specific-anchor presence,
 * culturally-aware peer-piles).
 *
 * v7 changes — what's NEW vs v6:
 *   1. Each section prompt embeds a worked GOLD EXEMPLAR so the
 *      model has a concrete reference for the prose-quality bar,
 *      not just a description of structure.
 *   2. Validators check banned-vocab matches (scanBannedVocab) and
 *      specific-anchor presence (does the output reference any
 *      intake field by name?). A validator failure triggers regen,
 *      same as a shape failure.
 *   3. Cultural-context branching: prompts and validators receive
 *      ctx.culturalContext ("central_asia" | "default"). The
 *      central-asia branch surfaces locally-salient peer piles
 *      (IT/CS, engineering, finance, IR) and forbids "pre-med".
 *   4. Major-certainty branching: section 05 (whatsBlockingYou) has
 *      two prompt variants. If ctx.majorCertainty in {not_at_all,
 *      some_idea}, the section names the major-uncertainty itself
 *      as the load-bearing gap. If pretty_sure/certain, the section
 *      picks from a closed library of named gaps.
 *   5. Each section's content semantics shifted toward the v7 spec
 *      cards (WHO YOU ARE, WHERE YOU BELONG, ESSAY ONLY YOU CAN
 *      WRITE, WHAT YOU'RE AVOIDING, MONDAY MOVE) WHILE preserving
 *      the v6 payload shape (kicker/headline/lead/body/entries/etc).
 *      Renderer/serializer changes that allow the full v7 card stack
 *      (Archetype + 6 cards with one-of-X payloads) are a planned
 *      follow-up — see ~/.claude/plans/ok-good-morning-claude-
 *      frolicking-moth.md for the full spec.
 *
 * Journey order (renderer-wire IDs in parens):
 *   01 WHO YOU ARE                (whereYouStand)
 *   02 WHERE YOU BELONG           (whereYouCanLand)
 *   03 ESSAY ONLY YOU CAN WRITE   (whatToWrite)
 *   04 WHAT YOU'RE AVOIDING       (whatsBlockingYou)
 *   05 MONDAY MOVE                (whatToDoThisMonth)
 *
 * The legacy spec called these "Where you stand / Where you can land
 * / What to write / What's blocking you / What to do this month".
 * The v7 cards reuse the IDs but the CONTENT is the new spec. The
 * old kicker labels still flow through types.ts; updating the
 * displayed kicker copy is a renderer-side change separate from this
 * file. The model is told the v7 card name in the prompt.
 *
 * Each section streams as one complete `data: {section, payload}` SSE
 * event. The renderer fills its block as soon as that event arrives;
 * sections not yet streamed render as skeletons in journey position.
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
    /** v7 spec: major-certainty signal gates the WHAT-YOU'RE-AVOIDING
     *  branch + The Open Question / Tight Lane archetype detection.
     *  4-level enum; default to "some_idea" if missing. */
    majorCertainty?: "not_at_all" | "some_idea" | "pretty_sure" | "certain";
    /** Sparse-input pass (2026-05-23): foreign languages chip-picked on
     *  Step 1. Already pre-filtered at form level to exclude English + CIS
     *  native — anything here IS distinctive. Brief celebrates whatever's
     *  present without per-nationality baseline filtering. */
    foreignLanguages?: string[];
    /** Sparse-input pass (2026-05-23): first-in-family-to-apply-abroad
     *  chip-picked on Step 1. When "yes", the brief's Card 01 + Card 03
     *  apply culturalContext.firstAbroadFramingFor(nationality) — CIS
     *  gets "leaving home" angle, US/LatAm gets "first-gen college"
     *  angle, default gets generic "first step" framing. */
    firstToApplyAbroad?: "yes" | "siblings_have" | "parents_have" | "unsure";
  };
  /** "English" or "Russian". */
  lang: string;
  audienceLine: string;
  /** v7: cultural-context bucket derived from profile.nationality. The
   *  pre-flight resolver in editorial-rules.ts maps codes/names to
   *  "central_asia" or "default". Each section's prompt branches on
   *  this for locally-salient peer piles, vocabulary bans, etc.
   *  Defaults to "default" if absent. */
  culturalContext?: "central_asia" | "default";
  /** v7: personality axis extracted (best-effort) from the Step 3
   *  free-text field via covert-intake placeholder shaping. If the
   *  extraction is ambiguous, "unknown" — and no card may make a
   *  confident I/E claim. */
  personalityAxis?: "introvert" | "extrovert" | "mixed" | "unknown";
  /** v7 Phase 2 (#12): the pre-plan output. When present, every
   *  section's prompt receives the plan as context, enforcing
   *  narrative throughline across cards. When undefined (legacy /
   *  fallback / pre-deploy), sections degrade to v7-without-plan
   *  behavior — same prompts, no cross-card anchors. */
  briefPlan?: import("./brief-plan.ts").BriefPlan;
  /** Sparse-input pass (2026-05-23): true when profile.targetCountries
   *  is empty. Card 02 branches on this to acknowledge the gap in the
   *  lead prose AND to relax the "subset of intake.targetCountries"
   *  constraint so it can suggest fallbackCountries instead. Pre-
   *  fix Card 02 either invented countries or fell back to broken
   *  ["Open"] — same silent-failure pattern as PR #10. */
  noCountries?: boolean;
  /** Sparse-input pass (2026-05-23): top-3 host countries from the
   *  pathway's matched scholarshipRows (with GLOBAL_DEFAULT top-up).
   *  Only consumed by Card 02 when noCountries=true. Pre-computed at
   *  request-time so no extra DB query is needed in the section
   *  builder. */
  fallbackCountries?: string[];
  /** Sparse-input pass (2026-05-23): true when the student's Step 3
   *  free-text fields are all very short or empty. Cards 01, 03, 05
   *  use this to switch into sparse-aware prompt branches that lean
   *  on grade / GPA / scores / nationality / foreign languages
   *  instead of inventing activities. Pre-computed in the pathway. */
  isSparseProfile?: boolean;
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
  /** JSON shape + semantic validator. Returns ok:false if either the
   *  JSON is malformed OR the content fails banned-vocab / specific-
   *  anchor / cultural-context checks. A failure triggers ONE regen. */
  validate?: (rawJson: string, ctx: BriefContext) => ValidatorResult;
  /** Reasoning effort for premium-tier model calls. */
  reasoning?: { effort: "low" | "medium" | "high" };
}

import { EDITORIAL_RULES, scanBannedVocab } from "./editorial-rules.ts";
import { extractLlmJson } from "./llm-json.ts";
import { firstAbroadFramingFor, FRAMING_MARKERS } from "./cultural-context.ts";
import { normalizeNationality } from "./nationality-normalize.ts";

const SHARED_JSON_RULES = `
${EDITORIAL_RULES}

OUTPUT FORMAT — STRICT:
- Output ONLY a single JSON object matching the schema below.
- No markdown fences, no preamble, no trailing prose.
- Every required key MUST be present. If you would emit generic copy
  ("write a strong essay", "pursue your dreams", "leverage your strengths"),
  OMIT that optional key instead. Empty arrays/strings beat platitudes.
- Strings use plain text. No markdown bold, italics, headers, or bullets
  inside string values — those belong in the renderer, not the data.

SPECIFIC-ANCHOR rule (hard requirement, validator-enforced):
- Every section MUST reference at least ONE specific intake field by
  name — a number (GPA, IELTS), a country, a school, an extracurricular
  the student named, or a career interest. If your output reads
  identically to what you'd write for any other student, you have
  failed this section.
- Specifics MUST come from the STUDENT PROFILE block. Never invent
  names, numbers, schools, projects, or biographical events.`;

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
    `- Nationality: ${pf(p.nationality, "—")}`,
    `- GPA: ${pf(p.gpa, "—")}${gpaScale ? ` / ${gpaScale}` : ""}`,
    `- IELTS: ${pf(p.ielts, "Not taken")}`,
    `- SAT: ${pf(p.sat, "Not taken")}`,
    `- Grade level: ${pf(p.gradeLevel, "—")}`,
    `- Target countries: ${targets}`,
    `- Intended major: ${pf(p.major, "Undecided")}`,
    `- How sure about major: ${pf(p.majorCertainty, "some_idea (default — not explicitly asked)")}`,
    `- Budget: ${pf(p.budget, "Unspecified")}`,
    `- Needs scholarship: ${pf(p.scholarshipNeeded, "—")}`,
    `- Timeline: ${pf(p.timeline, "Flexible")}`,
  ];
  if (p.prestige != null) {
    lines.push(
      `- Priorities (1-5): Prestige ${p.prestige}, Scholarship ${p.scholarship}, Career ROI ${p.careerRoi}, Visa ${p.visaAccess}, Location ${p.locationPref}`,
    );
  }
  if (pf(p.topActivity, "")) lines.push(`- Top activity / achievement: ${p.topActivity}`);
  if (pf(p.personalStory, "")) lines.push(`- Personal story (their own words): ${p.personalStory}`);
  if (pf(p.namedSchools, "")) lines.push(`- Specific schools on their list: ${p.namedSchools}`);
  if (p.foreignLanguages && p.foreignLanguages.length > 0) {
    // Above-baseline by form-level pre-filter (chip set excludes English
    // + CIS native). Brief celebrates these as distinctive signals.
    lines.push(`- Foreign languages (distinctive — picked from chip set that excludes baseline): ${p.foreignLanguages.join(", ")}`);
  }
  if (p.firstToApplyAbroad) {
    lines.push(`- First in family to apply abroad: ${p.firstToApplyAbroad} (apply cultural-context framing per sparseAndFramingNote / editorial-rules)`);
  }
  if (ctx.personalityAxis && ctx.personalityAxis !== "unknown") {
    lines.push(`- Personality lean (extracted, best-effort): ${ctx.personalityAxis}`);
  }
  if (ctx.culturalContext) {
    lines.push(`- Cultural context: ${ctx.culturalContext}`);
  }
  return lines.join("\n");
};

const dbBlock = (ctx: BriefContext): string => ctx.dbContext;

/** v7 Phase 2 (#12): when a brief plan is present, surface its
 *  cross-card anchors so the section prompts can render against
 *  them. Empty string when no plan — sections fall back to their
 *  v7-without-plan behavior (still good, just no cross-card
 *  throughline). */
const planBlock = (ctx: BriefContext): string => {
  const p = ctx.briefPlan;
  if (!p) return "";
  const gapLine =
    p.primaryGap.type === "library-entry"
      ? `library-entry #${p.primaryGap.libraryEntryId} — ${p.primaryGap.reason}`
      : `major-uncertainty — ${p.primaryGap.reason}`;
  return `
BRIEF PLAN (canonical narrative throughline — every card must respect it):
- Archetype: ${p.archetype.id} (confidence ${p.archetype.confidence})
- Identity claim (Card 01 anchor): "${p.identityClaim}"
- Pile contrast (Cards 01-02 anchor): "${p.pileContrast}"
- Country buckets (Card 02 anchor): ${p.countryBuckets.join(", ")}
- Essay seed type (Card 03 anchor): "${p.essaySeedType}"
- Primary gap (Card 04 anchor): ${gapLine}
- Monday-move artifact (Card 05 anchor): "${p.mondayMoveArtifact}"

Your section MUST anchor to the plan field(s) relevant to it. Do not
contradict the plan; do not paraphrase the anchors into vagueness;
do not invent specifics the plan doesn't establish.
`.trim();
};

/** Parse helper — returns the parsed object or null if not valid JSON.
 * 2026-05-18: routed through the shared brace-walking helper so an LLM
 * appending commentary after the JSON body doesn't silently drop the
 * section (those bugs rendered as a missing block in the brief). */
const tryParse = (raw: string): unknown | null => {
  try { return extractLlmJson(raw); } catch { return null; }
};

/** Semantic-validator helper — every section runs this after JSON-shape
 *  validation. Returns the first failing reason if any. */
const semanticCheck = (
  obj: Record<string, unknown>,
  ctx: BriefContext,
  opts: { mustNameIntakeField: boolean },
): ValidatorResult => {
  // Flatten every string in the payload (recursive) into one corpus
  // so we can scan banned-vocab and specific-anchor presence in one
  // pass without missing nested fields.
  const corpus: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") corpus.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(obj);
  const text = corpus.join(" \n ");

  // Banned-vocab scan (incl. cultural-context bans).
  const hits = scanBannedVocab(text, ctx.culturalContext);
  if (hits.length > 0) {
    const first = hits[0];
    return { ok: false, reason: `banned-vocab hit (${first.label}): "${first.match}"` };
  }

  // Specific-anchor presence — at least one named intake field must
  // appear in the corpus. Names, numbers, countries, schools all count.
  if (opts.mustNameIntakeField) {
    const p = ctx.profile;
    const anchors: string[] = [];
    const addIf = (v: unknown): void => {
      if (v === null || v === undefined) return;
      const s = String(v).trim();
      if (s.length >= 2) anchors.push(s);
    };
    addIf(p.fullName?.split(/\s+/)[0]); // first name only — full name often awkward
    addIf(p.nationality);
    addIf(p.gpa);
    addIf(p.ielts);
    addIf(p.sat);
    addIf(p.major);
    addIf(p.topActivity);
    addIf(p.namedSchools);
    (p.targetCountries ?? []).forEach(addIf);

    const corpusLower = text.toLowerCase();
    const hit = anchors.some((a) => a && corpusLower.includes(a.toLowerCase()));
    if (!hit) {
      return {
        ok: false,
        reason: "specific-anchor missing: output references no named intake field (GPA, country, school, activity, etc.)",
      };
    }
  }

  return { ok: true };
};

/* 2026-05-23 sparse-input pass: shared prompt block injected into
 * Cards 01, 03, 05 that:
 *  1. Warns the LLM when the profile is sparse (Step 3 mostly empty)
 *     and tells it which fields ARE present to anchor to — instead of
 *     inventing biographical specifics or defaulting to "your profile
 *     is interesting" generic prose.
 *  2. Tells the LLM how to frame first-in-family-abroad signals when
 *     profile.firstToApplyAbroad === "yes" — uses
 *     cultural-context.firstAbroadFramingFor() to pick the right
 *     tone (CIS = "leaving home", US/LatAm = "first-gen college",
 *     unmapped = generic "first step"). Per the editorial rule.
 *  3. Mentions foreign languages (above baseline by form-level pre-
 *     filter) so the brief celebrates them where natural.
 *
 * Empty string when nothing to add — keeps existing prompts unchanged
 * for non-sparse / non-first-abroad cases. */
const sparseAndFramingNote = (ctx: BriefContext): string => {
  const parts: string[] = [];

  if (ctx.isSparseProfile) {
    const p = ctx.profile;
    const present: string[] = [];
    if (p.gradeLevel) present.push(`grade level (${p.gradeLevel})`);
    if (p.gpa) present.push(`GPA (${p.gpa})`);
    if (p.ielts) present.push(`IELTS (${p.ielts})`);
    if (p.sat) present.push(`SAT (${p.sat})`);
    if (p.nationality) present.push(`nationality (${p.nationality})`);
    if (p.major) present.push(`intended major (${p.major})`);
    if (p.foreignLanguages && p.foreignLanguages.length > 0) {
      present.push(`foreign languages learned (${p.foreignLanguages.join(", ")})`);
    }
    parts.push(`
SPARSE-PROFILE BRANCH (the student gave very short / empty Step 3
answers — careerGoal, extracurriculars, background, namedSchools are
all blank or one-line):
- DO NOT invent biographical specifics, activities, or moments. The
  brief cannot know what isn't in the intake.
- ANCHOR to the fields that ARE present: ${present.join(", ") || "[bare minimum: grade level + GPA only]"}.
- Lead with structural truths about this cohort + this profile shape,
  not invented personal narrative. ("Students at your grade in {country}
  applying to {major} typically...")
- The specific-anchor rule still applies — every section MUST name at
  least one present field by value. With sparse input, that anchor is
  necessarily one of the structural fields above.
- Closer can be a soft invite to come back with more detail: "When you
  have a feel for [X], come back and we'll sharpen this."
`);
  }

  if (ctx.profile.firstToApplyAbroad === "yes") {
    const framing = firstAbroadFramingFor(normalizeNationality(ctx.profile.nationality));
    const markerLang = ctx.lang.toLowerCase().startsWith("rus") ? "ru" : "en";
    const markers = FRAMING_MARKERS[framing][markerLang];
    parts.push(`
FIRST-ABROAD FRAMING (profile.firstToApplyAbroad === "yes"):
- This student is the first in their family to apply abroad.
- Cultural-context framing for nationality "${ctx.profile.nationality ?? "unknown"}" = "${framing}".
- Use one of these marker phrases (or close paraphrases) in Card 01 or
  Card 03 to honor the framing — these are the locked-in language
  patterns for this cohort: ${markers.map((m) => `"${m}"`).join(" / ")}.
- For "first_to_leave_home" (CIS / MENA): DO NOT use "first-generation
  college" framing — school completion is high in these regions and
  parents often graduated university. Use "leaving home / first to step
  out / first to go abroad" angles instead.
- For "first_gen_college" (US / LatAm / parts of SE Asia / Africa):
  standard first-generation framing is correct and lands.
- For "first_global_step" (unmapped nationality): generic "first to take
  this step" framing; no claims about family education history.
`);
  }

  if (parts.length === 0) return "";
  return `\n${parts.join("\n")}\n`;
};

/* ─── Section specs (journey order) ──────────────────────────────────── */

/* 01 — WHO YOU ARE (renderer-wire ID: whereYouStand) */
const whereYouStand: SectionSpec = {
  id: "whereYouStand",
  heading: "Where you stand",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => {
    const isCIS = ctx.culturalContext === "central_asia";
    const peerPiles = isCIS
      ? "the IT-track kids, the engineering kids being pushed into Western banking since 9th grade, the finance/economics kids, the international relations kids"
      : "the obvious one-track piles (pre-med, CS, finance, engineering)";
    return `
You are writing CARD 01 of a 5-card admissions strategy brief in the
v7 spec. This card is called WHO YOU ARE. Its job: make ${ctx.audienceLine}
feel SEEN. Name them in a way they hadn't articulated themselves.
${sparseAndFramingNote(ctx)}
STUDENT PROFILE:
${profileBlock(ctx)}

${planBlock(ctx)}

LIVE CONTEXT (cohort + matched programs for your reference):
${dbBlock(ctx)}

STRUCTURE — the card has three beats:
  1. HEADLINE: a stylized identity claim, 8-14 words, quotable. NOT
     "your profile type". Softer, observed, named. Examples of the
     SHAPE (not content) — "You're a [X] who hasn't told anyone yet."
     / "You're [X] in a year of [Y]." / "You're the kid who [specific
     observation about their data]."
  2. BODY: 3-5 sentences, 60-90 words. PILE-CONTRAST observation. Most
     kids in their year go into one of ${peerPiles}. Place THIS student
     OUTSIDE those piles by naming TWO specific intake fields by name
     (GPA + activity, or test scores + named project, etc.). The
     observation should be admissions-reader-perspective: what does
     their file actually LOOK like vs the pile.
  3. CLOSER: 1 sentence, 10-18 words. The gentle reframe — names what
     they've been treating wrong about their own profile. SUGGESTION
     MOOD only — "the time will come to lead with it" / "worth
     surfacing when you're ready" / "that's the thing". NEVER bare
     imperative ("Stop." "Do this.").

GOLD EXEMPLAR — match this prose-quality bar:
  Student: Yerlan, Kazakhstan, GPA 3.7, AP Calc + Math Olympiad
  regional medal, debate captain, majorCertainty: not_at_all,
  cultural_context: central_asia
  Output:
    headline: "You're a policy-leaning STEM kid who hasn't told anyone yet."
    lead:     "Yerlan, your profile is more interesting than you're treating it."
    body:     "Most kids in your year go in one pile. The IT-track pile, the engineering kids being pushed into Western banking since 9th grade, the finance kids. They look the same on paper because the path was picked for them. Your file shows AP Calc AND a debate medal — two things that don't normally appear together in your school's outbound applicants. That puts you in a smaller pile most admissions readers don't get to see often."
    pullquote: "The time will come to lead with that overlap."

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "01 · Where you stand",
  "headline": "string — 8 to 14 words. The stylized identity claim. Quotable. NO banned vocab.",
  "lead": "string — ONE sentence (max ~25 words) anchoring the card. First word punchy and concrete — gets a drop cap in the renderer.",
  "body": "string — 3 to 5 sentences (separate with \\n\\n if more than one paragraph). PILE-CONTRAST observation referencing AT LEAST 2 specific intake fields by name.",
  "pullquote": "string — 1 sentence, 10 to 18 words. The gentle reframe. SUGGESTION MOOD only. No 'Stop.' / 'Do this.' / 'Start now.'."
}

${SHARED_JSON_RULES}`;
  },
  validate: (raw, ctx) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    for (const k of ["kicker", "headline", "lead", "body", "pullquote"]) {
      const v = obj[k];
      if (typeof v !== "string" || v.trim().length < 10) {
        return { ok: false, reason: `missing or too short: ${k}` };
      }
    }
    // Headline length cap (~14 words)
    const headline = obj.headline as string;
    if (headline.split(/\s+/).length > 16) {
      return { ok: false, reason: "headline too long (>16 words)" };
    }
    // Closer/pullquote must not start with a bare imperative
    const pullquote = (obj.pullquote as string).trim();
    if (/^(Stop|Do this|Don't|Begin|Start now)\.?\s/i.test(pullquote)) {
      return { ok: false, reason: "pullquote uses bare imperative — must be suggestion mood" };
    }
    return semanticCheck(obj, ctx, { mustNameIntakeField: true });
  },
};

/* 02 — WHERE YOU BELONG (renderer-wire ID: whereYouCanLand)
   Payload shape kept at 3 entries with reach/target/safety `tier`
   field for renderer wire-compat. Prompt teaches the model to use the
   tier slots more flexibly: tier "reach" = the stretch place, tier
   "target" = the home place, tier "safety" = the sure place. Each
   entry gets a one-line LORE sentence in whyItFits — the new
   "personality of the school" frame. */
const whereYouCanLand: SectionSpec = {
  id: "whereYouCanLand",
  heading: "Where you can land",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => {
    const isCIS = ctx.culturalContext === "central_asia";
    const visaNote = isCIS
      ? `VISA REALISM: this student has a CIS passport. Exclude destinations that historically don't grant student visas easily to CIS passports. Be honest about visa-tier when naming countries.`
      : `VISA REALISM: confirm any destination is plausibly visa-attainable for this student's nationality.`;
    // 2026-05-23 sparse-input pass: when the student didn't pick any
    // targetCountries, we relax the subset rule and steer the prompt to
    // acknowledge the gap warmly. The fallbackCountries come from the
    // pathway's matched scholarshipRows (top-3 host countries for THIS
    // nationality), so the suggestions are still real + grounded.
    const noCountriesNote = ctx.noCountries
      ? `

NO-TARGETCOUNTRIES BRANCH (the student didn't pick any countries on Step 2):
- LEAD prose MUST acknowledge this warmly. Open with something like
  "You didn't tell us where you're aiming yet — fair, that's one of the
  hardest calls." Then transition into the suggestions below.
- Country selection comes from the FALLBACK COUNTRIES list below —
  the top-3 host countries for students of this nationality based on
  the LIVE CONTEXT pool. NOT from intake.targetCountries (which is
  empty by design here).
- Close the lead with a soft invite: "Pick one that feels right, come
  back, and we'll redo this with real fit notes." (In RU brief: "Выбери
  ту, что кажется правильной, вернись — и пересоберём отчёт.")

FALLBACK COUNTRIES (use these, in order, for the buckets):
${(ctx.fallbackCountries ?? []).map((c, i) => `  ${i + 1}. ${c}`).join("\n") || "  (none — fall through to LIVE CONTEXT host countries)"}
`
      : "";
    return `
You are writing CARD 02 of a 5-card admissions strategy brief in the
v7 spec. This card is called WHERE YOU BELONG. Its job: trigger
imagination + mechta (the dream of being there). It names cities /
schools where THIS student's profile actually thrives. NOT a
reach/target/safety odds list — those words are banned.
${noCountriesNote}

STUDENT PROFILE:
${profileBlock(ctx)}

${planBlock(ctx)}

LIVE CONTEXT (use these schools — pick from the matched list, do not invent):
${dbBlock(ctx)}

${visaNote}

v7 Phase 3 (#13 part 2) reshape: produce country BUCKETS (1-3
countries, each with 1-3 schools + one lore sentence per school).
No reach/target/safety. The renderer's fallback path still accepts
the v6 entries[] shape for cached briefs; new generations are
pure v7. Country choices come from the BRIEF PLAN's countryBuckets
(a subset of intake.targetCountries) so the LLM cannot drift into
countries the student didn't ask about.

STRUCTURE:
  - Pull country selection from the BRIEF PLAN's countryBuckets if
    available. Otherwise pick 1-3 from intake.targetCountries that
    are visa-plausible for the student's nationality.
  - 1 to 3 schools per country. Each school comes from LIVE CONTEXT
    (do not invent). Each gets a one-line lore sentence — the
    school's PERSONALITY for THIS student, anchored to Card 01's
    identity claim + Card 02 archetype.
  - No reach/target/safety vocabulary anywhere. No selectivity-%
    mentions. No "elite" / "top-10" framing. No Crimson-Education
    elite-only vibes.

GOLD EXEMPLAR — match this prose-quality bar:
  Student: Yerlan, targetCountries: Canada / UK / Singapore (KZ passport — visa realism applies)
  Output:
    kicker:   "02 · Where you belong"
    headline: "Three kinds of places that fit how you actually move."
    lead:     "Pulled from your countries, with your file in mind."
    buckets:
      [0] country: "Canada"
          cities:  "Toronto, Vancouver, Montreal"
          schools:
            - { name: "University of Toronto", lore: "Where the kid running policy resolutions on weekends finds three other people doing the same in the same dorm. Big enough to disappear into when you need to, dense enough that the overlap shows up at lunch." }
            - { name: "McGill",                lore: "Policy-school energy without giving up the math. The dual-major kids here aren't unusual — they're the ones who pick the program." }
      [1] country: "United Kingdom"
          cities:  "Edinburgh, Glasgow"
          schools:
            - { name: "University of Edinburgh", lore: "Where the STEM-with-policy combination isn't unusual, it's the standard. Quieter prestige, lower selectivity, better fit. Not Oxbridge — the smarter middle." }
      [2] country: "Singapore"
          cities:  null
          schools:
            - { name: "NUS", lore: "English-medium, scholarship-heavy, six-hour flight from home. The place that gets your visa stamped the first time you ask." }

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "02 · Where you belong",
  "headline": "string — 4-8 word display line. NO banned vocab (no 'reach' / 'target' / 'safety' anywhere).",
  "lead": "string — ONE sentence (max ~20 words) framing the buckets. Drop-cap rendered.",
  "buckets": [
    {
      "country": "string — short country name (matches a country from BRIEF PLAN's countryBuckets / intake.targetCountries)",
      "cities": "string — 1-3 comma-separated city anchors. Optional but recommended for mechta-energy.",
      "schools": [
        {
          "name": "string — exact school name from LIVE CONTEXT (do not invent)",
          "lore": "string — 1 to 2 sentences. The school's PERSONALITY for THIS student. Plain English. References Card 01's identity claim or the archetype. NO banned vocab."
        }
        // 1 to 3 schools per bucket
      ]
    }
    // 1 to 3 buckets total
  ]
}

ABSOLUTE RULES:
- 1 to 3 buckets. 1 to 3 schools per bucket. ≤ 9 schools total.
- Every school MUST exist in LIVE CONTEXT. Do not invent.
- Every lore sentence MUST reference at least one specific element
  from Card 01 (identity claim / pile contrast) or the archetype.
- No 'reach' / 'target' / 'safety' / 'elite' / 'top-10' anywhere.
- Country selection rules:
  · If the NO-TARGETCOUNTRIES BRANCH note above is present, use the
    FALLBACK COUNTRIES list (in order). The lead prose MUST follow
    the acknowledgment + invite pattern described there.
  · Otherwise: countries MUST come from BRIEF PLAN's countryBuckets
    if the plan is present, else from intake.targetCountries
    (case-insensitive subset).
- DO NOT also emit an "entries" field. The v6 three-tier shape is
  intentionally retired in new generations.

${SHARED_JSON_RULES}`;
  },
  validate: (raw, ctx) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const buckets = obj.buckets as unknown[] | undefined;
    if (!Array.isArray(buckets) || buckets.length < 1 || buckets.length > 3) {
      return { ok: false, reason: "buckets must be a 1-3 element array" };
    }
    let totalSchools = 0;
    for (const b of buckets) {
      const country = (b as { country?: unknown }).country;
      if (typeof country !== "string" || country.trim().length === 0) {
        return { ok: false, reason: "each bucket must name a country" };
      }
      const schools = (b as { schools?: unknown[] }).schools;
      if (!Array.isArray(schools) || schools.length < 1 || schools.length > 3) {
        return { ok: false, reason: `bucket "${country}" must have 1-3 schools` };
      }
      totalSchools += schools.length;
      for (const s of schools) {
        const name = (s as { name?: unknown }).name;
        if (typeof name !== "string" || name.trim().length === 0) {
          return { ok: false, reason: "every school must have a name" };
        }
      }
    }
    if (totalSchools > 9) {
      return { ok: false, reason: "total schools across buckets must be ≤ 9" };
    }
    // Validate against intake.targetCountries when present (case-insensitive subset)
    const intakeCountries = (ctx.profile.targetCountries ?? []).map((c) => c.toLowerCase());
    if (intakeCountries.length > 0) {
      for (const b of buckets) {
        const c = ((b as { country: string }).country).toLowerCase();
        if (!intakeCountries.includes(c)) {
          return {
            ok: false,
            reason: `bucket country "${(b as { country: string }).country}" not in intake.targetCountries (${intakeCountries.join(", ")})`,
          };
        }
      }
    }
    // Banned vocab in any string field — scanBannedVocab via semanticCheck handles it.
    return semanticCheck(obj, ctx, { mustNameIntakeField: true });
  },
};

/* 03 — ESSAY ONLY YOU CAN WRITE (renderer-wire ID: whatToWrite)
   Stream-A regen-v2 (2026-05-25) — pivot away from "speculative tense
   essay seed" toward "the actual opening line of the essay, grounded
   in a named intake moment." The title slot now holds the opening
   line itself (not a preamble like "Your essay starts —"), the body
   names ONE specific intake-grounded moment with concrete anchors
   (year, course, activity), and the closer is one imperative under
   10 words. */
const whatToWrite: SectionSpec = {
  id: "whatToWrite",
  heading: "What to write",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing CARD 03 of a 5-card admissions strategy brief in the
v7 spec. This card is called THE ESSAY ONLY YOU CAN WRITE. Its job:
hand the student the literal opening line of the essay they should
write, plus the one specific intake-grounded moment that line points
at.

CORE PIVOT (Stream-A regen-v2):
The title slot is NOT a meta-preamble like "Your essay starts —" or
"The math-in-debate moment". It IS the actual opening sentence of the
essay. Write it as the first line the admissions reader sees. The body
then names the ONE concrete moment that line opens into.
${sparseAndFramingNote(ctx)}
STUDENT PROFILE:
${profileBlock(ctx)}

${planBlock(ctx)}

GOLD EXEMPLAR — match this prose-quality bar:
  Student: Yerlan, Kazakhstan, GPA 3.7, AP Calc + Math Olympiad
    regional medal (2024), debate captain.
  Output:
    kicker:  "03 · The essay only you can write"
    headline: "Here's the opening line. The rest is yours."
    lead:     "One sentence to start. One moment to ground it."
    essaySeed.title: "The day my AP Calc proof won a debate round."
    essaySeed.body: "In your 2024 regional Math Olympiad year, calculus stopped being a class and started being a tool you reached for everywhere — including the debate stage. Open on that crossover moment: the round where a clean derivative did the rhetorical work nothing else could. Build out from there."
    essaySeed.closer: "Open the doc. Write that first line."

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "03 · The essay only you can write",
  "headline": "string — 6 to 12 words. Frames the card. Do NOT say 'Your essay starts' or 'That's where the essay starts' (banned tautology with closer).",
  "lead": "string — ONE sentence (max 15 words). Drop-cap rendered.",
  "essaySeed": {
    "title": "string — ONE complete opening sentence for the essay. MAX 14 WORDS. This IS the first line of the essay, not a label for it. NEVER 'Your essay starts —' or any preamble shape.",
    "body": "string — MAX 3 sentences. Each sentence ≤ 25 words. Names ONE specific moment grounded in intake: a concrete year, course, activity, project, or test result by name. NEVER 'sometime in the last two years' / 'maybe / perhaps / likely'. Commit to the moment.",
    "closer": "string — ONE imperative sentence, MAX 10 words. Tells the student the literal next action ('Open the doc. Write that line.' / 'Type it. Don't edit yet.'). NOT 'That's where the essay starts.' (tautology). NOT 'Write this essay now.' (coercive)."
  }
}

ABSOLUTE RULES:
- title slot = the opening sentence itself, not a meta-label.
- body uses concrete anchors (year / course / test / activity by name).
  Zero hedging adverbs — they are now in the banned-vocab pool.
- closer is a real action verb + object in ≤ 10 words. NO repeat of the
  title's phrasing.
- DO NOT also emit an "entries" field. The v6 three-angles shape is
  intentionally retired in new generations.

${SHARED_JSON_RULES}`,
  validate: (raw, ctx) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const seed = obj.essaySeed as Record<string, unknown> | undefined;
    if (!seed || typeof seed !== "object") {
      return { ok: false, reason: "essaySeed object missing" };
    }
    const title = typeof seed.title === "string" ? seed.title.trim() : "";
    if (title.length < 6) {
      return { ok: false, reason: "essaySeed.title missing or too short" };
    }
    // Title must be a real opening sentence — not a preamble shape.
    if (/^(your essay starts|the .* moment$|here'?s where|that'?s where)/i.test(title)) {
      return { ok: false, reason: "essaySeed.title is a meta-preamble; emit the actual opening sentence of the essay (≤14 words)" };
    }
    if (title.split(/\s+/).length > 14) {
      return { ok: false, reason: `essaySeed.title >14 words (${title.split(/\s+/).length})` };
    }
    const body = typeof seed.body === "string" ? seed.body : "";
    if (body.trim().length < 30) {
      return { ok: false, reason: "essaySeed.body missing or too short" };
    }
    // Body sentence cap — max 3 sentences.
    const bodySentences = body.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    if (bodySentences.length > 3) {
      return { ok: false, reason: `essaySeed.body >3 sentences (${bodySentences.length})` };
    }
    // Closer present + ≤10 words + not coercive + not tautology with title.
    const closer = typeof seed.closer === "string" ? seed.closer.trim() : "";
    if (closer.length < 4) {
      return { ok: false, reason: "essaySeed.closer missing or too short" };
    }
    const closerWords = closer.split(/\s+/);
    if (closerWords.length > 10) {
      return { ok: false, reason: `essaySeed.closer >10 words (${closerWords.length})` };
    }
    if (/^(Write this|Submit|Send|Publish)\b/i.test(closer)) {
      return { ok: false, reason: "essaySeed.closer too coercive — use a small concrete action ('Open the doc.' / 'Type that line.')" };
    }
    if (/that'?s where the essay starts/i.test(closer)) {
      return { ok: false, reason: "essaySeed.closer tautologically restates the title — emit a real next-action imperative" };
    }
    // Now apply standard semantic check — but allow speculative tokens
    // ONLY where they appear in intake fields the student wrote. The
    // hedging-pool is enforced as part of the default scan.
    return semanticCheck(obj, ctx, { mustNameIntakeField: true });
  },
};

/* 04 — WHAT YOU'RE AVOIDING (renderer-wire ID: whatsBlockingYou)
   Branches on profile.majorCertainty. If not_at_all/some_idea, the
   primary gap is major-uncertainty itself, named warmly. If
   pretty_sure/certain, the gap comes from the closed library.

   Stream-A regen-v2 (2026-05-25): the section headline + the first
   entry's title MUST NOT echo each other. Live brief shipped
   "You don't know what you want to study yet." as BOTH the headline
   AND the entry title, which read like a glitch. Hard rule + a
   checkHeadlineDoesNotRepeatFirstEntry validator. */

/**
 * Validator helper — fails when the section headline and the first
 * entry's title share >3 consecutive words (case-insensitive). Used
 * by whatsBlockingYou to kill the live-brief bug where the section
 * headline echoed the entry title verbatim.
 */
function checkHeadlineDoesNotRepeatFirstEntry(payload: Record<string, unknown>): ValidatorResult {
  const headline = typeof payload.headline === "string" ? payload.headline.trim() : "";
  const entries = payload.entries as unknown[] | undefined;
  if (!Array.isArray(entries) || entries.length === 0) return { ok: true };
  const firstTitle = ((entries[0] as { title?: string })?.title ?? "").trim();
  if (!headline || !firstTitle) return { ok: true };

  const tokenize = (s: string): string[] =>
    s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, " ").split(/\s+/).filter(Boolean);
  const a = tokenize(headline);
  const b = tokenize(firstTitle);
  if (a.length === 0 || b.length === 0) return { ok: true };

  // Find longest contiguous run of matching tokens. >3 consecutive
  // shared tokens = headline is echoing the entry title.
  const RUN_THRESHOLD = 4;
  for (let i = 0; i + RUN_THRESHOLD <= a.length; i++) {
    const window = a.slice(i, i + RUN_THRESHOLD).join(" ");
    if (b.join(" ").includes(window)) {
      return {
        ok: false,
        reason: `headline echoes first entry title (shared run "${window}"); rewrite the headline as a broad pattern, keep the title narrow.`,
      };
    }
  }
  return { ok: true };
}

const whatsBlockingYou: SectionSpec = {
  id: "whatsBlockingYou",
  heading: "What's blocking you",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => {
    const cert = ctx.profile.majorCertainty ?? "some_idea";
    const majorUncertainBranch = cert === "not_at_all" || cert === "some_idea";

    const branchSpecific = majorUncertainBranch
      ? `BRANCH: major-uncertainty (intake says majorCertainty = "${cert}").

The PRIMARY gap (priority "high", first entry) is the student's own
indecision about what they want to study. Name it warmly — NOT as a
flaw to fix but as a fact to surface.

  entries[0].title:  Name the indecision directly. Example: "The
    major question is still open." Keep it SHORT (≤10 words) and
    DIFFERENT from the section headline above — the validator rejects
    >3 consecutive shared words between them.
  whyItMatters: validation language — "not knowing is information,
    not a problem. Schools have answers for cross-domain kids who
    haven't picked yet."
  actionThisMonth: NO concrete prescription here — Card 05 owns
    actions. Just a posture: "stop hiding this from your applications.
    Build the application that names it."
  next60Days: brief — "as you talk to more schools the question
    sharpens, not the answer."

The remaining 0-2 gap entries are OPTIONAL and from the GAP LIBRARY
below — only include if obviously triggered from the intake.`
      : `BRANCH: gap-library (intake says majorCertainty = "${cert}" — student is reasonably sure).

Pick ONE gap from the closed library below that is most clearly
triggered by the intake. If no specific gap obviously triggers, use
the DEMONSTRABLE-DEPTH catch-all (entry 07).`;

    return `
You are writing CARD 04 of a 5-card admissions strategy brief in the
v7 spec. This card is called WHAT YOU'RE AVOIDING. Its job: name ONE
honest, load-bearing gap and frame it warmly — as information, not
verdict. The cousin doesn't lecture; she points at the thing the kid
has been editing out of his own self-description.

STREAM-A REGEN-V2 HARD RULE — headline ≠ first-entry title:
The section "headline" names the BROAD pattern. The first entry's
"title" names the SPECIFIC gap. They MUST NOT share more than 3
consecutive words. If headline = "You don't know what you want to
study yet." and entries[0].title = "You don't know what you want to
study yet.", the validator rejects and you regenerate. Pick a
different angle for the headline — name the FEELING or the SHAPE of
what's been edited out, while the entry title names the gap itself.

STUDENT PROFILE:
${profileBlock(ctx)}

${planBlock(ctx)}

${branchSpecific}

GAP LIBRARY (use ONLY when the gap-library branch is active above):
  01 Test scores aren't filed yet
     trigger: ielts && toefl && sat all empty
     tone: "You've been moving through this without putting a number on the table."
  02 Wide but shallow activity profile
     trigger: activity-text suggests many ECs but no leadership/recognition
     tone: "You've touched a lot of things. You haven't led one yet."
  03 Single-country tunnel vision
     trigger: targetCountries.length === 1
     tone: "Every school on your list is in one country. That's a choice, but it might not be the one you actually made."
  05 Activities don't cluster into one story
     trigger: EC text shows variety without through-line
     tone: "Your activities are interesting. They don't add up to one thing yet."
  06 English-writing polish
     trigger: non-native EN + no IELTS/TOEFL >= 7
     tone: "Your spoken English is solid. Your written English needs one careful pass before any application goes out."
  07 Demonstrable-depth gap (Barnum / catch-all DEFAULT)
     trigger: when no specific gap above obviously fires
     tone: "You can tell the story of why this matters to you. What you don't have yet are the receipts — the leadership titles, the named projects, the recognitions — that would prove it to a stranger reading your application."

GOLD EXEMPLAR (major-uncertainty branch):
  Output:
    kicker: "04 · What's blocking you"
    headline: "The shape you've been hiding."   (≤8 words, broad pattern)
    lead: "Yerlan, the thing you're avoiding isn't a flaw — it's the question you haven't let yourself ask out loud."
    entries[0]:
      priority: "high"
      title: "The major question is still open."   (specific gap, no shared run with headline)
      whyItMatters: "You put 'CS' on the intake form because that's what people expect when you're good at math. That's not the same as wanting it. Not knowing is information, not a problem."
      actionThisMonth: "Stop hiding the question — the brief next to this one names where to start writing."
      next60Days: "As you talk to more schools, the question sharpens; the answer follows the conversations."

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "04 · What's blocking you",
  "headline": "string — MAX 8 words. Names the broad pattern / feeling, NOT the specific gap.",
  "lead": "string — ONE sentence, MAX 20 words. Reframes the pattern as opportunity. Drop-cap rendered.",
  "entries": [
    {
      "priority": "high" | "medium",
      "title": "string — short gap title, max 10 words. Direct naming. MUST NOT share more than 3 consecutive words with the section headline.",
      "whyItMatters": "string — 2 to 3 sentences. SPECIFIC naming using intake fields. Validates the gap as information, NOT verdict.",
      "actionThisMonth": "string — ONE posture/orientation (Card 05 owns concrete actions). 1 sentence.",
      "next60Days": "string — 1 sentence framing the follow-through."
    }
    // EXACTLY 3 entries total, ordered as primary now / next / later
  ]
}

ABSOLUTE RULES:
- entries array MUST have exactly 3 elements, ordered now / next / later.
- headline ≤ 8 words, lead ≤ 20 words.
- headline and entries[0].title MUST NOT share more than 3 consecutive
  words (validator-enforced).

${SHARED_JSON_RULES}`;
  },
  validate: (raw, ctx) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const headline = typeof obj.headline === "string" ? obj.headline.trim() : "";
    if (!headline) return { ok: false, reason: "headline missing" };
    if (headline.split(/\s+/).length > 8) {
      return { ok: false, reason: `headline >8 words (${headline.split(/\s+/).length})` };
    }
    const lead = typeof obj.lead === "string" ? obj.lead.trim() : "";
    if (lead.split(/\s+/).length > 20) {
      return { ok: false, reason: `lead >20 words (${lead.split(/\s+/).length})` };
    }
    const entries = obj.entries as unknown[] | undefined;
    if (!Array.isArray(entries)) return { ok: false, reason: "entries must be array" };
    if (entries.length !== 3) {
      return { ok: false, reason: `entries must be exactly 3 (now/next/later), got ${entries.length}` };
    }
    // Major-uncertainty branch: when intake signal present, primary
    // gap MUST name the uncertainty itself — fail if the first
    // entry's title doesn't reference major / study / decided wording.
    const cert = ctx.profile.majorCertainty;
    if (cert === "not_at_all" || cert === "some_idea") {
      const firstTitle = ((entries[0] as { title?: string })?.title ?? "").toLowerCase();
      const namesMajorUncertainty = /\b(major|study|decide|undecid|don'?t know|haven'?t picked|what (?:you|to) (?:want to|want|will) study|the question)\b/.test(firstTitle);
      if (!namesMajorUncertainty) {
        return {
          ok: false,
          reason: "major-uncertainty branch: primary gap title must name the indecision itself (intake majorCertainty signal present)",
        };
      }
    }
    // Hard rule: headline must not echo first entry's title.
    const echo = checkHeadlineDoesNotRepeatFirstEntry(obj);
    if (!echo.ok) return echo;
    return semanticCheck(obj, ctx, { mustNameIntakeField: true });
  },
};

/* 05 — MONDAY MOVE (renderer-wire ID: whatToDoThisMonth)
   v7 Phase 3 (#13 part 2) reshape — payload now produces ONE
   mondayMove object instead of a 4-week schedule. The renderer
   still accepts the v6 weeks shape via its fallback path so old
   cached briefs continue to render; new generations are pure v7. */
const whatToDoThisMonth: SectionSpec = {
  id: "whatToDoThisMonth",
  heading: "What to do this month",
  reasoning: { effort: "high" },
  buildPrompt: (ctx) => `
You are writing CARD 05 (renderer-wire id: whatToDoThisMonth) of the
v7 admissions strategy brief. This card is called YOUR MONDAY MOVE.
Its job: name ONE move this week — verb + artifact + low bar — that
opens the chain of work the rest of the brief set up. Not a 4-week
plan. Not a list of three actions. ONE thing.

KEY DESIGN PRINCIPLE — executive-dysfunction-friendly:
- The move must be doable in under 1 hour.
- The move must be CONCRETE (an artifact: a doc, a file, a list,
  a draft, an email). NOT abstract ("brainstorm", "reflect",
  "research").
- The body must EXPLICITLY LOWER THE BAR — include one permission
  phrase like "don't polish", "don't make it good", "just list",
  "stop when you have three", "no need to share with anyone".
- Anchor to the BRIEF PLAN's monday-move artifact and the Card 03
  essay seed type. The move starts the chain those two set up.

LOCALLY-EXECUTABLE rule:
- Do NOT prescribe actions that require US-only infrastructure (SAT
  testing centers, Common App accounts, AP testing centers) unless
  the intake clearly indicates the student has access.
${sparseAndFramingNote(ctx)}
STUDENT PROFILE:
${profileBlock(ctx)}

${planBlock(ctx)}

CONTEXT FROM EARLIER CARDS — anchor the move to the schools / essay
seed / archetype named earlier so the move is grounded, not generic:
${dbBlock(ctx)}

GOLD EXEMPLAR — match this prose-quality bar:
  Student: Yerlan (same as Cards 01-04)
  Output:
    kicker:    "05 · Your Monday Move"
    headline:  "Open a Google Doc this week. Title it 'math in debate.'"
    lead:      "One move that opens the rest."
    mondayMove.body: "Inside, list three specific times something from a math class showed up in a debate round you ran. Don't polish. Don't make them sound profound. Just three lines, one per moment. Stop when you have three."
    mondayMove.closer: "Once those three lines exist on the page, the essay has somewhere to start."

OUTPUT — emit a JSON object exactly matching this shape:
{
  "kicker": "05 · Your Monday Move",
  "headline": "string — 6 to 12 words. The move, named as a verb-led instruction. Concrete artifact. Example shape: 'Open a Google Doc this week. Title it [X].'",
  "lead": "string — ONE sentence (max ~12 words) framing the move. Drop-cap rendered.",
  "mondayMove": {
    "headline": "string — same as the section headline above (for renderer convenience — emit it again so the card component doesn't need to peek upstream).",
    "body": "string — 3 to 5 sentences, 50 to 80 words. Explains the move, anchors to Cards 02-03 anchors, includes AT LEAST ONE low-bar permission phrase ('don't polish' / 'just list' / 'don't make it good' / 'no need to' / 'stop when').",
    "closer": "string — ONE sentence in 'Once X exists, Y starts' or 'Once X is done, Y follows' pattern. Quiet confidence, NOT hype. NO imperative."
  }
}

ABSOLUTE RULES:
- ONE move only. No "and then" / "after that" chaining in the headline.
- Time-cost implicit ≤ 1 hour. No "register for the SAT" / "email three professors."
- body MUST contain a low-bar permission phrase.
- closer does NOT prescribe additional actions.
- DO NOT also emit a "weeks" field. The v6 shape is intentionally retired in new generations.

${SHARED_JSON_RULES}`,
  validate: (raw, ctx) => {
    const obj = tryParse(raw) as Record<string, unknown> | null;
    if (!obj) return { ok: false, reason: "not valid JSON" };
    const mondayMove = obj.mondayMove as Record<string, unknown> | undefined;
    if (!mondayMove || typeof mondayMove !== "object") {
      return { ok: false, reason: "mondayMove object missing" };
    }
    const body = typeof mondayMove.body === "string" ? mondayMove.body : "";
    if (body.trim().length < 30) {
      return { ok: false, reason: "mondayMove.body missing or too short" };
    }
    // Body MUST contain a low-bar permission phrase.
    if (
      !/(don'?t polish|just list|don'?t make it good|no need to|stop when|don'?t worry about|don'?t edit)/i.test(body)
    ) {
      return {
        ok: false,
        reason: "mondayMove.body must include a low-bar permission phrase (don't polish / just list / stop when ... / etc.)",
      };
    }
    // Closer must NOT use a bare imperative (preserved from v6 rules).
    const closer = typeof mondayMove.closer === "string" ? mondayMove.closer : "";
    if (closer && /^(Stop|Do this|Don't|Begin|Start now)\.?\s/i.test(closer.trim())) {
      return { ok: false, reason: "mondayMove.closer uses bare imperative — must be suggestion mood" };
    }
    return semanticCheck(obj, ctx, { mustNameIntakeField: true });
  },
};

// 2026-05-20: howYoullPay dropped from the rendered brief — the live
// /discover database is the funding source of truth. The new
// BriefMinimal renderer doesn't include this section either. v7 spec
// (2026-05-22) confirms this — the brief no longer attempts to teach
// funding lanes; Discover IS the answer.
export const PREMIUM_SECTIONS: SectionSpec[] = [
  whereYouStand,
  whereYouCanLand,
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
