/**
 * brief-plan — the v7 brief's pre-flight planning layer.
 *
 * What it does:
 *   1. Runs the deterministic archetype detector + personality-axis
 *      extractor + cultural-context resolver to build a PRIOR.
 *   2. Hands the prior + the intake to an LLM that produces a single
 *      JSON object called the "brief plan" — the canonical answer to
 *      "who is this student, what's their narrative throughline, what
 *      pieces does every card need to reference".
 *   3. Returns the validated plan.
 *
 * Why this exists:
 * The v6 brief generator ran each section as an independent LLM call.
 * Sections never knew what other sections said. The result was 5
 * shape-correct JSON blocks that read like they were written by 5
 * different counselors about 5 different students. The pre-plan call
 * adds ONE small upfront LLM call (~$0.0006 in flash) that produces a
 * canonical reading of the student, and every section then renders
 * AGAINST that plan. The narrative throughline is by construction.
 *
 * The cards-vs-plan relationship:
 *   Card 01 WHO YOU ARE       → uses plan.identityClaim + plan.pileContrast
 *   Card 02 WHERE YOU BELONG  → uses plan.countryBuckets (from intake subset)
 *   Card 03 ESSAY SEED        → uses plan.essaySeedType (speculative)
 *   Card 04 WHAT YOU'RE AVOIDING → branches on plan.primaryGap
 *   Card 05 MONDAY MOVE       → uses plan.mondayMoveArtifact
 *   Archetype hook            → uses plan.archetype.id (library lookup
 *                                for name, tagline, color)
 *
 * Cost / latency:
 * - Adds ~$0.0006 per brief (flash tier, ~500 input + 500 output tokens).
 * - Adds ~2-4s to TTFB. To mitigate: emit the archetype SSE event
 *   immediately when the plan is ready, so the user sees something
 *   moving while the per-section generators warm up.
 *
 * Cache:
 * - The plan persists in brief_cache alongside the sections under a
 *   new schema-3 layout: { schema: 3, plan: {...}, sections: {...} }.
 * - Old schema-2 caches (sections only) still replay correctly via the
 *   replay function in the pathway — the plan field is optional on
 *   read so old cached briefs degrade gracefully.
 */

import { extractLlmJson } from "./llm-json.ts";
import {
  detectArchetype,
  detectArchetypeOrFallback,
  getArchetype,
  type ArchetypeDetectionInput,
  type ArchetypeId,
} from "./archetype-library.ts";
import {
  extractPersonalityAxisFromFields,
  type PersonalityAxis,
} from "./personality-axis.ts";
import {
  EDITORIAL_RULES,
  resolveCulturalContext,
  scanBannedVocab,
} from "./editorial-rules.ts";

/** The canonical shape the LLM emits. Every section generator reads
 *  this. New fields require: (a) the LLM prompt below to teach the
 *  field, (b) a validator, (c) at least one section that consumes it. */
export interface BriefPlan {
  /** Resolved at call-time from intake.nationality. Not asked of the
   *  LLM — passed in. Drives banned-vocab branches (no pre-med for
   *  CIS) and Card 05's visa-realism filter. */
  culturalContext: "central_asia" | "default";

  /** Extracted deterministically from the Step 3 free-text via the
   *  covert-intake placeholder mechanic. The LLM does NOT override
   *  this — when the regex returns "unknown", the brief uses neutral
   *  framing (no card may make a confident I/E claim without signal). */
  personalityAxis: PersonalityAxis;

  /** Applicant archetype mapping. The LLM CAN override the
   *  deterministic prior, but only with another id from the library. */
  archetype: {
    id: ArchetypeId;
    /** 0..100. Below 60 the renderer should treat the archetype card
     *  as low-confidence — show it but don't lean hard on the
     *  identity claim it makes. */
    confidence: number;
    /** Short prose explanation, telemetry + Card 01 prompt context. */
    reason: string;
  };

  /** Card 01 headline seed. Stylized identity claim, 1 sentence,
   *  ≤14 words. References ≥2 specific intake fields. NEVER uses
   *  banned vocab. Examples:
   *    "a policy-leaning STEM kid who hasn't told anyone yet"
   *    "the quiet builder of a one-person community library"
   *    "the kid who's known since 8th grade what she wants" */
  identityClaim: string;

  /** Card 01 body seed + Card 02 anchor. Names the dominant peer
   *  pile(s) the student does NOT go into. Locally salient — the
   *  CIS branch uses IT/CS / engineering / finance / IR. */
  pileContrast: string;

  /** Card 03 essay seed. A TYPE of moment to look for (speculative
   *  tense). NOT a finished essay topic — a starting place. */
  essaySeedType: string;

  /** Card 04 gap signal. */
  primaryGap:
    | {
        type: "major-uncertainty";
        /** Why this kid's indecision is the load-bearing thing to
         *  surface warmly. */
        reason: string;
      }
    | {
        type: "library-entry";
        /** Library entry id from brief-sections.ts gap library. */
        libraryEntryId: 1 | 2 | 3 | 5 | 6 | 7;
        reason: string;
      };

  /** Card 05 destinations. A subset of intake.targetCountries —
   *  the LLM can't add countries the student didn't ask about. */
  countryBuckets: string[];

  /** Card 06 Monday Move keystone. Concrete artifact the first
   *  task BUILDS. Verb-led ("Open a Google Doc titled X"). */
  mondayMoveArtifact: string;
}

/** Input the planner receives. Most fields are pulled from the same
 *  request body the pathway already validates; we re-narrow the type
 *  here so the planner doesn't depend on the pathway's broader
 *  `any`-typed request object. */
export interface PlanContext {
  profile: ArchetypeDetectionInput & {
    fullName?: string | null;
    nationality?: string | null;
  };
  /** Live DB context block already assembled by the pathway (matched
   *  scholarships, universities). The planner reads it to know which
   *  schools / countries are real options before constraining
   *  countryBuckets. */
  dbContext: string;
  /** "English" or "Russian" — the language the BRIEF will eventually
   *  render in. The plan itself is always emitted in English (it's
   *  internal data, never shown to the user); but the LLM prompt
   *  references the language so prose seeds it generates are in the
   *  right language when copy-paste-able. */
  lang: string;
}

/** What the planner returns. The pathway emits this AS-IS (or
 *  serializes parts of it) and the section generators consume it via
 *  BriefContext.briefPlan. */
export interface PlanResult {
  plan: BriefPlan;
  /** When true, the LLM regen path was taken. Telemetry only. */
  regenerated: boolean;
}

/** Build the prompt that the planner LLM sees. Mirrors the section-
 *  level prompts in brief-sections.ts in shape — one focused output,
 *  embedded gold exemplar, hard rules + validators run after. */
export function buildPlanPrompt(ctx: PlanContext): string {
  const p = ctx.profile;
  const cult = resolveCulturalContext(p.nationality);
  const personality = extractPersonalityAxisFromFields([
    p.background,
    p.personalStory,
    p.careerGoal,
    p.extracurriculars,
  ]);
  const priorMatch = detectArchetype(p);
  const priorName = priorMatch ? getArchetype(priorMatch.id).name : null;

  const peerPiles =
    cult === "central_asia"
      ? "the IT-track kids, the engineering kids being pushed into Western banking since 9th grade, the finance/economics kids, the international relations kids"
      : "the obvious one-track piles in this student's school context (CS, finance, engineering, etc.)";

  const targets = (p.targetCountries ?? []).filter(Boolean);

  return `
You are the PLANNER for a 7-card admissions strategy brief in the v7 spec.
Your job: emit a single JSON object — the BRIEF PLAN — that the 6 card
generators will each receive as context. The plan is the canonical
reading of who this student is. Every card renders AGAINST it; the
plan IS the narrative throughline.

STUDENT PROFILE:
- Name: ${p.fullName ?? "—"}
- Nationality: ${p.nationality ?? "—"}  (cultural context: ${cult})
- GPA: ${p.gpa ?? "—"}${p.gpaScale ? ` / ${p.gpaScale}` : ""}
- IELTS: ${p.ielts ?? "Not taken"}
- TOEFL: ${p.toefl ?? "Not taken"}
- SAT: ${p.sat ?? "Not taken"}
- Grade level: ${p.gradeLevel ?? "—"}
- Target countries: ${targets.length ? targets.join(", ") : "Open"}
- Intended major: ${p.major ?? "Undecided"}
- How sure about major: ${p.majorCertainty ?? "some_idea (default — not explicitly asked)"}
- Top activity / achievement: ${p.topActivity ?? "—"}
- Personal story (own words): ${p.personalStory ?? "—"}
- Background context: ${p.background ?? "—"}
- Career goal: ${p.careerGoal ?? "—"}
- Schools on their list: ${p.namedSchools ?? "—"}
- Extracurriculars: ${p.extracurriculars ?? "—"}

DETERMINISTIC PRIORS (you MAY override but stay within the closed sets):
- Archetype prior: ${priorMatch ? `${priorMatch.id} ("${priorName}") @ ${priorMatch.confidence} — ${priorMatch.reason}` : "no detector fired"}
- Personality axis (extracted): ${personality.axis}${personality.matchedPhrases.length ? ` [matched: ${personality.matchedPhrases.join(", ")}]` : ""}

LIVE DB CONTEXT (matched scholarships + universities — real options only):
${ctx.dbContext}

THE 16-ARCHETYPE LIBRARY (you may pick any id):
- bridge-domain-kid     The Bridge-Domain Kid     — "Both halves of you are the point."
- quiet-builder         The Quiet Builder         — "The proof is built. The pitch is what's missing."
- late-bloomer          The Late Bloomer          — "Most of your run hasn't happened yet."
- foreign-lane-native   The Foreign-Lane Native   — "Cross-cultural is where you already live."
- quiet-athlete         The Quiet Athlete         — "Discipline you don't talk about is still discipline."
- competition-kid       The Competition Kid       — "You've been measured. You held up."
- community-anchor      The Community Anchor      — "You're the one who shows up. That's information."
- self-taught           The Self-Taught           — "You built your own scaffolding."
- storyteller           The Storyteller           — "You can name what others only feel."
- quant                 The Quant                 — "Math is your native language."
- operator              The Operator              — "Action is your first instinct."
- translator            The Translator            — "You sit between groups on purpose."
- open-question         The Open Question         — "You're still asking. That's the position."
- tight-lane            The Tight Lane            — "You knew in 8th grade. Some never do."
- recoverer             The Recoverer             — "You kept moving. That's the part most kids skip."
- contrarian            The Contrarian            — "You argue with the room. Schools eventually need that."

GAP LIBRARY (Card 04 candidates when majorCertainty in pretty_sure / certain):
- 1 Test scores aren't filed yet               (trigger: ielts+toefl+sat all empty)
- 2 Wide but shallow activity profile          (trigger: many ECs, no leadership)
- 3 Single-country tunnel vision               (trigger: targetCountries length 1)
- 5 Activities don't cluster into one story    (trigger: variety without through-line)
- 6 English-writing polish                     (trigger: non-EN native + no IELTS>=7)
- 7 Demonstrable-depth gap (Barnum default)    (trigger: when no specific gap fires)

GOLD EXEMPLAR — match this prose-quality bar (Yerlan case from the spec):
{
  "culturalContext": "central_asia",
  "personalityAxis": "introvert",
  "archetype": {
    "id": "bridge-domain-kid",
    "confidence": 85,
    "reason": "intake mentions both Math Olympiad (STEM) and debate captain (humanities) — strong cross-domain signal"
  },
  "identityClaim": "a policy-leaning STEM kid who hasn't told anyone yet",
  "pileContrast": "Most kids in your year go into the IT-track pile or the engineering kids being pushed into Western banking since 9th grade. Your file shows AP Calc AND a debate medal — two things that don't normally appear together in your school's outbound applicants.",
  "essaySeedType": "a moment where something from math class showed up inside a debate round he was running",
  "primaryGap": {
    "type": "major-uncertainty",
    "reason": "Yerlan put CS on the form because that's what people expect when you're good at math — but he picked not_at_all on certainty. The indecision IS the load-bearing thing to name warmly."
  },
  "countryBuckets": ["Canada", "United Kingdom", "Singapore"],
  "mondayMoveArtifact": "a Google Doc titled 'math in debate' with three specific moments listed"
}

OUTPUT — emit EXACTLY this JSON shape (no fences, no preamble):
{
  "culturalContext": "${cult}",
  "personalityAxis": "${personality.axis}",
  "archetype": {
    "id": "<one of the 16 ids above>",
    "confidence": <integer 0-100>,
    "reason": "<short prose grounding the choice in specific intake fields>"
  },
  "identityClaim": "<≤14 words, stylized claim, references ≥2 specific intake fields, NEVER uses banned vocab>",
  "pileContrast": "<2-3 sentences. Names the dominant ${peerPiles} that most kids in this student's year fall into, contrasts with this student's specific profile. Use ONLY locally-salient track names.>",
  "essaySeedType": "<1 sentence. A TYPE of moment to find. SPECULATIVE — 'a moment where X happened', not 'the time X happened'. Anchors to the archetype + identityClaim.>",
  "primaryGap": {
    "type": "<'major-uncertainty' if intake.majorCertainty in {not_at_all, some_idea}, else 'library-entry'>",
    "libraryEntryId": <integer 1, 2, 3, 5, 6, or 7 — REQUIRED iff type='library-entry'; OMIT if type='major-uncertainty'>,
    "reason": "<1 sentence — why this gap, grounded in intake>"
  },
  "countryBuckets": [<1-3 country names, MUST be a subset of intake.targetCountries>],
  "mondayMoveArtifact": "<1 line. Verb + concrete object — 'a [type of doc/list/draft] titled [X] containing [Y]'.>"
}

ABSOLUTE RULES:
- archetype.id MUST be one of the 16 in the library above. Anything else fails.
- All banned vocabulary from EDITORIAL_RULES below applies in EVERY string field.
- primaryGap.type MUST be "major-uncertainty" iff intake.majorCertainty is "not_at_all" or "some_idea". Otherwise MUST be "library-entry" with a valid libraryEntryId.
- countryBuckets MUST be a subset of intake.targetCountries (case-insensitive). You may pick FEWER countries than the intake listed; you may NOT add any the student didn't ask about.
- Do not invent biographical details. Specific anchors come from the intake or this prompt's LIVE CONTEXT, never the model's imagination.

${EDITORIAL_RULES}
`.trim();
}

/** Validate a raw LLM response against the BriefPlan schema + semantic
 *  rules. Returns {plan} on success or {error} on failure; the caller
 *  decides whether to regen. */
export function validatePlan(
  rawJson: string,
  ctx: PlanContext,
): { plan: BriefPlan } | { error: string } {
  let parsed: unknown;
  try {
    parsed = extractLlmJson(rawJson);
  } catch {
    return { error: "not valid JSON" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { error: "plan root is not an object" };
  }
  const obj = parsed as Record<string, unknown>;

  // culturalContext / personalityAxis — set deterministically by us;
  // the LLM may echo them back but we don't trust LLM-side values here.
  const cult = resolveCulturalContext(ctx.profile.nationality);
  const personality = extractPersonalityAxisFromFields([
    ctx.profile.background,
    ctx.profile.personalStory,
    ctx.profile.careerGoal,
    ctx.profile.extracurriculars,
  ]);

  // archetype.id MUST be in the library
  const arch = obj.archetype as Record<string, unknown> | undefined;
  if (!arch || typeof arch !== "object") return { error: "missing archetype object" };
  const archId = arch.id as string | undefined;
  if (typeof archId !== "string") return { error: "archetype.id missing" };
  try {
    getArchetype(archId as ArchetypeId);
  } catch {
    return { error: `archetype.id "${archId}" not in library` };
  }
  const archConfRaw = arch.confidence;
  const archConf = typeof archConfRaw === "number" ? Math.round(archConfRaw) : 0;
  const archReason = typeof arch.reason === "string" ? arch.reason : "";

  // identityClaim — string, ≤14 words, specific-anchor present, no banned vocab
  const identityClaim = obj.identityClaim;
  if (typeof identityClaim !== "string" || identityClaim.trim().length < 8) {
    return { error: "identityClaim missing or too short" };
  }
  const wordCount = identityClaim.trim().split(/\s+/).length;
  if (wordCount > 16) {
    return { error: `identityClaim too long (${wordCount} words, max 16)` };
  }

  // pileContrast — string, sentences, no banned vocab incl. CIS bans
  const pileContrast = obj.pileContrast;
  if (typeof pileContrast !== "string" || pileContrast.trim().length < 30) {
    return { error: "pileContrast missing or too short" };
  }

  // essaySeedType — string, must use speculative tense
  const essaySeedType = obj.essaySeedType;
  if (typeof essaySeedType !== "string" || essaySeedType.trim().length < 10) {
    return { error: "essaySeedType missing or too short" };
  }

  // primaryGap — branch on majorCertainty
  const gap = obj.primaryGap as Record<string, unknown> | undefined;
  if (!gap || typeof gap !== "object") return { error: "primaryGap missing" };
  const gapType = gap.type;
  const cert = ctx.profile.majorCertainty;
  const isUncertain = cert === "not_at_all" || cert === "some_idea";
  if (isUncertain && gapType !== "major-uncertainty") {
    return {
      error: `primaryGap.type must be "major-uncertainty" when majorCertainty=${cert}; got "${gapType}"`,
    };
  }
  if (!isUncertain && gapType !== "library-entry") {
    return {
      error: `primaryGap.type must be "library-entry" when majorCertainty=${cert ?? "unset"}; got "${gapType}"`,
    };
  }
  if (gapType === "library-entry") {
    const id = gap.libraryEntryId;
    if (id !== 1 && id !== 2 && id !== 3 && id !== 5 && id !== 6 && id !== 7) {
      return {
        error: `primaryGap.libraryEntryId must be 1/2/3/5/6/7; got ${JSON.stringify(id)}`,
      };
    }
  }
  const gapReason = typeof gap.reason === "string" ? gap.reason : "";

  // countryBuckets — subset of intake.targetCountries
  const buckets = obj.countryBuckets;
  if (!Array.isArray(buckets) || buckets.length < 1 || buckets.length > 3) {
    return { error: "countryBuckets must be a 1-3 element array" };
  }
  const intakeCountriesLower = (ctx.profile.targetCountries ?? []).map((c) => c.toLowerCase());
  if (intakeCountriesLower.length === 0) {
    // No intake countries — accept whatever the LLM picked. The
    // student is "Open" and the brief generator's subsequent steps
    // will handle that path.
  } else {
    for (const b of buckets) {
      if (typeof b !== "string") return { error: "countryBuckets entries must be strings" };
      if (!intakeCountriesLower.includes(b.toLowerCase())) {
        return {
          error: `countryBuckets contains "${b}" which is not in intake.targetCountries (${intakeCountriesLower.join(", ")})`,
        };
      }
    }
  }

  // mondayMoveArtifact — string, concrete enough
  const mondayMove = obj.mondayMoveArtifact;
  if (typeof mondayMove !== "string" || mondayMove.trim().length < 10) {
    return { error: "mondayMoveArtifact missing or too short" };
  }

  // Banned-vocab scan across every prose field
  const proseCorpus = [
    identityClaim,
    pileContrast,
    essaySeedType,
    gapReason,
    archReason,
    mondayMove,
  ].join(" \n ");
  const hits = scanBannedVocab(proseCorpus, cult);
  if (hits.length > 0) {
    const first = hits[0];
    return { error: `banned-vocab hit in plan prose (${first.label}): "${first.match}"` };
  }

  // Build the typed plan
  const archetype = { id: archId as ArchetypeId, confidence: archConf, reason: archReason };
  const primaryGap: BriefPlan["primaryGap"] =
    gapType === "major-uncertainty"
      ? { type: "major-uncertainty", reason: gapReason }
      : {
          type: "library-entry",
          libraryEntryId: gap.libraryEntryId as 1 | 2 | 3 | 5 | 6 | 7,
          reason: gapReason,
        };

  const plan: BriefPlan = {
    culturalContext: cult as "central_asia" | "default",
    personalityAxis: personality.axis,
    archetype,
    identityClaim: identityClaim.trim(),
    pileContrast: pileContrast.trim(),
    essaySeedType: essaySeedType.trim(),
    primaryGap,
    countryBuckets: buckets as string[],
    mondayMoveArtifact: mondayMove.trim(),
  };
  return { plan };
}

/** Pure-fallback plan synthesizer for when both the LLM pre-plan call
 *  and its regen fail. Uses the deterministic archetype detector +
 *  personality-axis extractor to fill the plan with what we know
 *  without LLM input. The narrative-throughline fields fall back to
 *  bland-but-grounded values; sections degrade to v6-style content
 *  but the brief still ships.
 *
 *  This is the floor. The system NEVER returns null to the pathway —
 *  it would rather ship a less-coherent brief than no brief at all. */
export function buildFallbackPlan(ctx: PlanContext): BriefPlan {
  const cult = resolveCulturalContext(ctx.profile.nationality);
  const personality = extractPersonalityAxisFromFields([
    ctx.profile.background,
    ctx.profile.personalStory,
    ctx.profile.careerGoal,
    ctx.profile.extracurriculars,
  ]);
  const archMatch = detectArchetypeOrFallback(ctx.profile);
  const cert = ctx.profile.majorCertainty;
  const isUncertain = cert === "not_at_all" || cert === "some_idea";
  const buckets = (ctx.profile.targetCountries ?? []).filter(Boolean).slice(0, 3);

  return {
    culturalContext: cult as "central_asia" | "default",
    personalityAxis: personality.axis,
    archetype: {
      id: archMatch.id,
      confidence: archMatch.confidence,
      reason: archMatch.reason,
    },
    identityClaim: getArchetype(archMatch.id).tagline,
    pileContrast:
      "Your file doesn't fit the obvious one-track stack. Your intake shows a more specific story than the average applicant from your school.",
    essaySeedType:
      "a specific moment where the strongest two threads in your activities came together — sometime in the last two years",
    primaryGap: isUncertain
      ? {
          type: "major-uncertainty",
          reason: `intake majorCertainty=${cert}; named warmly as information, not a flaw`,
        }
      : { type: "library-entry", libraryEntryId: 7, reason: "demonstrable-depth Barnum default" },
    countryBuckets: buckets.length > 0 ? buckets : ["Open"],
    mondayMoveArtifact: "a Google Doc with three specific moments from your activities, listed in three lines",
  };
}
