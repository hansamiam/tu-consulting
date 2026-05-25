/**
 * 02 · Where You Can Land — country buckets (v7) or tier entries (v6).
 *
 * v7 (current) emits `payload.buckets[]`: each bucket is a destination
 * country with optional city anchors and 1-3 schools, each school
 * carrying a one-line `lore` string. The prompt's pile-contrast and
 * visa-realism logic produces these directly off the intake's
 * targetCountries — no reach/target/safety language anywhere.
 *
 * v6 (legacy, cached briefs only) emits `payload.entries[]`: each
 * entry is a school with `tier: reach | target | safety`. Kept as
 * a fallback so the ~7-day cache window doesn't render blank.
 *
 * Display: 1-col on mobile, 3-up on desktop. The country bucket
 * acts as a "tier" visually (gold for the primary, then alternating
 * accents), with city anchors under the country and each school
 * stacked top-to-bottom inside the card with its lore line.
 *
 * Sparse-result fallback (Stream E, 2026-05-25): when fewer than 3
 * country buckets are present OR the user picked only 1 target country,
 * a "You might also fit" strip surfaces 3 adjacent-tier countries with
 * 1 sample school each (from the live Supabase catalog) + a Discover CTA.
 */
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SectionDivider } from "../primitives/SectionDivider";
import { LeadParagraph } from "../primitives/LeadParagraph";
import { EditorialCard } from "../primitives/EditorialCard";
import {
  SECTION_KICKERS,
  type WhereYouCanLandPayload,
  type SchoolEntry,
  type CountryBucket,
} from "../types";
import { tokenToIso } from "@/lib/adjacent-countries";
import { useAdjacentSuggestions } from "@/lib/use-adjacent-suggestions";

const TIER_LABEL: Record<SchoolEntry["tier"], string> = {
  reach: "Reach",
  target: "Target",
  safety: "Safety",
};

const TIER_ACCENT = {
  reach: "rose",
  target: "gold",
  safety: "emerald",
} as const;

// Rotate accents across country buckets so each card reads as its
// own visual unit without re-using reach/target/safety semantics.
const BUCKET_ACCENTS = ["gold", "rose", "emerald"] as const;

const SchoolPanel: React.FC<{ school: SchoolEntry }> = ({ school }) => {
  return (
    <EditorialCard accent={TIER_ACCENT[school.tier]}>
      <div className="font-heading text-[10.5px] uppercase tracking-[0.28em] text-muted-foreground font-semibold mb-3">
        {TIER_LABEL[school.tier]}
      </div>
      <div className="font-heading font-bold text-foreground text-xl sm:text-2xl tracking-[-0.015em] leading-tight">
        {school.name}
      </div>
      {school.country && (
        <div className="font-heading text-xs uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
          {school.country}
        </div>
      )}
      {school.whyItFits && (
        <p className="font-heading italic text-foreground/80 text-[15px] leading-[1.55] mt-4">
          {school.whyItFits}
        </p>
      )}
      {school.threshold && (
        <div className="mt-5 pt-4 border-t border-border/60 font-heading text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
          {school.threshold}
        </div>
      )}
      {school.careerAnchor && (
        <div className="mt-2 font-heading text-[13px] text-gold-dark font-medium leading-snug">
          {school.careerAnchor}
        </div>
      )}
    </EditorialCard>
  );
};

const BucketPanel: React.FC<{ bucket: CountryBucket; accent: (typeof BUCKET_ACCENTS)[number] }> = ({
  bucket,
  accent,
}) => {
  return (
    <EditorialCard accent={accent}>
      <div className="font-heading text-[10.5px] uppercase tracking-[0.28em] text-muted-foreground font-semibold mb-3">
        {bucket.country}
      </div>
      {bucket.cities && (
        <div className="font-heading text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
          {bucket.cities}
        </div>
      )}
      <div className="space-y-5">
        {(bucket.schools ?? []).map((school, i) => (
          <div
            key={`${bucket.country}-${i}`}
            className={
              i > 0
                ? "pt-5 border-t border-border/60"
                : ""
            }
          >
            <div className="font-heading font-bold text-foreground text-lg sm:text-xl tracking-[-0.015em] leading-tight">
              {school.name}
            </div>
            {school.lore && (
              <p className="font-heading italic text-foreground/80 text-[14.5px] leading-[1.55] mt-2">
                {school.lore}
              </p>
            )}
          </div>
        ))}
      </div>
    </EditorialCard>
  );
};

interface WhereYouCanLandProps {
  payload: WhereYouCanLandPayload;
  /**
   * User's raw target-country tokens from the intake wizard
   * (e.g. ["Germany"] or ["Germany", "Netherlands"]).
   * Used to determine whether to show the adjacency strip.
   * Optional — callers that haven't been updated yet pass nothing;
   * the strip falls back to deriving from buckets.
   */
  targetCountries?: string[];
  /** Display language for adjacency strip country names. */
  lang?: "en" | "ru";
}

export const WhereYouCanLand: React.FC<WhereYouCanLandProps> = ({
  payload,
  targetCountries = [],
  lang = "en",
}) => {
  const kicker = payload.kicker ?? SECTION_KICKERS.whereYouCanLand;
  const headline = payload.headline ?? "Where you can land";

  // v7 primary path — country buckets. Use when present and non-empty.
  const buckets = payload.buckets ?? [];
  const useBuckets = buckets.length > 0;

  // v6 fallback — reach/target/safety entries. Only consulted when
  // buckets are absent (cached briefs from before the v7 prompt
  // rolled out).
  const entries = payload.entries ?? [];
  const orderedEntries = [...entries].sort((a, b) => {
    const order = { reach: 0, target: 1, safety: 2 };
    return (order[a.tier] ?? 9) - (order[b.tier] ?? 9);
  });

  // Sparse condition: fewer than 3 buckets, OR only 1 target country.
  const isSparse = buckets.length < 3 || targetCountries.length === 1;

  // Derive primary ISO: prefer first targetCountries token, fall back
  // to first bucket's country name.
  const primaryToken = targetCountries[0] ?? buckets[0]?.country ?? null;
  const primaryIso = primaryToken ? tokenToIso(primaryToken) : null;

  const adjacentSamples = useAdjacentSuggestions(
    isSparse ? primaryIso : null,
    lang,
  );

  const adjacencyHeading = lang === "ru" ? "Вам также подойдут" : "You might also fit";

  return (
    <section id="brief-where-you-can-land">
      <SectionDivider kicker={kicker} headline={headline} />
      {payload.lead && <LeadParagraph text={payload.lead} />}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
        {useBuckets
          ? buckets.map((bucket, i) => (
              <BucketPanel
                key={`${bucket.country}-${i}`}
                bucket={bucket}
                accent={BUCKET_ACCENTS[i % BUCKET_ACCENTS.length]}
              />
            ))
          : orderedEntries.map((school, i) => (
              <SchoolPanel key={`${school.tier}-${i}`} school={school} />
            ))}
      </div>

      {/* Adjacency strip — only shown when sparse and suggestions resolved */}
      {isSparse && adjacentSamples.length > 0 && (
        <div className="mt-10 max-w-5xl mx-auto">
          <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-4">
            {adjacencyHeading}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {adjacentSamples.map((sample) => (
              <Link
                key={sample.iso}
                to={`/discover?country=${encodeURIComponent(COUNTRY_NAMES_EN[sample.iso] ?? sample.iso)}`}
                className="group flex flex-col gap-1.5 rounded-xl border border-border/70 bg-surface hover:border-gold/50 hover:bg-gold/5 px-4 py-3.5 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading font-semibold text-[14px] text-foreground leading-tight">
                    {sample.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold-dark group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                {sample.sampleSchool && (
                  <span className="font-heading italic text-[12.5px] text-muted-foreground leading-snug">
                    {sample.sampleSchool}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

// Helper: English names for ISO codes (used for Discover URL params).
const COUNTRY_NAMES_EN: Record<string, string> = {
  DEU: "Germany", NLD: "Netherlands", GBR: "United Kingdom",
  USA: "United States", CAN: "Canada", AUS: "Australia",
  NZL: "New Zealand", IRL: "Ireland", TUR: "Türkiye",
  HUN: "Hungary", POL: "Poland", CZE: "Czechia",
  AUT: "Austria", CHE: "Switzerland", FRA: "France",
  ITA: "Italy", ESP: "Spain", PRT: "Portugal",
  SWE: "Sweden", NOR: "Norway", DNK: "Denmark",
  FIN: "Finland", EST: "Estonia", BEL: "Belgium",
  SGP: "Singapore", JPN: "Japan", KOR: "South Korea",
};
