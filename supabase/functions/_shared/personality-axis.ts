/**
 * personality-axis — best-effort introvert / extrovert / mixed
 * extractor from Step 3 free-text.
 *
 * Pair with the covert-intake placeholder in Step 3 of TopUni AI's
 * intake wizard. The placeholder seeds the student's self-
 * description with both an introvert and an extrovert exemplar
 * phrase ("introverted policy nerd who reads more than they
 * should, ... or extrovert who can't sit still without organizing
 * the group around them"). Most students pattern-match against
 * placeholder exemplars when self-describing, so this regex-based
 * extractor catches the explicit personality lean when it shows
 * up in the text.
 *
 * Why deterministic, not LLM:
 * - This signal feeds CARD 01's voice (introvert lean → quiet-one
 *   framing; extrovert lean → in-the-room framing). It does not
 *   need to be perfect — it just needs to be CHEAP and
 *   COMMITTABLE. A wrong call here is recoverable; the brief is
 *   still grounded in the rest of the intake.
 * - LLM extraction costs ~$0.0002/call and adds 200-400ms latency.
 *   The whole point of the covert-intake mechanic is that the
 *   placeholder steers users to USE the words "introvert" or
 *   "extrovert" verbatim, so a regex catches the obvious cases at
 *   zero cost.
 * - When the regex doesn't fire (no explicit lean named, or text
 *   in a language the regex doesn't cover yet), we return
 *   "unknown" — and the brief renders neutral framing, which is
 *   the safe default.
 *
 * Future Phase 2 work:
 * - Add an LLM fallback for "unknown" cases. The pre-plan call
 *   (task #12) can take the same text and produce a richer
 *   personality reading. The deterministic extractor here remains
 *   the cheap-and-fast prior.
 * - Localize the keyword sets for additional languages beyond EN
 *   and RU as the customer base widens.
 *
 * Hard rule (per the spec):
 * - When extraction is ambiguous (BOTH introvert AND extrovert
 *   mentioned, or contradictory phrasings), return "mixed" not a
 *   coin-flip pick. The brief uses "mixed" + "unknown" both as
 *   neutral framing — no card may make a confident introvert OR
 *   extrovert claim when the input doesn't support one.
 */

export type PersonalityAxis = "introvert" | "extrovert" | "mixed" | "unknown";

export interface PersonalityExtraction {
  axis: PersonalityAxis;
  /** Empty array when axis is "unknown". Otherwise the literal
   *  substrings that triggered the classification — useful for
   *  telemetry + for the regen prompt's context if the brief wants
   *  to surface the student's own words back to them. */
  matchedPhrases: string[];
}

/** Phrases that lean introvert. Drawn from the actual placeholder
 *  exemplars used in TopUni AI's Step 3 intake field, plus common
 *  synonyms students use in self-description. Order doesn't matter;
 *  every pattern that matches contributes to the introvert score. */
const INTROVERT_PATTERNS: ReadonlyArray<RegExp> = [
  /\bintrover(t|ted)\b/i,
  /\bquiet\s+(one|kid|type|person)\b/i,
  /\breclus(e|ive)\b/i,
  /\b(prefer|love|like)\s+(being )?alone\b/i,
  /\b(reads?|reading)\s+more than\b/i,
  /\bhomebod(y|ies)\b/i,
  /\brather\s+stay\s+home\b/i,
  /\bdrained?\s+(by|after|around)\s+(people|crowds|groups)\b/i,
  /\bhead-?in-?(my-?)?books?\b/i,
  /\bdeep\s+thinker\b/i,
  /\bin\s+my\s+head\b/i,
  /\bbookworm\b/i,
  // Russian — common self-descriptors mirroring the RU placeholder.
  // No \b word boundaries: JS regex \b is ASCII-only, so it doesn't
  // detect transitions at Cyrillic letter boundaries. The Russian
  // roots here are distinctive enough that substring match is safe.
  /интроверт/i,
  /одиночк/i, // одиночка / одиночкам
  /домосед/i,
  /чита(ю|ть)\s+больше/i,
];

/** Phrases that lean extrovert. Same construction as the introvert
 *  list above. */
const EXTROVERT_PATTERNS: ReadonlyArray<RegExp> = [
  /\bextrover(t|ted)\b/i,
  /\bcan'?t\s+sit\s+still\b/i,
  /\borganiz(es?|ing|er)\s+(the\s+)?(group|room|everyone|people)\b/i,
  /\bsocial\s+butterfly\b/i,
  /\benerg(ized|ised)\s+by\s+(people|crowds|groups)\b/i,
  /\bthe\s+life\s+of\s+the\s+party\b/i,
  /\b(love|loves|loving)\s+(being\s+around\s+)?people\b/i,
  /\btalk(ing)?\s+to\s+(strangers|everyone|anyone)\b/i,
  /\bnetwork(er|ing)\b/i,
  /\bperformer\b/i,
  /\bmc\b/i,
  /\binstigator\b/i,
  // Russian — common self-descriptors mirroring the RU placeholder.
  // (Same Cyrillic-boundary caveat as the introvert list — no \b.)
  /экстраверт/i,
  /не\s+могу\s+усидеть/i,
  /организ(ую|овывать|атор)/i,
  /тусовщи/i, // тусовщик/тусовщица
];

/**
 * Best-effort extract a personality axis from arbitrary text.
 *
 * @param text — the Step 3 free-text answer (or any concatenated
 *   self-description corpus). Empty / null / undefined returns
 *   "unknown".
 *
 * The classification rule:
 * - 0 introvert hits, 0 extrovert hits → unknown
 * - introvert hits > 0, extrovert hits = 0 → introvert
 * - extrovert hits > 0, introvert hits = 0 → extrovert
 * - both lists hit → mixed (no coin flip; the spec is explicit
 *   about not making a confident claim either way)
 *
 * Multiple matches against the same axis count as ONE for
 * classification (we care about WHICH lane, not strength), but
 * every matched substring is returned in matchedPhrases for
 * downstream use.
 */
export function extractPersonalityAxis(
  text: string | null | undefined,
): PersonalityExtraction {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { axis: "unknown", matchedPhrases: [] };
  }
  const introvertHits: string[] = [];
  const extrovertHits: string[] = [];
  for (const pattern of INTROVERT_PATTERNS) {
    const m = text.match(pattern);
    if (m) introvertHits.push(m[0]);
  }
  for (const pattern of EXTROVERT_PATTERNS) {
    const m = text.match(pattern);
    if (m) extrovertHits.push(m[0]);
  }
  const hasIntrovert = introvertHits.length > 0;
  const hasExtrovert = extrovertHits.length > 0;
  if (hasIntrovert && hasExtrovert) {
    return { axis: "mixed", matchedPhrases: [...introvertHits, ...extrovertHits] };
  }
  if (hasIntrovert) return { axis: "introvert", matchedPhrases: introvertHits };
  if (hasExtrovert) return { axis: "extrovert", matchedPhrases: extrovertHits };
  return { axis: "unknown", matchedPhrases: [] };
}

/**
 * Convenience: extract from MULTIPLE candidate text fields
 * (background + personalStory + careerGoal + extracurriculars).
 * Useful when the intake schema has personality signal scattered
 * across more than one free-text input.
 *
 * Behavior is the same as extractPersonalityAxis(joinedText) — we
 * concatenate first so patterns spanning multiple fields still
 * match. The matchedPhrases array surfaces the literal hits
 * regardless of which source field they came from.
 */
export function extractPersonalityAxisFromFields(
  fields: ReadonlyArray<string | null | undefined>,
): PersonalityExtraction {
  const corpus = fields
    .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    .join(" \n ");
  return extractPersonalityAxis(corpus);
}
