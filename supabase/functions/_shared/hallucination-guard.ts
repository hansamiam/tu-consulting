/**
 * F11 anti-hallucination guard — shared between topuni-ai-pathway and
 * topuni-chat so they can't drift.
 *
 * The 2026-05-03 audit caught the brief LLM inventing scholarship names that
 * weren't in the retrieved set (e.g. "Smith Foundation Scholarship for
 * Central Asian Students" — sounded plausible, didn't exist). Same risk in
 * the counselor chat. This module:
 *
 *   1. Extracts bold-formatted scholarship-name-shaped phrases from LLM
 *      output (regex on `**Name**` markdown).
 *   2. Fuzzy-matches each candidate against the names of the scholarships
 *      that were actually retrieved for this user's session.
 *   3. Returns the unmatched ones as `flagged` items, plus the best-match
 *      score per item so we can tune the threshold later.
 *
 * Phase 1 (now): log-only. Brief renders as-is; flagged items insert to
 * brief_hallucinations for monitoring. Plan F11 says "first week tune
 * the matcher against this log before enforcing redaction."
 *
 * Phase 2 (later, when log shows the matcher is calibrated): set
 * `redact: true` on the call site to swap each flagged bold span for
 * `[scholarship name redacted — not in retrieved set]`.
 */

const BOLD_NAME_REGEX = /\*\*([A-Z][^*]{5,80})\*\*/g;

// Strings that obviously aren't scholarship names but match the bold-capitalized pattern.
// Extend this list as the brief_hallucinations log surfaces false positives.
const KNOWN_NON_SCHOLARSHIP_BOLDS = new Set<string>([
  "Why", "How", "When", "Where", "What",
  "Pros", "Cons", "Risks", "Notes", "Tip", "Tips",
  "Eligibility", "Deadline", "Funding", "Coverage", "Apply", "Action", "Next",
  "Strengths", "Weaknesses", "Strategy",
]);

export interface HallucinationFlag {
  flagged_text: string;             // the raw bold span ("**Foo Scholarship**")
  candidate_name: string;           // the inner text ("Foo Scholarship")
  best_fuzzy_match_score: number;   // 0..1
  best_fuzzy_match_against_name: string | null;
}

/**
 * Extract bold spans that look like scholarship names from LLM markdown.
 * Output is deduped by inner text so a name mentioned 5× counts once.
 */
export function extractBoldScholarshipMentions(markdown: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  // Reset the regex's lastIndex in case the caller passes the same instance.
  BOLD_NAME_REGEX.lastIndex = 0;
  while ((m = BOLD_NAME_REGEX.exec(markdown)) !== null) {
    const inner = m[1].trim();
    if (KNOWN_NON_SCHOLARSHIP_BOLDS.has(inner)) continue;
    // Single-word bolds are almost never scholarship names — they're section
    // headers ("Eligibility", "Coverage"). Real names are 2+ words.
    if (!/\s/.test(inner)) continue;
    if (seen.has(inner.toLowerCase())) continue;
    seen.add(inner.toLowerCase());
    out.push(inner);
  }
  return out;
}

/**
 * Token-level Jaccard similarity, case-insensitive. 0.0–1.0.
 * Good enough for fuzzy-matching scholarship names that may differ by
 * articles, year suffixes, or ordering — and cheap (no n-gram tables).
 *
 * Example: "Chevening Scholarship" vs "Chevening Scholarships 2026" →
 *   tokens {"chevening","scholarship"} ∩ {"chevening","scholarships","2026"} = 1
 *   ∪ = 4, similarity = 0.25 — too strict.
 *
 * To fix that, we lemma-strip plural 's' and drop year tokens before scoring.
 */
function tokenize(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.replace(/s$/, ""))                  // strip plural-s
      .filter((t) => t.length > 1 && !/^\d{4}$/.test(t)) // drop short + year
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/**
 * Threshold above which a fuzzy match counts as "this is actually the
 * retrieved scholarship being referenced, not a hallucination." 0.6 means
 * ~60% of the cleaned token set overlaps. Adjustable based on log.
 */
const FUZZY_MATCH_THRESHOLD = 0.6;

/**
 * Compare an LLM-output markdown blob against the retrieved scholarship
 * names. Returns the bold-name mentions that don't have a confident match
 * in the retrieved set.
 */
export function findHallucinations(
  markdown: string,
  retrievedScholarshipNames: ReadonlyArray<string>,
): HallucinationFlag[] {
  const candidates = extractBoldScholarshipMentions(markdown);
  if (candidates.length === 0) return [];

  const retrievedTokenSets = retrievedScholarshipNames.map((n) => ({
    name: n,
    tokens: tokenize(n),
  }));

  const flags: HallucinationFlag[] = [];
  for (const candidate of candidates) {
    const candTokens = tokenize(candidate);
    let bestScore = 0;
    let bestName: string | null = null;
    for (const r of retrievedTokenSets) {
      const score = jaccard(candTokens, r.tokens);
      if (score > bestScore) {
        bestScore = score;
        bestName = r.name;
      }
    }
    if (bestScore < FUZZY_MATCH_THRESHOLD) {
      flags.push({
        flagged_text: `**${candidate}**`,
        candidate_name: candidate,
        best_fuzzy_match_score: Number(bestScore.toFixed(3)),
        best_fuzzy_match_against_name: bestName,
      });
    }
  }
  return flags;
}

/**
 * Phase 2 redaction helper. Swaps each flagged bold span for a redaction
 * marker. Currently NOT called from the wiring (Phase 1 is log-only per
 * the F11 spec).
 */
export function redactHallucinations(
  markdown: string,
  flags: ReadonlyArray<HallucinationFlag>,
): string {
  let out = markdown;
  const placeholder = "[scholarship name redacted — not in retrieved set]";
  for (const f of flags) {
    out = out.split(f.flagged_text).join(placeholder);
  }
  return out;
}
