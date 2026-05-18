/**
 * llm-json — robust JSON parser for LLM responses.
 *
 * Why this is a shared helper: gpt-4o-mini flash and Anthropic Sonnet
 * both occasionally return content like:
 *
 *     {"scholarships":[]}
 *
 *     Note: this page has no scholarships to extract.
 *
 *     OR
 *
 *     ```json
 *     { ...valid... }
 *     ```
 *     (followed by explanation)
 *
 * Direct JSON.parse on these throws "Unexpected non-whitespace character
 * after JSON at position N". A regex like `\{[\s\S]*\}` is greedy and
 * grabs from the first `{` to the LAST `}` — which can swallow a
 * commentary block ending in `}` and produce un-parseable compound text.
 *
 * extractLlmJson walks braces (respecting strings + escapes) from the
 * first `{` to its balanced closing `}` and parses just that prefix.
 * Pre-strips ```json fences before walking.
 *
 * Returns the parsed value, or throws with a useful message.
 */
export function extractLlmJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  // Happy path: direct parse — works when the LLM returned ONLY JSON.
  try { return JSON.parse(candidate); } catch { /* fall through */ }
  // Brace-balance walk from the first `{` to its matching `}`. Tracks
  // string-literal context so a `}` inside a quoted value (e.g. a
  // description with curly braces) doesn't close the object.
  const start = candidate.indexOf("{");
  if (start === -1) throw new Error("No JSON object in LLM response");
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(candidate.slice(start, i + 1));
    }
  }
  throw new Error("Unbalanced JSON in LLM response");
}
