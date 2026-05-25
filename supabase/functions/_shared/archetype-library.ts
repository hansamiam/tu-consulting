/**
 * archetype-library — the v7 brief's "applicant archetype" data file.
 *
 * The archetype is the brief's IDENTITY HOOK — a Buzzfeed-quiz-style
 * named bucket the student gets mapped to. Same archetype name, same
 * tagline, same color every time. Over months of briefs in the wild
 * the archetypes become socially-known reference points among
 * students ("I'm a Quiet Builder, you?"), which is the whole point.
 *
 * Why a CLOSED library, not LLM-generated:
 * - Brand consistency. Gryffindor isn't named differently per book.
 * - Share-asset color palette is fixed in code (16 colors, one per
 *   archetype) — IG-Story-shaped Wrapped-Bold renders use the
 *   archetype's color as the saturated background.
 * - Sharing currency: when "Bridge-Domain Kid" gets shared a hundred
 *   times, the name itself starts to mean something. New names
 *   per brief would dilute that.
 *
 * The detection pipeline (when wired in Phase 2):
 *   1. detectArchetype(profile) runs the deterministic heuristics here
 *      and returns the highest-confidence match (or null).
 *   2. The pre-flight LLM call examines the intake + the heuristic
 *      result and either confirms it or overrides with a better
 *      match — but ONLY to a name from this library.
 *   3. If the final confidence < 60 (LLM-side judgment), fall back
 *      to "open-question" (the largest-cohort default that fits
 *      most teens — "you're still asking, that's the position").
 *
 * The heuristics here are intentionally CONSERVATIVE — they fire only
 * on strong, unambiguous signals. Borderline cases let the LLM
 * pre-plan call disambiguate (Phase 2). For PR-scope sanity this file
 * exports the library + the heuristic mapper, but no LLM call yet.
 */

/** Stable identifier used in DB rows, telemetry, and share-asset URLs.
 *  Once an archetype id is in production it MUST NOT change — old
 *  briefs persist this id in their cached payloads. */
export type ArchetypeId =
  | "bridge-domain-kid"
  | "quiet-builder"
  | "late-bloomer"
  | "foreign-lane-native"
  | "quiet-athlete"
  | "competition-kid"
  | "community-anchor"
  | "self-taught"
  | "storyteller"
  | "quant"
  | "operator"
  | "translator"
  | "open-question"
  | "tight-lane"
  | "recoverer"
  | "contrarian";

export interface Archetype {
  id: ArchetypeId;
  /** Display name shown on the share card. UPPER-CASE in Wrapped-Bold
   *  treatment, mixed case in editorial render. Never localized — the
   *  archetype is a brand object, like a Hogwarts house. */
  name: string;
  /** 1-line definition. Becomes the card's body text. Should read
   *  evocatively in isolation (the share asset has nothing else). */
  tagline: string;
  /** Single saturated color for the Wrapped-Bold share-asset
   *  background. 16-color palette, one per archetype, hand-picked to
   *  feel distinct from any neighbor when seen in a grid. Hex #RRGGBB. */
  color: string;
}

/* ─── The 16 archetypes ──────────────────────────────────────────────
 * Order matters: when two heuristics tie on confidence, the EARLIER
 * one wins. The list is roughly ordered from "most-specific" (Bridge-
 * Domain Kid needs two strong fields colliding) to "most-default"
 * (Open Question fits a huge cohort). */
export const ARCHETYPE_LIBRARY: ReadonlyArray<Archetype> = [
  // v7 PR brand-palette pass (Q2=C, 2026-05-23): every color is now
  // anchored to Top Uni's navy + gold family (HSL navy 210 70% 20%,
  // gold 41 61% 47% per src/index.css). Cool archetypes live in the
  // navy hue range (195–225 H, 12–60% S); warm archetypes live in
  // the gold range (15–40 H, 35–55% S); neutrals sit between. Each
  // hex stays distinct enough to differentiate at thumbnail size in
  // a grid, but the eye reads the whole set as "this is TopUni" —
  // not the periwinkle/terracotta/mulberry rainbow the prior random
  // palette produced.
  {
    id: "bridge-domain-kid",
    name: "The Bridge-Domain Kid",
    tagline: "Both halves of you are the point.",
    color: "#3A4E66", // slate navy — sophisticated cross-domain blue
  },
  {
    id: "quiet-builder",
    name: "The Quiet Builder",
    // 2026-05-25: ditched the "X, not-yet-Y" antithesis pattern.
    tagline: "The proof is built. The pitch is what's missing.",
    color: "#586B62", // sage-navy — soft, growing, understated
  },
  {
    id: "late-bloomer",
    name: "The Late Bloomer",
    tagline: "Most of your run hasn't happened yet.",
    color: "#BC8F61", // peach gold — sunrise, lifting
  },
  {
    id: "foreign-lane-native",
    name: "The Foreign-Lane Native",
    tagline: "Cross-cultural is where you already live.",
    color: "#3F575F", // teal-navy — cool, in-between
  },
  {
    id: "quiet-athlete",
    name: "The Quiet Athlete",
    tagline: "Discipline you don't talk about is still discipline.",
    color: "#57636B", // stone-navy — disciplined neutral
  },
  {
    id: "competition-kid",
    name: "The Competition Kid",
    tagline: "You've been measured. You held up.",
    color: "#836241", // bronze gold — achievement, slightly tarnished from use
  },
  {
    id: "community-anchor",
    name: "The Community Anchor",
    tagline: "You're the one who shows up. That's information.",
    color: "#B58838", // signature warm amber — the brand gold itself
  },
  {
    id: "self-taught",
    name: "The Self-Taught",
    tagline: "You built your own scaffolding. Most waited for theirs.",
    color: "#3F557B", // cobalt-navy — independent, slightly cooler blue
  },
  {
    id: "storyteller",
    name: "The Storyteller",
    tagline: "You can name what others only feel.",
    color: "#B07866", // rose-gold — warmer, narrative-soft
  },
  {
    id: "quant",
    name: "The Quant",
    // 2026-05-25: Samuel called out "You're not 'good at math.' You're
    // inside it." as classic ChatGPT antithesis-slop ("not-X, but-Y").
    // Replaced with a direct identity statement — no "not/but" rhetoric.
    tagline: "Math is your native language.",
    color: "#1D3A5C", // deep navy — analytical, precise
  },
  {
    id: "operator",
    name: "The Operator",
    // 2026-05-25: ditched the "you don't X. you Y" antithesis pattern.
    tagline: "Action is your first instinct.",
    color: "#946D32", // burnt gold — commanding, action-warm
  },
  {
    id: "translator",
    name: "The Translator",
    tagline: "You sit between groups on purpose.",
    color: "#4A546F", // dusk-navy — between cool and warm, mediating
  },
  {
    id: "open-question",
    name: "The Open Question",
    tagline: "You're still asking. That's the position.",
    color: "#6F6963", // warm graphite — the neutral default, slightly gold-tinted
  },
  {
    id: "tight-lane",
    name: "The Tight Lane",
    tagline: "You knew in 8th grade. Some never do.",
    color: "#122A47", // ink navy — committed, dark certainty
  },
  {
    id: "recoverer",
    name: "The Recoverer",
    tagline: "You kept moving. That's the part most kids skip.",
    color: "#9E6650", // copper-rose — warm earth, resilient
  },
  {
    id: "contrarian",
    name: "The Contrarian",
    tagline: "You argue with the room. Schools eventually need that.",
    color: "#3A414E", // charcoal-navy — independent, gray-blue dissent
  },
];

/** Quick lookup by id. Throws if the id isn't in the library — that
 *  should never happen at runtime because the type system constrains
 *  callers, but the throw makes a future typo break loudly. */
export function getArchetype(id: ArchetypeId): Archetype {
  const found = ARCHETYPE_LIBRARY.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown archetype id: ${id}`);
  return found;
}

/** Intake fields the archetype detector reads. Mirrors a subset of
 *  BriefContext.profile but typed loosely so callers can pass plain
 *  request bodies without re-typing. Optional fields default to ""/[]
 *  inside the detector. */
export interface ArchetypeDetectionInput {
  major?: string | null;
  fieldOfStudy?: string | null;
  majorCertainty?: "not_at_all" | "some_idea" | "pretty_sure" | "certain" | null;
  topActivity?: string | null;
  personalStory?: string | null;
  background?: string | null;
  extracurriculars?: string | null;
  careerGoal?: string | null;
  namedSchools?: string | null;
  nationality?: string | null;
  /** Self-reported GPA + scale. Both optional. */
  gpa?: string | number | null;
  gpaScale?: string | null;
  ielts?: string | number | null;
  toefl?: string | number | null;
  sat?: string | number | null;
  gradeLevel?: string | null;
  targetCountries?: string[] | null;
}

interface ArchetypeMatch {
  id: ArchetypeId;
  /** 0..100. 60+ is considered confident enough to use without LLM
   *  override; below 60 the pre-plan call should re-examine. */
  confidence: number;
  /** Short prose explanation of WHY this match fired, for telemetry +
   *  the regen-prompt context if the LLM wants to know the heuristic's
   *  reasoning. */
  reason: string;
}

/* ─── Heuristic helpers ───────────────────────────────────────────── */

const lc = (v: string | number | null | undefined): string => String(v ?? "").toLowerCase();

/** Activity / story / background / career-goal text concatenated. The
 *  detectors search this corpus for keyword patterns rather than
 *  inspecting each field in isolation — students put things in
 *  whichever field feels natural to them. */
const buildCorpus = (input: ArchetypeDetectionInput): string => {
  return [
    input.topActivity,
    input.personalStory,
    input.background,
    input.extracurriculars,
    input.careerGoal,
    input.namedSchools,
    input.major,
    input.fieldOfStudy,
  ]
    .map((v) => lc(v))
    .filter((s) => s.length > 0)
    .join(" \n ");
};

const STEM_KEYWORDS =
  /\b(math|olymp|olimpiad|physics|chemistry|biology|coding|programming|algorithm|computer science|engineering|robotics|stem|calculus|data science|machine learning|ai|artificial intelligence)\b/i;

const HUMANITIES_KEYWORDS =
  /\b(debate|model un|mun|policy|politic|history|philosophy|literature|writing|journalism|essay|rhetoric|civic|model united nations|international relations|law|legal)\b/i;

const COMPETITION_KEYWORDS =
  /\b(olympiad|olimpiad|imo|ipho|icho|ibo|iomo|nationals?|finalist|gold medal|silver medal|bronze medal|first place|second place|third place|top.?(\d+)|laureate|champion)\b/i;

const LEADERSHIP_KEYWORDS =
  /\b(founded|founder|co-founder|president|captain|led|leading|leader|organiz(ed|ing|er)|started|launched|head of|chair|director)\b/i;

const COMMUNITY_KEYWORDS =
  /\b(volunteer|community|outreach|charity|nonprofit|tutor|mentor|service|civic|local|neighborhood|orphanage|shelter|food bank|library)\b/i;

const SELF_TAUGHT_KEYWORDS =
  /\b(self-?taught|self-?study|online course|coursera|edx|youtube|on my own|figured.{1,10}out|taught myself|built my own)\b/i;

const STORYTELLER_KEYWORDS =
  /\b(writing|writer|essay|novel|poem|poet|playwright|journalism|film|filmmak|director|photograph|documentary|youtube channel|podcast|blog)\b/i;

const ATHLETE_KEYWORDS =
  /\b(soccer|football|basketball|volleyball|tennis|swimming|swim team|track|cross country|wrestling|boxing|martial arts|judo|karate|taekwondo|ballet|dance|gymnast|rowing|cycling|chess|esports?)\b/i;

const CONTRARIAN_KEYWORDS =
  /\b(disagree|argued? against|challenged|questioned|opposed|dissent|contrarian|skeptic|push.?back|protest|controversial|unpopular opinion)\b/i;

const RECOVERY_KEYWORDS =
  /\b(survived|recovered|after.{1,20}(illness|surgery|accident|loss|death|divorce|moving|moved)|despite|came back|second chance|relapse|sober|broke up|got back|kept going)\b/i;

const FOREIGN_LANE_KEYWORDS =
  /\b(third.?culture|bilingual|trilingual|multilingual|grew up in.{1,30}(and|then)|lived in (multiple|two|three|several)|immigrant|expat|exchange|international school|moved (to|from|here))\b/i;

const HARD_MAJOR_INDICATORS =
  /\b(8th grade|9th grade|since (i was|elementary|middle school|childhood)|always.{1,20}(wanted|knew|loved)|ever since)\b/i;

/* ─── The detectors, in priority order ────────────────────────────── */

function detectBridgeDomainKid(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  const stem = STEM_KEYWORDS.test(corpus);
  const hum = HUMANITIES_KEYWORDS.test(corpus);
  if (stem && hum) {
    return {
      id: "bridge-domain-kid",
      confidence: 85,
      reason: "intake mentions both STEM and humanities/policy/debate signals",
    };
  }
  return null;
}

function detectCompetitionKid(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (COMPETITION_KEYWORDS.test(corpus)) {
    // Strong if 2+ competition mentions, weaker if just one.
    const matches = corpus.match(COMPETITION_KEYWORDS);
    const count = matches ? matches.length : 0;
    return {
      id: "competition-kid",
      confidence: count >= 2 ? 80 : 65,
      reason: `intake mentions competition / olympiad / placement (${count} hit${count === 1 ? "" : "s"})`,
    };
  }
  return null;
}

function detectForeignLaneNative(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (FOREIGN_LANE_KEYWORDS.test(corpus)) {
    return {
      id: "foreign-lane-native",
      confidence: 75,
      reason: "intake mentions cross-cultural / multilingual / lived-abroad signals",
    };
  }
  return null;
}

function detectRecoverer(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (RECOVERY_KEYWORDS.test(corpus)) {
    return {
      id: "recoverer",
      confidence: 75,
      reason: "intake background / story names a disruption the student moved through",
    };
  }
  return null;
}

function detectOperator(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (LEADERSHIP_KEYWORDS.test(corpus)) {
    return {
      id: "operator",
      confidence: 70,
      reason: "intake names a leadership / founding / running-something role",
    };
  }
  return null;
}

function detectCommunityAnchor(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (COMMUNITY_KEYWORDS.test(corpus)) {
    return {
      id: "community-anchor",
      confidence: 70,
      reason: "intake names volunteer / community / civic engagement",
    };
  }
  return null;
}

function detectSelfTaught(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (SELF_TAUGHT_KEYWORDS.test(corpus)) {
    return {
      id: "self-taught",
      confidence: 75,
      reason: "intake names self-taught / online-learning / built-it-themselves",
    };
  }
  return null;
}

function detectStoryteller(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (STORYTELLER_KEYWORDS.test(corpus)) {
    return {
      id: "storyteller",
      confidence: 70,
      reason: "intake names writing / film / arts / narrative-craft activity",
    };
  }
  return null;
}

function detectQuant(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  // STEM keywords but NO humanities keywords — pure-STEM lane.
  const stem = STEM_KEYWORDS.test(corpus);
  const hum = HUMANITIES_KEYWORDS.test(corpus);
  const majorIsQuant = /\b(math|physics|computer science|data science|engineering|statistics)\b/i.test(
    lc(input.major) + " " + lc(input.fieldOfStudy),
  );
  if (stem && !hum && majorIsQuant) {
    return {
      id: "quant",
      confidence: 70,
      reason: "intake reads as pure-STEM (math/physics/CS major + STEM-only activity signals)",
    };
  }
  return null;
}

function detectQuietAthlete(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (ATHLETE_KEYWORDS.test(corpus)) {
    return {
      id: "quiet-athlete",
      confidence: 65,
      reason: "intake mentions a sport / athletic / dance practice",
    };
  }
  return null;
}

function detectContrarian(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  const corpus = buildCorpus(input);
  if (CONTRARIAN_KEYWORDS.test(corpus)) {
    return {
      id: "contrarian",
      confidence: 65,
      reason: "intake names argued-against / dissent / questioning behaviour",
    };
  }
  return null;
}

function detectTightLane(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  if (input.majorCertainty !== "certain") return null;
  const corpus = buildCorpus(input);
  // Certain on major + early-focus self-description.
  if (HARD_MAJOR_INDICATORS.test(corpus)) {
    return {
      id: "tight-lane",
      confidence: 85,
      reason: "majorCertainty=certain + intake narrative mentions early/long-standing focus",
    };
  }
  // Certain on major alone — still likely Tight Lane but lower confidence.
  return {
    id: "tight-lane",
    confidence: 65,
    reason: "majorCertainty=certain (no narrative confirmation, may be Quiet Builder etc.)",
  };
}

function detectOpenQuestion(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  if (input.majorCertainty !== "not_at_all" && input.majorCertainty !== "some_idea") {
    return null;
  }
  // Open Question is the BARNUM default — it should win when nothing
  // more specific fits. If the student has a clear activity signature
  // (leadership, competition, community, storytelling, athletic, etc.)
  // those identity claims are sharper, so we DEFER to them by firing
  // Open Question below the 60-confidence floor. Otherwise it fires
  // at 75 and wins as the fallback identity for a teen whose biggest
  // truth right now IS the indecision.
  const corpus = buildCorpus(input);
  const hasStrongOther =
    LEADERSHIP_KEYWORDS.test(corpus) ||
    COMPETITION_KEYWORDS.test(corpus) ||
    COMMUNITY_KEYWORDS.test(corpus) ||
    STORYTELLER_KEYWORDS.test(corpus) ||
    FOREIGN_LANE_KEYWORDS.test(corpus) ||
    ATHLETE_KEYWORDS.test(corpus) ||
    SELF_TAUGHT_KEYWORDS.test(corpus);
  return {
    id: "open-question",
    confidence: hasStrongOther ? 55 : 75,
    reason: hasStrongOther
      ? `majorCertainty=${input.majorCertainty} but intake has stronger specific signals — deferring to a more grounded archetype`
      : `majorCertainty=${input.majorCertainty} — student openly hasn't picked yet, no other strong signal`,
  };
}

function detectQuietBuilder(input: ArchetypeDetectionInput): ArchetypeMatch | null {
  // Quiet Builder fires when there's activity content but NO obvious
  // leadership / competition signal. The student is doing stuff but
  // hasn't won/led visibly.
  const corpus = buildCorpus(input);
  const hasActivity = corpus.length > 60; // arbitrary "substantive content" threshold
  if (!hasActivity) return null;
  if (LEADERSHIP_KEYWORDS.test(corpus)) return null; // Operator wins
  if (COMPETITION_KEYWORDS.test(corpus)) return null; // Competition Kid wins
  return {
    id: "quiet-builder",
    confidence: 60,
    reason: "intake names substantive activity but no leadership/competition signal",
  };
}

/* ─── The detection pipeline ──────────────────────────────────────── */

/** Run every heuristic against the intake and return the highest-
 *  confidence match. Returns null if nothing fires above the floor.
 *
 *  Callers should treat a null return (or a return with confidence < 60)
 *  as "the LLM pre-plan call should decide" — not as an absence of any
 *  archetype. In Phase 2 this function becomes the LLM's prior, not its
 *  decision. */
export function detectArchetype(
  input: ArchetypeDetectionInput,
): ArchetypeMatch | null {
  const detectors: Array<(i: ArchetypeDetectionInput) => ArchetypeMatch | null> = [
    detectBridgeDomainKid,
    detectTightLane,
    detectOpenQuestion,
    detectCompetitionKid,
    detectForeignLaneNative,
    detectRecoverer,
    detectSelfTaught,
    detectOperator,
    detectCommunityAnchor,
    detectStoryteller,
    detectQuant,
    detectQuietAthlete,
    detectContrarian,
    detectQuietBuilder,
  ];

  let best: ArchetypeMatch | null = null;
  for (const detect of detectors) {
    const match = detect(input);
    if (!match) continue;
    if (!best || match.confidence > best.confidence) {
      best = match;
    }
  }
  return best;
}

/** Return the highest-confidence archetype OR fall back to Open Question
 *  if nothing fires. Use this when a caller needs a guaranteed
 *  archetype (e.g., rendering the archetype card, which never has a
 *  null state — the student always lands on SOMETHING). */
export function detectArchetypeOrFallback(
  input: ArchetypeDetectionInput,
): ArchetypeMatch {
  const match = detectArchetype(input);
  if (match && match.confidence >= 60) return match;
  return {
    id: "open-question",
    confidence: 50,
    reason:
      match
        ? `no archetype above the 60-confidence floor (best was ${match.id} at ${match.confidence}); falling back to Open Question`
        : "no detector fired; falling back to Open Question (largest-cohort default)",
  };
}
