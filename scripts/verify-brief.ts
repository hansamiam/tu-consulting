#!/usr/bin/env -S deno run --allow-read
/**
 * verify-brief — automated runner for the v7 spec's 6 verification
 * tests (see ~/.claude/plans/ok-good-morning-claude-frolicking-moth.md
 * §"Verification"). Takes a captured brief JSON + the source intake
 * and reports pass/fail per test with reasons.
 *
 * Why it exists: the spec defined 6 verification tests that the
 * brief must pass before any line of code change is considered
 * "done." The validators inside brief-sections.ts already enforce
 * per-section semantic rules at generation time, but the spec's
 * tests are CROSS-CARD checks — narrative throughline, no-pre-med
 * for CIS students across every prose surface, specific-anchor
 * reality check that every named school exists in the LIVE
 * CONTEXT, etc. These don't fit inside a per-section validator
 * because they need the whole brief in hand.
 *
 * Usage:
 *   deno run --allow-read scripts/verify-brief.ts <sample.json>
 *
 * Where <sample.json> has shape:
 *   {
 *     "intake": { ... DiscoverProfile from the wizard ... },
 *     "dbContext": "... LIVE CONTEXT block ...",
 *     "brief": {
 *       "schema": 3,
 *       "plan": { ... BriefPlan ... },
 *       "sections": { whereYouStand: {...}, whereYouCanLand: {...}, ... }
 *     }
 *   }
 *
 * Capture flow:
 *   1. Deploy topuni-ai-pathway with the v7 PRs merged
 *   2. Generate a brief via the wizard (or POST to the edge function)
 *   3. From Supabase dashboard, copy the brief_cache row's `content`
 *      into a JSON file under samples/
 *   4. Run this script against it
 *
 * The script exits non-zero if any test fails — so it can be
 * chained into CI later if the team adds a test workflow.
 */

import {
  scanBannedVocab,
  resolveCulturalContext,
} from "../supabase/functions/_shared/editorial-rules.ts";
import { ARCHETYPE_LIBRARY } from "../supabase/functions/_shared/archetype-library.ts";
import {
  firstAbroadFramingFor,
  FRAMING_MARKERS,
} from "../supabase/functions/_shared/cultural-context.ts";
import { normalizeNationality } from "../supabase/functions/_shared/nationality-normalize.ts";

// ─── Types mirroring the captured-brief JSON ──────────────────────

interface IntakeProfile {
  fullName?: string;
  nationality?: string;
  gpa?: string;
  ielts?: string;
  toefl?: string;
  sat?: string;
  major?: string;
  majorCertainty?: "not_at_all" | "some_idea" | "pretty_sure" | "certain";
  targetCountries?: string[];
  topActivity?: string;
  personalStory?: string;
  background?: string;
  extracurriculars?: string;
  careerGoal?: string;
  namedSchools?: string;
  /** Sparse-input pass (2026-05-23). Drives Test 7 — when "yes",
   *  Card 01 or 03 prose MUST contain a FRAMING_MARKERS phrase that
   *  matches firstAbroadFramingFor(normalizeNationality(nationality)). */
  firstToApplyAbroad?: "yes" | "siblings_have" | "parents_have" | "unsure";
  foreignLanguages?: string[];
}

interface BriefPlan {
  archetype?: { id: string; confidence?: number; reason?: string };
  identityClaim?: string;
  pileContrast?: string;
  essaySeedType?: string;
  primaryGap?: { type: string; libraryEntryId?: number; reason?: string };
  countryBuckets?: string[];
  mondayMoveArtifact?: string;
}

interface SampleBrief {
  intake: IntakeProfile;
  dbContext: string;
  brief: {
    schema?: number;
    plan?: BriefPlan;
    sections: Record<string, unknown>;
  };
}

// ─── Test results plumbing ───────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  findings: string[];
}

function pass(name: string, ...findings: string[]): TestResult {
  return { name, passed: true, findings };
}

function fail(name: string, ...findings: string[]): TestResult {
  return { name, passed: false, findings };
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Walk an arbitrary object tree, collecting every string value. */
function collectStrings(v: unknown, into: string[] = []): string[] {
  if (typeof v === "string") into.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, into));
  else if (v && typeof v === "object") {
    Object.values(v as Record<string, unknown>).forEach((x) => collectStrings(x, into));
  }
  return into;
}

/** All prose strings across the brief (plan + sections + nested). */
function allBriefProse(brief: SampleBrief["brief"]): string {
  return collectStrings({ ...brief.sections, ...brief.plan }).join(" \n ");
}

/** Returns a Set of normalized intake-anchor strings — names,
 *  numbers, countries, activities — used by the specific-anchor
 *  check + the throughline check.
 *
 *  Comma-separated free-text fields (topActivity, namedSchools,
 *  extracurriculars) are tokenized so each individual phrase
 *  registers separately. Without this, "Math Olympiad regional
 *  bronze, debate captain" only matches if the brief repeats
 *  the whole string verbatim — which it never does. */
function intakeAnchors(intake: IntakeProfile): Set<string> {
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (s.length >= 3) out.add(s.toLowerCase());
  };
  const addTokenized = (v: unknown) => {
    if (v === null || v === undefined) return;
    String(v)
      .split(/[,;]|\sand\s|\s·\s/i)
      .map((p) => p.trim())
      .forEach((p) => {
        if (p.length >= 3) out.add(p.toLowerCase());
      });
  };
  // First name only — full name is awkward when re-referenced.
  // Names are intentionally NOT counted toward throughline
  // recurrence (every section is allowed to address the student
  // by name; that's not the spec's notion of a load-bearing
  // anchor).
  add(intake.fullName?.split(/\s+/)[0]);
  add(intake.nationality);
  add(intake.gpa);
  add(intake.ielts);
  add(intake.toefl);
  add(intake.sat);
  add(intake.major);
  addTokenized(intake.topActivity);
  addTokenized(intake.namedSchools);
  addTokenized(intake.extracurriculars);
  (intake.targetCountries ?? []).forEach(add);
  return out;
}

/** Like intakeAnchors but excludes the student's first name —
 *  used by the throughline test so name-recurrence alone doesn't
 *  satisfy the cross-card-coherence requirement. */
function intakeAnchorsExcludingName(intake: IntakeProfile): Set<string> {
  const anchors = intakeAnchors(intake);
  const first = intake.fullName?.split(/\s+/)[0]?.toLowerCase();
  if (first) anchors.delete(first);
  return anchors;
}

/** For the throughline test: tokenize anchors down to individual
 *  WORDS so "debate" matches whether the brief writes "debate
 *  captain" or "debate round" — real throughline is paraphrased,
 *  not verbatim. Filter to ≥4 chars + skip common English/EN-ESL
 *  filler words so we don't get false matches on "the" / "and". */
const THROUGHLINE_STOPWORDS = new Set([
  "from", "with", "your", "into", "that", "this", "they", "what", "have",
  "been", "were", "more", "than", "some", "year", "kids", "kid", "side",
  "side", "open", "high", "next", "make", "made", "show", "show", "story",
  "stories", "thing", "things", "tell", "told", "want", "wants", "wanted",
  "school", "schools", "study", "studying", "studies", "studied",
  "applying", "application", "applications", "students", "student",
]);

function intakeAnchorTokens(intake: IntakeProfile): Set<string> {
  const out = new Set<string>();
  for (const a of intakeAnchorsExcludingName(intake)) {
    for (const word of a.split(/[\s,;.()/—-]+/)) {
      const w = word.toLowerCase().trim();
      if (w.length < 4) continue;
      if (THROUGHLINE_STOPWORDS.has(w)) continue;
      // Numeric anchors (GPA, IELTS) — keep them as-is when ≥3 chars
      // since they're already distinctive.
      out.add(w);
    }
  }
  // Also re-add raw numeric values that are < 4 chars but still
  // distinctive (3.7, 7.0, etc.)
  const addNumeric = (v: unknown) => {
    if (v === null || v === undefined) return;
    const s = String(v).trim();
    if (/^[0-9.]+$/.test(s) && s.length >= 2) out.add(s.toLowerCase());
  };
  addNumeric(intake.gpa);
  addNumeric(intake.ielts);
  addNumeric(intake.toefl);
  addNumeric(intake.sat);
  return out;
}

// ─── Test 1: Yerlan-shape case (cross-domain student) ────────────

function testCrossDomainCase(sample: SampleBrief): TestResult {
  const name = "1 · Cross-domain student case";
  const { intake, brief } = sample;
  const findings: string[] = [];

  const plan = brief.plan;
  if (!plan) {
    return fail(name, "No plan present — schema-2 cache or fallback path was taken. Cannot run cross-domain check.");
  }

  // Archetype should be bridge-domain-kid or open-question for a
  // cross-domain student with not_at_all majorCertainty
  const acceptable = ["bridge-domain-kid", "open-question"];
  if (intake.majorCertainty === "not_at_all" || intake.majorCertainty === "some_idea") {
    if (!acceptable.includes(plan.archetype?.id ?? "")) {
      findings.push(
        `archetype is "${plan.archetype?.id}"; for an uncertain-major cross-domain student expected one of ${acceptable.join(", ")}`,
      );
    }
  }

  // primary gap MUST be major-uncertainty
  if ((intake.majorCertainty === "not_at_all" || intake.majorCertainty === "some_idea")) {
    if (plan.primaryGap?.type !== "major-uncertainty") {
      findings.push(
        `primaryGap.type is "${plan.primaryGap?.type}" but intake majorCertainty is "${intake.majorCertainty}" — must be major-uncertainty`,
      );
    }
  }

  // countryBuckets MUST be a subset of intake.targetCountries
  const intakeCountriesLc = (intake.targetCountries ?? []).map((c) => c.toLowerCase());
  for (const c of plan.countryBuckets ?? []) {
    if (intakeCountriesLc.length > 0 && !intakeCountriesLc.includes(c.toLowerCase())) {
      findings.push(`countryBuckets contains "${c}" which is not in intake.targetCountries`);
    }
  }

  // The pile contrast should reference locally-salient tracks
  // (no pre-med) for Central Asian students.
  const cult = resolveCulturalContext(intake.nationality);
  if (cult === "central_asia" && /\bpre[- ]?med/i.test(plan.pileContrast ?? "")) {
    findings.push("pileContrast contains 'pre-med' — banned for CIS students");
  }

  return findings.length === 0
    ? pass(name, "cross-domain checks all clean")
    : fail(name, ...findings);
}

// ─── Test 2: Certain-major case (Tight Lane, no pre-med) ─────────

function testCertainMajorCase(sample: SampleBrief): TestResult {
  const name = "2 · Certain-major case";
  const { intake, brief } = sample;
  const findings: string[] = [];

  if (intake.majorCertainty !== "certain" && intake.majorCertainty !== "pretty_sure") {
    return pass(name, `skipped: intake majorCertainty is "${intake.majorCertainty}" — not a certain-major case`);
  }

  const plan = brief.plan;
  if (!plan) return fail(name, "no plan present");

  // primary gap MUST be library-entry (not major-uncertainty)
  if (plan.primaryGap?.type !== "library-entry") {
    findings.push(
      `primaryGap.type is "${plan.primaryGap?.type}"; certain-major intake should fire the library-entry branch`,
    );
  }

  // No pre-med anywhere (regardless of nationality — the certain-
  // major case shouldn't invent pre-med framing)
  const prose = allBriefProse(brief);
  if (/\bpre[- ]?med/i.test(prose)) {
    const match = prose.match(/\bpre[- ]?med[a-z]*/i);
    findings.push(`brief contains "${match?.[0]}" — pre-med language banned`);
  }

  return findings.length === 0
    ? pass(name, "certain-major case clean")
    : fail(name, ...findings);
}

// ─── Test 3: Anti-slop pass ──────────────────────────────────────

function testAntiSlop(sample: SampleBrief): TestResult {
  const name = "3 · Anti-slop pass";
  const { intake, brief } = sample;
  const cult = resolveCulturalContext(intake.nationality);
  const prose = allBriefProse(brief);
  const hits = scanBannedVocab(prose, cult);

  if (hits.length === 0) {
    return pass(name, "no banned vocab anywhere in the brief");
  }

  const lines = hits.slice(0, 10).map((h) => `  - ${h.label}: "${h.match}"`);
  if (hits.length > 10) lines.push(`  - ... and ${hits.length - 10} more`);
  return fail(name, `${hits.length} banned-vocab hit(s):`, ...lines);
}

// ─── Test 4: Specific-anchor reality check ───────────────────────

function testSpecificAnchorReality(sample: SampleBrief): TestResult {
  const name = "4 · Specific-anchor reality check";
  const { intake, brief, dbContext } = sample;
  const findings: string[] = [];

  // Every named school in the brief MUST appear in dbContext.
  const dbLc = dbContext.toLowerCase();
  const buckets = (brief.sections.whereYouCanLand as { buckets?: Array<{ schools?: Array<{ name?: string }> }> } | undefined)?.buckets ?? [];
  const v6Entries = (brief.sections.whereYouCanLand as { entries?: Array<{ name?: string }> } | undefined)?.entries ?? [];
  const schoolNames: string[] = [];
  for (const b of buckets) for (const s of b.schools ?? []) if (s.name) schoolNames.push(s.name);
  for (const e of v6Entries) if (e.name) schoolNames.push(e.name);

  for (const sName of schoolNames) {
    if (!dbLc.includes(sName.toLowerCase())) {
      findings.push(`brief names school "${sName}" but it doesn't appear in dbContext — likely invented`);
    }
  }

  // Card 01 (whereYouStand) body should reference at least one
  // specific intake field by name.
  const stand = brief.sections.whereYouStand as { body?: string; pullquote?: string; lead?: string; headline?: string } | undefined;
  const standCorpus = [stand?.headline, stand?.lead, stand?.body, stand?.pullquote]
    .filter((v): v is string => typeof v === "string")
    .join(" \n ").toLowerCase();
  const anchors = intakeAnchors(intake);
  if (standCorpus.length > 0) {
    const found = [...anchors].some((a) => standCorpus.includes(a));
    if (!found) {
      findings.push("Card 01 references no specific intake field (GPA, country, school, activity, etc.)");
    }
  }

  return findings.length === 0
    ? pass(name, `${schoolNames.length} school(s) all grounded in dbContext`, "Card 01 specific anchors present")
    : fail(name, ...findings);
}

// ─── Test 5: Share-asset placeholders (browser-only) ─────────────

function testShareAssetPlaceholder(sample: SampleBrief): TestResult {
  const name = "5 · Share-asset render (browser-only)";
  const findings: string[] = [];

  const plan = sample.brief.plan;
  if (!plan?.archetype?.id) {
    return fail(name, "no archetype in plan — share asset would have no color/name/tagline lookup");
  }

  // Archetype id must be in the closed library — the share asset
  // uses getArchetype() to look up name + tagline + color, and
  // unknown IDs throw at render time.
  const found = ARCHETYPE_LIBRARY.find((a) => a.id === plan.archetype?.id);
  if (!found) {
    findings.push(`archetype.id "${plan.archetype.id}" not in closed library — getArchetype() would throw`);
  }

  if (findings.length > 0) return fail(name, ...findings);

  // The full 1080×1920 PNG capture + native share-sheet handoff
  // can only be verified in a real browser. The harness confirms
  // the data the renderer consumes is structurally valid.
  return pass(
    name,
    `archetype "${plan.archetype.id}" → "${found?.name}" (color ${found?.color}) — library lookup OK`,
    "(full PNG render + share-sheet UX must be verified in a browser)",
  );
}

// ─── Test 6: Narrative throughline ───────────────────────────────

// ─── Test 7: First-abroad framing matches cultural-context lens ──
//
// Sparse-input pass (2026-05-23). When the intake captures
// firstToApplyAbroad === "yes", the brief MUST honor the per-
// nationality framing — CIS / MENA gets "first to leave home" angle,
// US / LatAm / parts of SE Asia gets "first-gen college" angle,
// unmapped gets generic "first step" angle. The brief NEVER defaults
// to first-gen-college for CIS students (that's factually wrong
// for the region — school completion is high, parents often
// graduated university).
//
// Asserts that at least ONE FRAMING_MARKERS phrase for the resolved
// framing (in EITHER language — the brief may render in EN or RU)
// appears in Card 01 (whereYouStand) or Card 03 (whatToWrite) prose.
//
// Passes vacuously when firstToApplyAbroad is not "yes" — the brief
// doesn't need to acknowledge first-abroad status that wasn't captured.

function testFirstAbroadFraming(sample: SampleBrief): TestResult {
  const name = "7 · First-abroad framing matches cultural lens";
  const { intake, brief } = sample;
  if (intake.firstToApplyAbroad !== "yes") {
    return pass(name, "intake.firstToApplyAbroad is not 'yes' — framing branch not required");
  }
  const framing = firstAbroadFramingFor(normalizeNationality(intake.nationality));
  const markers = [
    ...FRAMING_MARKERS[framing].en,
    ...FRAMING_MARKERS[framing].ru,
  ].map((m) => m.toLowerCase());

  const card01 = brief.sections["whereYouStand"];
  const card03 = brief.sections["whatToWrite"];
  const prose = [card01, card03]
    .filter((s) => s)
    .flatMap((s) => collectStrings(s))
    .join(" \n ")
    .toLowerCase();

  if (prose.length === 0) {
    return fail(name, "Card 01 + Card 03 prose is empty — cannot verify framing");
  }

  const hit = markers.find((m) => prose.includes(m));
  if (!hit) {
    return fail(
      name,
      `nationality "${intake.nationality ?? "(unset)"}" → framing "${framing}"`,
      `expected at least one of: ${markers.map((m) => `"${m}"`).join(", ")}`,
      "found none in Card 01 / Card 03 prose",
    );
  }

  return pass(
    name,
    `nationality "${intake.nationality ?? "(unset)"}" → framing "${framing}"`,
    `marker found: "${hit}"`,
  );
}

function testNarrativeThroughline(sample: SampleBrief): TestResult {
  const name = "6 · Narrative throughline";
  const { intake, brief } = sample;
  const findings: string[] = [];

  const anchors = intakeAnchorTokens(intake);
  if (anchors.size === 0) {
    return pass(name, "intake is sparse — no specific anchors to check throughline against");
  }

  // Walk each section's prose and count how many distinct intake
  // anchors appear. A coherent brief surfaces the same anchors
  // across multiple sections; a fragmented brief has each section
  // referencing different anchors (or none).
  const sectionIds = [
    "whereYouStand",
    "whereYouCanLand",
    "whatToWrite",
    "whatsBlockingYou",
    "whatToDoThisMonth",
  ];
  const sectionAnchorCounts: Record<string, number> = {};
  const recurringAnchors = new Set<string>();
  const perAnchorPresence: Record<string, Set<string>> = {};

  for (const id of sectionIds) {
    const sec = brief.sections[id];
    if (!sec) continue;
    const prose = collectStrings(sec).join(" \n ").toLowerCase();
    if (prose.length === 0) continue;
    let count = 0;
    for (const a of anchors) {
      if (prose.includes(a)) {
        count += 1;
        const set = perAnchorPresence[a] ?? new Set<string>();
        set.add(id);
        perAnchorPresence[a] = set;
      }
    }
    sectionAnchorCounts[id] = count;
  }

  // An anchor that appears in 2+ sections is "load-bearing" —
  // the brief leans on it across the narrative. We want at
  // least 1 such anchor for a coherent throughline.
  for (const [a, ids] of Object.entries(perAnchorPresence)) {
    if (ids.size >= 2) recurringAnchors.add(a);
  }

  if (recurringAnchors.size === 0) {
    findings.push(
      "No intake anchor appears in 2+ sections — brief reads as fragmented (every card references different specifics)",
    );
    for (const [id, n] of Object.entries(sectionAnchorCounts)) {
      findings.push(`  ${id}: ${n} anchor(s)`);
    }
  }

  return findings.length === 0
    ? pass(
      name,
      `${recurringAnchors.size} anchor(s) appear across 2+ sections: ${[...recurringAnchors].slice(0, 5).join(", ")}`,
    )
    : fail(name, ...findings);
}

// ─── Main entrypoint ──────────────────────────────────────────────

async function main(): Promise<void> {
  const args = Deno.args;
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`Usage: deno run --allow-read scripts/verify-brief.ts <sample.json>

  <sample.json> shape:
    {
      "intake": { ... },
      "dbContext": "...",
      "brief": { "schema": 3, "plan": {...}, "sections": {...} }
    }

  Captures a brief from Supabase brief_cache.content + pairs with the
  intake the brief was generated from. Runs the v7 spec's 6 verification
  tests against the pairing.`);
    Deno.exit(0);
  }

  const path = args[0];
  let raw: string;
  try {
    raw = await Deno.readTextFile(path);
  } catch (e) {
    console.error(`Failed to read sample file: ${(e as Error).message}`);
    Deno.exit(2);
  }

  let sample: SampleBrief;
  try {
    sample = JSON.parse(raw) as SampleBrief;
  } catch (e) {
    console.error(`Sample is not valid JSON: ${(e as Error).message}`);
    Deno.exit(2);
  }
  if (!sample.intake || !sample.brief || !sample.brief.sections) {
    console.error("Sample is missing required fields (intake / brief / brief.sections)");
    Deno.exit(2);
  }

  const tests: Array<(s: SampleBrief) => TestResult> = [
    testCrossDomainCase,
    testCertainMajorCase,
    testAntiSlop,
    testSpecificAnchorReality,
    testShareAssetPlaceholder,
    testNarrativeThroughline,
    testFirstAbroadFraming,
  ];

  let passCount = 0;
  console.log("");
  for (const test of tests) {
    const r = test(sample);
    if (r.passed) passCount += 1;
    const icon = r.passed ? "PASS" : "FAIL";
    const colour = r.passed ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(`${colour}${icon}${reset}  ${r.name}`);
    for (const finding of r.findings) {
      console.log(`       ${finding}`);
    }
    console.log("");
  }

  console.log(`${passCount} / ${tests.length} passed`);
  Deno.exit(passCount === tests.length ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
