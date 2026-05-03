/**
 * Personal Match — universal scoring across the product.
 *
 * One source of truth for "how well does scholarship X fit MY profile".
 * Every ScholarshipCard, every listing, every share preview can call
 * computeMatch(profile, scholarship) and get a consistent 0–100 score
 * with an explanation breakdown.
 *
 * Profile lives in localStorage (key: `topuni-profile-v1`) so anon
 * visitors get personalization too — no signup required. Authed users
 * can sync to student_profiles later (deferred — not all profiles
 * have written rows yet, this lets the feature work universally).
 *
 * Scoring philosophy
 * - Eligibility-first: hard fails (citizenship lockout, GPA below
 *   floor, IELTS below floor) cap the score at "Unlikely" tier.
 * - Affinity stacking: country preference, degree level, field
 *   preference each contribute. No single dimension dominates so
 *   we don't punish one mismatch.
 * - Honest tiering: scores < 40 read "Unlikely" not "low fit" so
 *   nobody gets oversold.
 *
 * The function is pure — easy to test, no side effects. The heavy
 * lifting (semantic similarity) lives in match-scholarships edge fn;
 * this is for the universal "is this for me" gut-check on every
 * card without needing a server round-trip.
 */

export interface PersonalProfile {
  /** ISO country name. Powers eligibility checks. */
  nationality?: string | null;
  /** "bachelor" | "master" | "phd" | "postdoc" */
  degreeLevel?: string | null;
  /** Free text — used for fuzzy match against target_fields */
  field?: string | null;
  /** Target countries (study destinations) — array */
  targetCountries?: string[];
  /** GPA on a 4.0 scale (we normalize at compute time if needed) */
  gpa?: number | null;
  /** Original GPA scale (4.0 / 5.0 / 10.0) — defaults to 4.0 */
  gpaScale?: number | null;
  /** IELTS overall band 0–9 */
  ielts?: number | null;
  /** TOEFL iBT 0–120 */
  toefl?: number | null;
  /** When the user filled this out (for stale-prompt heuristics) */
  filledAt?: string | null;
}

export interface ScholarshipForMatch {
  scholarship_id: string;
  host_country: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  eligible_countries: string[] | null;
  citizenship_requirements?: string | null;
  min_gpa: number | null;
  gpa_scale: number | null;
  min_ielts: number | null;
  min_toefl: number | null;
  coverage_type?: string;
}

export interface MatchResult {
  /** 0–100 weighted score */
  score: number;
  /** Tier label that maps to a UX color */
  tier: "exceptional" | "strong" | "competitive" | "worth_exploring" | "unlikely";
  /** Detailed component breakdown — used for tooltips / debugging */
  breakdown: {
    eligibility: { passed: boolean; reason?: string };
    countryAffinity: number;     // 0–25
    levelMatch: number;          // 0–20
    fieldMatch: number;          // 0–20
    academicFit: number;         // 0–20 (GPA + tests)
    coverageBonus: number;       // 0–15
  };
  /** Human-friendly one-line explanation */
  reason: string;
}

const PROFILE_KEY = "topuni-profile-v1";

/** Get the stored profile, or null if never set / corrupt. */
export function loadProfile(): PersonalProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    return p as PersonalProfile;
  } catch { return null; }
}

/** Persist profile. Patches partial updates onto the existing record. */
export function saveProfile(patch: Partial<PersonalProfile>): PersonalProfile {
  const existing = loadProfile() ?? {};
  const merged: PersonalProfile = { ...existing, ...patch, filledAt: new Date().toISOString() };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  } catch { /* quota exceeded — silently noop */ }
  // Notify listeners on this tab (custom event); other tabs get the
  // 'storage' event natively from localStorage writes.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("topuni-profile-changed"));
  }
  return merged;
}

export function clearProfile() {
  try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("topuni-profile-changed"));
  }
}

/** Returns true if the profile has at least the minimum signal for matching. */
export function profileIsUseful(p: PersonalProfile | null | undefined): boolean {
  if (!p) return false;
  return !!(p.degreeLevel || p.targetCountries?.length || p.field || p.gpa || p.ielts);
}

/** Normalize free-text country to a comparable lowercase slug. */
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");

/** Convert any GPA scale to 4.0 equivalent for honest comparison. */
function gpaTo4(gpa: number, scale: number | null | undefined): number {
  const s = scale && scale > 0 ? scale : 4;
  if (s === 4) return Math.min(gpa, 4);
  return Math.min((gpa / s) * 4, 4);
}

/** TOEFL iBT to IELTS rough conversion (ETS published table averaged). */
function toefl2ielts(toefl: number): number {
  if (toefl >= 118) return 9.0;
  if (toefl >= 110) return 8.5;
  if (toefl >= 102) return 8.0;
  if (toefl >= 94)  return 7.5;
  if (toefl >= 79)  return 7.0;
  if (toefl >= 60)  return 6.5;
  if (toefl >= 46)  return 6.0;
  return 5.5;
}

/** Pure function: score scholarship against profile. Returns full breakdown. */
export function computeMatch(profile: PersonalProfile, sch: ScholarshipForMatch): MatchResult {
  const breakdown: MatchResult["breakdown"] = {
    eligibility:    { passed: true },
    countryAffinity: 0,
    levelMatch:     0,
    fieldMatch:     0,
    academicFit:    0,
    coverageBonus:  0,
  };

  // ── ELIGIBILITY GATES ────────────────────────────────────────────────
  // Citizenship lockout: if scholarship lists eligible_countries and the
  // profile's nationality isn't in there (and the list isn't empty/global),
  // we hard-cap.
  if (profile.nationality && Array.isArray(sch.eligible_countries) && sch.eligible_countries.length > 0) {
    const candidates = sch.eligible_countries.map(norm);
    const isGlobal = candidates.includes(norm("global")) || candidates.includes(norm("any"));
    if (!isGlobal && !candidates.includes(norm(profile.nationality))) {
      breakdown.eligibility = { passed: false, reason: "Citizenship not eligible" };
    }
  }

  // GPA floor check
  if (sch.min_gpa && profile.gpa) {
    const userOnFour = gpaTo4(profile.gpa, profile.gpaScale ?? null);
    const reqOnFour  = gpaTo4(sch.min_gpa, sch.gpa_scale ?? null);
    if (userOnFour < reqOnFour - 0.05) {
      breakdown.eligibility = { passed: false, reason: `Min GPA ${reqOnFour.toFixed(1)}, you have ${userOnFour.toFixed(1)}` };
    }
  }

  // English language floor — accept either IELTS or TOEFL evidence
  if (sch.min_ielts) {
    const evidence = profile.ielts ?? (profile.toefl ? toefl2ielts(profile.toefl) : null);
    if (evidence !== null && evidence < sch.min_ielts - 0.25) {
      breakdown.eligibility = { passed: false, reason: `Min IELTS ${sch.min_ielts}, you have ${evidence.toFixed(1)}` };
    }
  } else if (sch.min_toefl && profile.toefl && profile.toefl < sch.min_toefl - 5) {
    breakdown.eligibility = { passed: false, reason: `Min TOEFL ${sch.min_toefl}` };
  }

  // ── COUNTRY AFFINITY (0–25) ──────────────────────────────────────────
  if (sch.host_country && profile.targetCountries && profile.targetCountries.length > 0) {
    const target = profile.targetCountries.map(norm);
    if (target.includes(norm(sch.host_country))) breakdown.countryAffinity = 25;
    // Regional adjacency: someone targeting "United Kingdom" likely OK with Ireland too
    else if (regionMatches(profile.targetCountries, sch.host_country)) breakdown.countryAffinity = 12;
    else breakdown.countryAffinity = 4; // some baseline so a mismatch isn't 0
  } else {
    // No target preference — give baseline credit so the score isn't anchored low
    breakdown.countryAffinity = 12;
  }

  // ── LEVEL MATCH (0–20) ───────────────────────────────────────────────
  if (sch.target_degree_level && sch.target_degree_level.length > 0) {
    const levels = sch.target_degree_level.map((l) => l.toLowerCase());
    if (profile.degreeLevel) {
      breakdown.levelMatch = levels.includes(profile.degreeLevel.toLowerCase()) ? 20 : 0;
    } else {
      breakdown.levelMatch = 10; // unknown — split the difference
    }
  } else {
    breakdown.levelMatch = 15; // open to all levels
  }

  // ── FIELD MATCH (0–20) ───────────────────────────────────────────────
  if (sch.target_fields && sch.target_fields.length > 0 && profile.field) {
    const fields = sch.target_fields.map(norm);
    if (fields.includes(norm("any"))) breakdown.fieldMatch = 18; // open programs reward most fields
    else if (fields.some((f) => f.includes(norm(profile.field!)) || norm(profile.field!).includes(f))) breakdown.fieldMatch = 20;
    else breakdown.fieldMatch = 4;
  } else {
    breakdown.fieldMatch = 12;
  }

  // ── ACADEMIC FIT (0–20) ──────────────────────────────────────────────
  let acad = 0;
  if (profile.gpa && sch.min_gpa) {
    const u = gpaTo4(profile.gpa, profile.gpaScale ?? null);
    const r = gpaTo4(sch.min_gpa, sch.gpa_scale ?? null);
    if (u >= r) acad += 8 + Math.min(4, (u - r) * 4); // up to +4 for buffer
    else acad += Math.max(0, 8 - (r - u) * 6);
  } else {
    acad += 6; // unknown — give partial credit
  }
  if (profile.ielts && sch.min_ielts) {
    if (profile.ielts >= sch.min_ielts) acad += 4 + Math.min(4, (profile.ielts - sch.min_ielts) * 2);
    else acad += Math.max(0, 4 - (sch.min_ielts - profile.ielts) * 4);
  } else {
    acad += 4;
  }
  breakdown.academicFit = Math.min(20, Math.round(acad));

  // ── COVERAGE BONUS (0–15) ────────────────────────────────────────────
  // Full ride > tuition > stipend > other — full ride is the universal
  // "I really want this one" signal.
  if (sch.coverage_type === "full_ride")    breakdown.coverageBonus = 15;
  else if (sch.coverage_type === "partial") breakdown.coverageBonus = 8;
  else if (sch.coverage_type === "tuition_only") breakdown.coverageBonus = 10;
  else if (sch.coverage_type === "stipend") breakdown.coverageBonus = 7;
  else breakdown.coverageBonus = 5;

  // ── TOTAL ────────────────────────────────────────────────────────────
  const raw =
    breakdown.countryAffinity +
    breakdown.levelMatch +
    breakdown.fieldMatch +
    breakdown.academicFit +
    breakdown.coverageBonus;

  // Cap at 35 if eligibility failed — keeps the user honest without
  // outright hiding the row (they may want to apply anyway / our data
  // may be wrong about eligibility).
  let score = breakdown.eligibility.passed ? raw : Math.min(raw, 35);
  // Clamp + round
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier: MatchResult["tier"] =
    !breakdown.eligibility.passed ? "unlikely"
    : score >= 80 ? "exceptional"
    : score >= 65 ? "strong"
    : score >= 50 ? "competitive"
    : score >= 35 ? "worth_exploring"
    : "unlikely";

  const reason = explain(breakdown, tier, score);

  return { score, tier, breakdown, reason };
}

/** Lightweight regional adjacency for country affinity. Not exhaustive. */
const REGIONS: Record<string, string[]> = {
  uk:    ["united kingdom", "ireland"],
  eu:    ["germany", "france", "netherlands", "belgium", "spain", "italy", "sweden", "denmark", "norway", "finland", "austria", "ireland", "portugal", "czech republic", "poland", "hungary", "estonia"],
  na:    ["united states", "canada"],
  apac:  ["singapore", "hong kong", "japan", "south korea", "australia", "new zealand", "china"],
};
function regionMatches(targets: string[], host: string): boolean {
  const hostNorm = host.toLowerCase().trim();
  for (const region of Object.values(REGIONS)) {
    const inRegion = region.includes(hostNorm);
    if (!inRegion) continue;
    for (const t of targets) {
      const tNorm = t.toLowerCase().trim();
      if (region.includes(tNorm)) return true;
    }
  }
  return false;
}

function explain(b: MatchResult["breakdown"], tier: MatchResult["tier"], score: number): string {
  if (!b.eligibility.passed) return b.eligibility.reason ?? "Eligibility unclear";
  const parts: string[] = [];
  if (b.countryAffinity >= 20) parts.push("country fit");
  if (b.levelMatch >= 18)      parts.push("level match");
  if (b.fieldMatch >= 18)      parts.push("field aligned");
  if (b.academicFit >= 16)     parts.push("academics solid");
  if (parts.length === 0) return `${tier.replace("_", " ")} fit · score ${score}`;
  return `${parts.slice(0, 3).join(" · ")} · score ${score}`;
}

/** Tier → tailwind colors for the badge. Keep in sync with ScholarshipCard. */
export const TIER_STYLES: Record<MatchResult["tier"], { bg: string; ring: string; label: string; emoji: string }> = {
  exceptional:     { bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-500/30", label: "Exceptional fit", emoji: "✦" },
  strong:          { bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-500/20", label: "Strong fit",      emoji: "●" },
  competitive:     { bg: "bg-amber-500/10 text-amber-700 dark:text-amber-300",       ring: "ring-amber-500/20",   label: "Competitive",     emoji: "●" },
  worth_exploring: { bg: "bg-muted text-muted-foreground",                            ring: "ring-border",         label: "Worth exploring", emoji: "○" },
  unlikely:        { bg: "bg-destructive/10 text-destructive",                        ring: "ring-destructive/20", label: "Unlikely fit",    emoji: "✕" },
};
