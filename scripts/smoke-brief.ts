#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * smoke-brief — live edge-function smoke test for topuni-ai-pathway.
 *
 * The brief-verify CI job runs against hand-crafted fixture JSON —
 * which catches prompt regressions (banned vocab, missing throughline,
 * wrong archetype) but does NOT catch:
 *
 *  - Edge function returning 500 / 502 / timing out
 *  - SSE stream that opens then immediately closes (PR #10 class:
 *    "stamp success before the work completes")
 *  - Sections silently dropped (only 3 of 5 events emitted)
 *  - The archetype-event-first contract broken
 *  - Auth / CORS regressions
 *  - LLM gateway outage / model rotated out
 *
 * This script POSTs a known-minimal profile to the deployed
 * `topuni-ai-pathway` edge function, reads the SSE stream, and
 * asserts:
 *   1. HTTP 200 + a readable body
 *   2. `archetype` event fires
 *   3. All 5 PREMIUM_SECTIONS section events fire
 *      (whereYouStand, whereYouCanLand, whatToWrite,
 *       whatsBlockingYou, whatToDoThisMonth)
 *   4. Stream terminates cleanly with `[DONE]`
 *   5. No `_error` event slipped in
 *
 * Exit 0 on success, 1 on failure.
 *
 * Auth — uses the public Supabase anon key (same one Vite ships to
 * the browser). Set via GitHub Actions secrets:
 *   SUPABASE_URL       = https://<project-ref>.supabase.co
 *   SUPABASE_ANON_KEY  = <publishable anon key>
 *
 * Bails out cleanly (exit 0, prints skip message) when those env
 * vars are missing — so the CI job stays green until Samuel adds
 * the secrets. After secrets are set, the next run actually
 * exercises the edge function.
 */

const REQUIRED_SECTION_IDS = [
  "whereYouStand",
  "whereYouCanLand",
  "whatToWrite",
  "whatsBlockingYou",
  "whatToDoThisMonth",
];

// Minimal, known-good profile. Derived from scripts/sample-brief.test.json's
// intake (Yerlan — Bridge-Domain Kid). Has enough signal that the plan
// resolves a definite archetype + all 5 sections fire without
// validators retrying forever.
const SMOKE_PROFILE = {
  fullName: "Smoke Test",
  nationality: "Kazakhstan",
  gpa: "3.7",
  ielts: "7.0",
  major: "Computer Science",
  majorCertainty: "not_at_all",
  targetCountries: ["Canada", "United Kingdom", "Singapore"],
  topActivity: "Math Olympiad regional bronze, debate captain",
  background:
    "introverted policy nerd who reads more than I should, raised in Astana by two engineers",
  extracurriculars:
    "debate captain since 11th grade, regional Math Olympiad bronze, ran a study group for AP Calc kids",
};

const REQUEST_TIMEOUT_MS = 120_000; // 2 min — brief generation can take ~60-90s

interface SseEvent {
  section?: string;
  payload?: unknown;
  raw: string;
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
): Promise<{ events: SseEvent[]; done: boolean }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const events: SseEvent[] = [];
  let buf = "";
  let done = false;
  while (true) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buf += decoder.decode(value, { stream: true });
    while (true) {
      const sep = buf.indexOf("\n\n");
      if (sep === -1) break;
      const block = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      if (!block.startsWith("data: ")) continue;
      const json = block.slice(6).trim();
      if (!json) continue;
      if (json === "[DONE]") {
        done = true;
        continue;
      }
      try {
        const parsed = JSON.parse(json) as { section?: string; payload?: unknown };
        events.push({ section: parsed.section, payload: parsed.payload, raw: json });
      } catch {
        events.push({ raw: json });
      }
    }
  }
  return { events, done };
}

async function main(): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.log(
      "[smoke-brief] SKIP — SUPABASE_URL / SUPABASE_ANON_KEY not set. " +
        "Add them as GitHub Actions repo secrets to enable this smoke test.",
    );
    Deno.exit(0);
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/topuni-ai-pathway`;
  console.log(`[smoke-brief] POST ${endpoint}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        profile: SMOKE_PROFILE,
        language: "en",
        reportGrade: "basic",
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    console.error(`[smoke-brief] FAIL — fetch error: ${(e as Error).message}`);
    Deno.exit(1);
  }
  clearTimeout(timeout);

  if (!resp.ok) {
    const body = await resp.text().catch(() => "(no body)");
    console.error(`[smoke-brief] FAIL — HTTP ${resp.status}: ${body.slice(0, 500)}`);
    Deno.exit(1);
  }
  if (!resp.body) {
    console.error("[smoke-brief] FAIL — response has no body");
    Deno.exit(1);
  }

  const { events, done } = await readSseStream(resp.body);

  console.log(`[smoke-brief] received ${events.length} SSE event(s), [DONE]=${done}`);
  for (const e of events) {
    const id = e.section ?? "(no section)";
    console.log(`  - ${id}`);
  }

  const failures: string[] = [];

  // 1. Stream terminated cleanly.
  if (!done) {
    failures.push("stream did not terminate with [DONE] — edge function may have crashed mid-stream");
  }

  // 2. No _error events.
  const errorEvents = events.filter((e) => e.section === "_error");
  if (errorEvents.length > 0) {
    failures.push(
      `${errorEvents.length} _error event(s) emitted: ${errorEvents.map((e) => e.raw).join(" | ")}`,
    );
  }

  // 3. Archetype event fired first (before any premium section).
  const archetypeIdx = events.findIndex((e) => e.section === "archetype");
  if (archetypeIdx === -1) {
    failures.push("no `archetype` SSE event — pre-plan card did not fire");
  } else {
    const firstSectionIdx = events.findIndex((e) =>
      REQUIRED_SECTION_IDS.includes(e.section ?? ""),
    );
    if (firstSectionIdx !== -1 && firstSectionIdx < archetypeIdx) {
      failures.push("archetype event did not fire before the first premium section");
    }
  }

  // 4. All 5 premium sections present.
  const seenSections = new Set(events.map((e) => e.section).filter(Boolean));
  const missingSections = REQUIRED_SECTION_IDS.filter((id) => !seenSections.has(id));
  if (missingSections.length > 0) {
    failures.push(`missing section event(s): ${missingSections.join(", ")}`);
  }

  if (failures.length > 0) {
    console.error("\n[smoke-brief] FAIL");
    for (const f of failures) console.error(`  - ${f}`);
    Deno.exit(1);
  }

  console.log("\n[smoke-brief] PASS — archetype + all 5 sections + [DONE]");
  Deno.exit(0);
}

if (import.meta.main) {
  await main();
}
