/**
 * handoff-headlines — closed library of personalized headlines for
 * the brief → Discover handoff card (Beat 7 of the v7 customer
 * journey, per ~/.claude/plans/ok-good-morning-claude-frolicking-moth.md).
 *
 * Why a closed library (no LLM):
 * - Brand consistency. Same archetype + same country count → same
 *   headline shape every time. Like Hogwarts house quotes, the
 *   archetype's narrative voice becomes social currency the more
 *   it repeats.
 * - Zero LLM cost on a surface that fires every brief.
 * - Predictable. The handoff card NEVER fails to render with a
 *   sensible headline — even when the archetype detector falls
 *   back, the generic template ships.
 *
 * Template variables:
 *   {countries} — joined country names ("Canada", "Canada & UK",
 *     "Canada, UK & Singapore" with Oxford-or-not depending on count)
 *
 * Add new archetypes here when archetype-library.ts grows. Add new
 * country-count branches if a real student case shows up that needs
 * a fourth or fifth country (currently capped at 3 by the brief
 * plan's countryBuckets validator).
 */

import type { ArchetypeId } from "../../../supabase/functions/_shared/archetype-library";

type CountryCount = "single" | "multi";

interface HeadlineTemplates {
  single: string;
  multi: string;
}

export const TEMPLATES: Record<ArchetypeId, HeadlineTemplates> = {
  "bridge-domain-kid": {
    single: "Bridge-Domain Kids like you usually save 4-5 scholarships in {countries}.",
    multi: "Bridge-Domain Kids like you usually save 3-5 scholarships across {countries}.",
  },
  "quiet-builder": {
    single: "Quiet Builders typically map 4-6 scholarships in {countries} before they apply.",
    multi: "Quiet Builders typically map 4-6 scholarships across {countries} before they apply.",
  },
  "late-bloomer": {
    single: "Late Bloomers tend to save 3-4 scholarships in {countries} — the ones that judge trajectory, not just numbers.",
    multi: "Late Bloomers tend to save 3-4 scholarships across {countries} — the ones that judge trajectory, not just numbers.",
  },
  "foreign-lane-native": {
    single: "Foreign-Lane Natives usually shortlist 4-7 scholarships in {countries}.",
    multi: "Foreign-Lane Natives usually shortlist 4-7 across {countries} — cross-region by default.",
  },
  "quiet-athlete": {
    single: "Quiet Athletes typically save 3-5 scholarships in {countries}.",
    multi: "Quiet Athletes typically save 3-5 across {countries}, with leadership-friendly programs in the mix.",
  },
  "competition-kid": {
    single: "Competition Kids usually save 5-7 scholarships in {countries} — merit awards skew their way.",
    multi: "Competition Kids usually save 5-7 across {countries} — merit awards skew their way.",
  },
  "community-anchor": {
    single: "Community Anchors save 4-6 scholarships in {countries}, often a civic-service grant.",
    multi: "Community Anchors save 4-6 across {countries}, with at least one civic-service grant in the mix.",
  },
  "self-taught": {
    single: "Self-Taught kids typically save 3-5 scholarships in {countries} where independent learning shows.",
    multi: "Self-Taught kids typically save 3-5 across {countries} where independent learning shows.",
  },
  storyteller: {
    single: "Storytellers usually shortlist 4-6 scholarships in {countries} — arts + writing programs in the mix.",
    multi: "Storytellers usually shortlist 4-6 across {countries} — arts + writing programs in the mix.",
  },
  quant: {
    single: "Quants save 4-7 scholarships in {countries}, mostly STEM-heavy.",
    multi: "Quants save 4-7 across {countries} — STEM + research-track programs skew their way.",
  },
  operator: {
    single: "Operators save 5-7 scholarships in {countries} — leadership awards skew their way.",
    multi: "Operators save 5-7 across {countries} — leadership awards skew their way.",
  },
  translator: {
    single: "Translators usually shortlist 4-6 scholarships in {countries} — cross-cultural fellowships in the mix.",
    multi: "Translators usually shortlist 4-6 across {countries} — cross-cultural fellowships in the mix.",
  },
  "open-question": {
    single: "Kids still figuring it out tend to save 4-6 scholarships in {countries} — keeping options open.",
    multi: "Kids still figuring it out tend to save 4-6 across {countries} — keeping options open.",
  },
  "tight-lane": {
    single: "Tight-Lane kids usually save 4-5 scholarships in {countries}, focused on the major's strongest programs.",
    multi: "Tight-Lane kids usually save 4-5 across {countries}, focused on the major's strongest programs.",
  },
  recoverer: {
    single: "Recoverers tend to save 4-6 scholarships in {countries}, including need-based and second-chance awards.",
    multi: "Recoverers tend to save 4-6 across {countries}, including need-based and second-chance awards.",
  },
  contrarian: {
    single: "Contrarians often save 4-6 scholarships in {countries} — schools that actively want non-conformists.",
    multi: "Contrarians often save 4-6 across {countries} — schools that actively want non-conformists.",
  },
};

const GENERIC_FALLBACK: HeadlineTemplates = {
  single: "Students with your profile usually save 4-6 scholarships in {countries}.",
  multi: "Students with your profile usually save 4-6 scholarships across {countries}.",
};

/** Join country names with Oxford-or-not depending on count:
 *   ["Canada"]                        → "Canada"
 *   ["Canada", "UK"]                  → "Canada & UK"
 *   ["Canada", "UK", "Singapore"]     → "Canada, UK & Singapore"
 *   ["Canada", "UK", "X", "Y"]        → "Canada, UK, X & Y"  (rare; capped at 3 by plan)
 */
function joinCountries(countries: ReadonlyArray<string>): string {
  if (countries.length === 0) return "your countries";
  if (countries.length === 1) return countries[0];
  if (countries.length === 2) return `${countries[0]} & ${countries[1]}`;
  const head = countries.slice(0, -1).join(", ");
  return `${head} & ${countries[countries.length - 1]}`;
}

/** Build the headline string from an archetype id + a list of
 *  country buckets. Falls back to a generic template if the
 *  archetype isn't in the library (defensive — shouldn't happen
 *  in production since the planner validates archetype.id against
 *  the closed library upstream). */
export function buildHandoffHeadline(
  archetypeId: ArchetypeId | string | undefined,
  countries: ReadonlyArray<string>,
): string {
  const countCategory: CountryCount = countries.length <= 1 ? "single" : "multi";
  const templates = archetypeId && archetypeId in TEMPLATES
    ? TEMPLATES[archetypeId as ArchetypeId]
    : GENERIC_FALLBACK;
  return templates[countCategory].replace("{countries}", joinCountries(countries));
}
