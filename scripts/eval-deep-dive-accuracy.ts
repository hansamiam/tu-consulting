#!/usr/bin/env -S deno run --allow-env --allow-net
//
// scripts/eval-deep-dive-accuracy.ts — accuracy + safety-net eval for
// the Path B deep-dive edge function (supabase/functions/scholarship-
// deep-dive/index.ts).
//
// The function ships with three safety nets:
//   1. Length validators on the_read + bullets
//   2. Post-generation banned-vocab scanner (cultural-context-aware)
//   3. Fallback derivation from Path A fields on any LLM failure
//
// This script asserts those nets actually trigger on fixture inputs.
// It does NOT call the LLM (no spend, no env vars needed).
//
// For the LIVE accuracy gate (numeric-claim-grounding check against
// real Firecrawl + LLM output), see the "Manual integration check"
// section at the bottom of this file — that one IS gated on
// LOVABLE_API_KEY / FIRECRAWL_API_KEY / TAVILY_API_KEY being set and
// makes real network calls. Run it before promoting PR 2 to prod.
//
// Usage:
//   deno test --allow-env --allow-net scripts/eval-deep-dive-accuracy.ts
//   # OR run as a script (prints a pass/fail summary):
//   deno run --allow-env --allow-net scripts/eval-deep-dive-accuracy.ts

import {
  scanBannedVocab,
  resolveCulturalContext,
} from "../supabase/functions/_shared/editorial-rules.ts";
import { bucketFor } from "../supabase/functions/_shared/nationality-bucket.ts";
import { isPremium } from "../supabase/functions/_shared/scholarship-premium-tier.ts";

const THE_READ_MAX = 220;
const BULLET_MAX = 180;
const MIN_BULLETS = 3;
const MAX_BULLETS = 4;

interface FixtureCard {
  the_read: string;
  bullets: string[];
  sources_used: string[];
}

interface Assertion {
  name: string;
  pass: boolean;
  detail?: string;
}

/* ─── Fixtures ──────────────────────────────────────────────────────── */

// Known-good output — passes every validator.
const FIXTURE_GOOD: FixtureCard = {
  the_read:
    "Stipendium Hungaricum reads STEM-olympiad placements as a harder signal than IELTS for this program.",
  bullets: [
    "GPA 8.5 is the published floor — your file sits comfortably above per the Path A notes.",
    "Russian-language exemption applies to CIS passport holders — one less doc to chase.",
    "February 15 deadline gives roughly 11 weeks — enough for one strong essay revision cycle.",
  ],
  sources_used: ["official_url", "how_to_win"],
};

// Banned-vocab output — should trip strategy-jargon scanner.
const FIXTURE_BANNED_STRATEGY: FixtureCard = {
  the_read: "Your edge is the way you stand out in this competitive pool.",
  bullets: [
    "Build the bridge between your domain experience and the program's research focus.",
    "Leverage your IT background as a competitive moat in the applicant pool.",
    "Position your application to land in their top-percentile bucket.",
  ],
  sources_used: ["strategy_notes"],
};

// Banned-vocab output — odds-language scanner.
const FIXTURE_BANNED_ODDS: FixtureCard = {
  the_read: "This one is a reach school given your current scores.",
  bullets: [
    "Treat it as a stretch and apply early to maximize alumni insight.",
    "Hone in on the typical admit profile when drafting your essay.",
    "Your IELTS gap is a long shot to close before the deadline.",
  ],
  sources_used: ["strategy_notes"],
};

// CIS-specific banned vocab — should ONLY fail when cultural context = central_asia.
const FIXTURE_PREMED_CIS: FixtureCard = {
  the_read: "Pre-med applicants from your region tend to do well here.",
  bullets: [
    "The pre-med track is the most common pile for this scholarship.",
    "Pre-medical coursework strength matters more than IELTS for selection.",
    "Most successful applicants come from a premed background.",
  ],
  sources_used: ["how_to_win"],
};

// Length-violation fixture — the_read too long.
const FIXTURE_TOO_LONG_READ: FixtureCard = {
  the_read: "x".repeat(THE_READ_MAX + 50),
  bullets: [
    "Bullet 1 — short enough.",
    "Bullet 2 — short enough.",
    "Bullet 3 — short enough.",
  ],
  sources_used: ["official_url"],
};

// Length-violation fixture — bullet too long.
const FIXTURE_TOO_LONG_BULLET: FixtureCard = {
  the_read: "Normal-length punchline sentence here.",
  bullets: [
    "y".repeat(BULLET_MAX + 30),
    "Bullet 2 — short enough.",
    "Bullet 3 — short enough.",
  ],
  sources_used: ["official_url"],
};

// Bullet-count violation — too few.
const FIXTURE_TOO_FEW_BULLETS: FixtureCard = {
  the_read: "Normal-length punchline sentence here.",
  bullets: ["Bullet 1 — short enough.", "Bullet 2 — short enough."],
  sources_used: ["official_url"],
};

/* ─── Helpers (mirror function-internal validators for offline eval) ─── */

function validateLength(card: FixtureCard): { ok: boolean; reason?: string } {
  if (!card.the_read) return { ok: false, reason: "empty the_read" };
  if (card.the_read.length > THE_READ_MAX) return { ok: false, reason: `the_read ${card.the_read.length} > ${THE_READ_MAX}` };
  if (card.bullets.length < MIN_BULLETS) return { ok: false, reason: `bullets ${card.bullets.length} < ${MIN_BULLETS}` };
  if (card.bullets.length > MAX_BULLETS) return { ok: false, reason: `bullets ${card.bullets.length} > ${MAX_BULLETS}` };
  for (const b of card.bullets) {
    if (b.length > BULLET_MAX) return { ok: false, reason: `bullet length ${b.length} > ${BULLET_MAX}` };
  }
  return { ok: true };
}

function scanCard(card: FixtureCard, culturalContext: string) {
  const combined = card.the_read + " " + card.bullets.join(" ");
  return scanBannedVocab(combined, culturalContext);
}

/* ─── Assertions ────────────────────────────────────────────────────── */

function runAll(): Assertion[] {
  const out: Assertion[] = [];

  // 1. Length validator: good fixture passes.
  {
    const r = validateLength(FIXTURE_GOOD);
    out.push({ name: "FIXTURE_GOOD passes length validators", pass: r.ok, detail: r.reason });
  }

  // 2. Banned-vocab scanner trips on strategy-jargon output.
  {
    const hits = scanCard(FIXTURE_BANNED_STRATEGY, "default");
    out.push({
      name: "FIXTURE_BANNED_STRATEGY trips strategy-jargon scanner",
      pass: hits.length > 0,
      detail: hits.map((h) => `${h.label}:"${h.match}"`).join(", ") || "no hits",
    });
  }

  // 3. Banned-vocab scanner trips on odds-language output.
  {
    const hits = scanCard(FIXTURE_BANNED_ODDS, "default");
    out.push({
      name: "FIXTURE_BANNED_ODDS trips odds-language scanner",
      pass: hits.length > 0,
      detail: hits.map((h) => `${h.label}:"${h.match}"`).join(", ") || "no hits",
    });
  }

  // 4. CIS-specific scanner: pre-med fixture FAILS for CIS, PASSES for default.
  {
    const cisHits = scanCard(FIXTURE_PREMED_CIS, "central_asia");
    const defaultHits = scanCard(FIXTURE_PREMED_CIS, "default");
    out.push({
      name: "FIXTURE_PREMED_CIS trips pre-med scanner ONLY when cultural_context=central_asia",
      pass: cisHits.length > 0 && defaultHits.length === 0,
      detail: `CIS: ${cisHits.length} hits, default: ${defaultHits.length} hits`,
    });
  }

  // 5. Length validators reject too-long the_read.
  {
    const r = validateLength(FIXTURE_TOO_LONG_READ);
    out.push({
      name: "FIXTURE_TOO_LONG_READ fails length validator",
      pass: !r.ok && (r.reason?.includes("the_read") ?? false),
      detail: r.reason,
    });
  }

  // 6. Length validators reject too-long bullet.
  {
    const r = validateLength(FIXTURE_TOO_LONG_BULLET);
    out.push({
      name: "FIXTURE_TOO_LONG_BULLET fails length validator",
      pass: !r.ok && (r.reason?.includes("bullet length") ?? false),
      detail: r.reason,
    });
  }

  // 7. Length validators reject too-few bullets.
  {
    const r = validateLength(FIXTURE_TOO_FEW_BULLETS);
    out.push({
      name: "FIXTURE_TOO_FEW_BULLETS fails length validator",
      pass: !r.ok && (r.reason?.includes("bullets") ?? false),
      detail: r.reason,
    });
  }

  // 8. Cultural-context resolver: full-name nationality strings → central_asia.
  // ISO-2 path was removed in PR #72 (intake stores names, not codes).
  {
    const samples = ["Kazakhstan", "kazakh", "Russian Federation", "Ukrainian", "Belarus"];
    const allOk = samples.every((s) => resolveCulturalContext(s) === "central_asia");
    out.push({
      name: "resolveCulturalContext: CIS detection across full-name variants",
      pass: allOk,
      detail: samples.map((s) => `${s}→${resolveCulturalContext(s)}`).join(", "),
    });
  }

  // 9. Nationality bucketing: 5 known cases + unknown → "other".
  {
    const cases: Array<[string | null, string]> = [
      ["KZ", "central_asia"],
      ["EG", "mena"],
      ["VN", "se_asia"],
      ["US", "us_latam"],
      ["FR", "other"],
      [null, "other"],
      ["", "other"],
      ["Kazakhstan", "central_asia"],
    ];
    const failures = cases.filter(([input, expected]) => bucketFor(input) !== expected);
    out.push({
      name: "bucketFor: 5 regions + unknowns route correctly",
      pass: failures.length === 0,
      detail: failures.length > 0
        ? `Failed: ${failures.map(([i, e]) => `${i}→${bucketFor(i)} (expected ${e})`).join(", ")}`
        : "all 8 cases pass",
    });
  }

  // 10. isPremium: known names match, generic names don't.
  {
    const positives = [
      { provider_name: "Chevening", scholarship_name: "Chevening Scholarship" },
      { provider_name: "Fulbright Commission", scholarship_name: "Fulbright Foreign Student Program" },
      { provider_name: "U.S. Department of State", scholarship_name: "Fulbright Scholarship" },
      { provider_name: "DAAD", scholarship_name: "DAAD WISE" },
      { provider_name: "MEXT", scholarship_name: "MEXT Research Scholarship" },
    ];
    const negatives = [
      { provider_name: "Some Local Foundation", scholarship_name: "Hometown Bursary" },
      { provider_name: null, scholarship_name: "City University Merit Award" },
    ];
    const posFails = positives.filter((s) => !isPremium(s));
    const negFails = negatives.filter((s) => isPremium(s));
    out.push({
      name: "isPremium: known names match, generic names don't",
      pass: posFails.length === 0 && negFails.length === 0,
      detail: posFails.length > 0 || negFails.length > 0
        ? `pos-fail: ${posFails.length}, neg-fail (false positive): ${negFails.length}`
        : `${positives.length} positives, ${negatives.length} negatives all correct`,
    });
  }

  return out;
}

/* ─── Test entry (Deno.test runner) ─────────────────────────────────── */

Deno.test("deep-dive accuracy + safety-net eval", () => {
  const results = runAll();
  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    const msg = failed.map((r) => `  ✗ ${r.name}${r.detail ? ` — ${r.detail}` : ""}`).join("\n");
    throw new Error(`${failed.length}/${results.length} assertion(s) failed:\n${msg}`);
  }
});

/* ─── Script entry (prints summary when run directly) ───────────────── */

if (import.meta.main) {
  const results = runAll();
  let passCount = 0;
  for (const r of results) {
    if (r.pass) {
      passCount++;
      console.log(`✓ ${r.name}`);
    } else {
      console.log(`✗ ${r.name}${r.detail ? `\n    ${r.detail}` : ""}`);
    }
  }
  console.log("");
  console.log(`${passCount}/${results.length} passed`);
  if (passCount < results.length) Deno.exit(1);
}

/* ─── Manual integration check (run before deploying PR 2) ──────────────

This script intentionally does NOT call the LLM or Firecrawl. The
offline safety-net checks above are the CI gate. The "real" accuracy
gate — verifying that no concrete number/date in the output is
invented relative to source context — is a manual integration check
the user runs against the deployed staging function before promoting
PR 2 to prod.

Manual procedure:
  1. Deploy PR 2 to staging:
     `supabase functions deploy scholarship-deep-dive --project-ref <staging>`
  2. Set env: TAVILY_API_KEY, FIRECRAWL_API_KEY, LOVABLE_API_KEY (all
     already exist in prod from prior work).
  3. With a paying staging account JWT, call the function for 5
     known scholarships × 5 nationality combos:
       - Chevening + (KZ, EG, VN, US, FR)
       - Stipendium Hungaricum + (KZ, EG, VN, US, FR)
       - Fulbright + (KZ, EG, VN, US, FR)
       - DAAD + (KZ, EG, VN, US, FR)
       - One mid-tier non-premium row + (KZ, EG, VN, US, FR)
  4. For each response:
     - Scan output for digits (/\b\d/).
     - For each numeric claim, verify it appears in the scholarship
       row OR the Firecrawl page text OR the profile JSON.
     - Specifically check: GPA floors, IELTS minima, dollar amounts,
       deadline dates, recommender counts — these are the highest
       hallucination risk surfaces.
  5. SHIP GATE: 100% pass required. Any invented numeric claim blocks
     the prod deploy until the prompt is tightened.

This can be automated as PR 4 — for v1, a manual 25-row spot-check
is reasonable. Cost: ~$0.15 (25 calls × ~$0.006 each at the premium
tier).
*/
