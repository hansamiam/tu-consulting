// Post-LLM banned-phrase scanner for the v2 strategy report.
// The list lives in code, NOT in the system prompt — listing banned
// phrases in the prompt sometimes increases model use of them.
//
// On hit: the edge function regens once with the offending phrase
// echoed back as a correction. If second attempt still hits, the
// deterministic fallback path takes over.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

const SPARKLE_CODEPOINT = 0x2728;
const SPARKLE_RE = new RegExp(String.fromCodePoint(SPARKLE_CODEPOINT), "u");

const BANNED_REGEXES: RegExp[] = [
  // EN — generic AI-slop optimism
  /\byour unique journey\b/i,
  /\bamazing potential\b/i,
  /\bshine bright\b/i,
  /\byou'?ve got this\b/i,
  /\bfuture is bright\b/i,
  /\banything is possible\b/i,
  /\bsky'?s? the limit\b/i,
  /\brockstar\b/i,
  /\bsuperstar\b/i,
  /\bunlock your full potential\b/i,
  /\bembark on (?:a|this|your) journey\b/i,
  /\bdream big\b/i,
  /\bbelieve in yourself\b/i,
  /\bworld is your oyster\b/i,

  // RU — Russian-language equivalents
  /\bваш уникальный путь\b/i,
  /\bудивительный потенциал\b/i,
  /\bу вас всё получится\b/i,
  /\bвсё получится\b/i,
  /\bнебо — предел\b/i,
  /\bвсё в ваших руках\b/i,
  /\bверь(те)? в себя\b/i,
  /\bмечтайте по-большому\b/i,

  // Sparkle glyph (codepoint U+2728) — Samuel's banned-strings hook
  // also blocks the literal server-side; this is belt to its suspenders.
  SPARKLE_RE,
];

export interface BannedHit {
  pattern: string;
  /** The exact substring matched in the offending string. */
  match: string;
  /** Which field of the report contained the hit. */
  field: string;
  /** Full string the hit was in. */
  context: string;
}

/**
 * Scan every string field of a strategy report. Returns the FIRST hit
 * found (caller cares about presence, not exhaustive list).
 */
export function findBanned(
  report: unknown,
): BannedHit | null {
  const r = report as Record<string, unknown>;
  if (!r || typeof r !== "object") return null;

  const checks: Array<[string, string | undefined]> = [];

  const ap = r.applicantType as Record<string, unknown> | undefined;
  if (ap) {
    checks.push(["applicantType.label", typeof ap.label === "string" ? ap.label : undefined]);
    checks.push(["applicantType.framing", typeof ap.framing === "string" ? ap.framing : undefined]);
  }
  checks.push(["headline", typeof r.headline === "string" ? r.headline : undefined]);
  checks.push(["honestDiagnosis", typeof r.honestDiagnosis === "string" ? r.honestDiagnosis : undefined]);
  checks.push(["bestNextMove", typeof r.bestNextMove === "string" ? r.bestNextMove : undefined]);
  checks.push(["doNotWaste", typeof r.doNotWaste === "string" ? r.doNotWaste : undefined]);

  for (const k of ["strengths", "watchouts", "focusNext"] as const) {
    const arr = r[k];
    if (Array.isArray(arr)) {
      arr.forEach((s, i) => {
        if (typeof s === "string") checks.push([`${k}[${i}]`, s]);
      });
    }
  }

  if (Array.isArray(r.axes)) {
    (r.axes as Array<Record<string, unknown>>).forEach((a, i) => {
      if (typeof a?.reason === "string") checks.push([`axes[${i}].reason`, a.reason]);
    });
  }

  if (Array.isArray(r.fitDiagnosis)) {
    (r.fitDiagnosis as Array<Record<string, unknown>>).forEach((f, i) => {
      if (typeof f?.verdict === "string") checks.push([`fitDiagnosis[${i}].verdict`, f.verdict]);
      if (typeof f?.reason === "string") checks.push([`fitDiagnosis[${i}].reason`, f.reason]);
    });
  }

  for (const [field, value] of checks) {
    if (!value) continue;
    for (const pattern of BANNED_REGEXES) {
      const m = value.match(pattern);
      if (m) {
        return {
          pattern: pattern.source,
          match: m[0],
          field,
          context: value,
        };
      }
    }
  }

  return null;
}
