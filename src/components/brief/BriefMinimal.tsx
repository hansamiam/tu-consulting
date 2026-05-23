/**
 * BriefDeck — 2026-05-20 redesign #3. McKinsey-grade polish pass.
 *
 * Earlier rev had yellow-band slide headers + heavy table borders
 * that read as "AI slob stock template". This rev tightens every
 * surface against a strict design system:
 *
 *   COLOR DISCIPLINE
 *     • neutral-900 / neutral-700 / neutral-500 / neutral-100 grayscale
 *     • Single accent: hsl(var(--gold-dark)) — used only for eyebrow
 *       kickers and rule lines, never as a background fill except on
 *       the dark cover slide.
 *     • Cover slide is the only dark surface (deep navy 222 30% 10%).
 *
 *   TYPOGRAPHY
 *     • Eyebrow: 10.5px mono, uppercase, tracking-[0.22em], gold-dark.
 *     • Slide title: 32–40px display weight, neutral-900, tight
 *       tracking, generous leading.
 *     • Body: 15px, line-height 1.7, neutral-700.
 *     • Column headers in tables: 10.5px uppercase tracking-[0.18em]
 *       neutral-500 (no fill, no bold — just letter-spacing).
 *
 *   STRUCTURE
 *     • Each slide = its own card with px-10 py-14 internal padding
 *       (was px-8 py-8 cramped).
 *     • Tables: ZERO outer borders, only top-row hairlines between
 *       data rows. Alternating bg every other row (neutral-50/white)
 *       at 50% opacity for whisper-light banding.
 *     • Slide footer: thin hairline + tiny number, no slide number
 *       boxes / pill chrome.
 *     • Section dividers between slides: a single hairline at 1/3
 *       width, centered.
 *
 *   REFERENCE
 *     User shared an Admissionado action-plan PDF (Pre-12 Lodestar).
 *     Same skeleton — cover + 4 content slides + table-style content —
 *     but Admissionado's yellow-block heads felt corporate; we go
 *     with the McKinsey/Bain pattern: eyebrow + display headline +
 *     hairline rule.
 */
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, GraduationCap } from "lucide-react";
import {
  SECTION_ORDER,
  type BriefSections,
  type SectionId,
  type SchoolEntry,
  type EssayEntry,
  type GapEntry,
  type WeekBlock,
  type CountryBucket,
  type EssaySeed,
  type MondayMove,
  type ArchetypePayload,
} from "./types";
import {
  ArchetypeShareCard,
  WhereYouStandShareCard,
  WhereYouBelongShareCard,
  EssaySeedShareCard,
  MondayMoveShareCard,
  shareCardAsImage,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
} from "./ShareAsset";

interface CommonProps {
  studentName: string;
  gradeLabel?: string;
  generatedAt?: string;
  onShare?: () => void;
  onPrint?: () => void;
}

interface StaticProps extends CommonProps {
  mode: "static";
  sections: BriefSections;
}

interface StreamProps extends CommonProps {
  mode: "stream";
  streamUrl: string;
  requestBody: Record<string, unknown>;
  authHeader?: string;
  onComplete?: (sections: BriefSections) => void;
  onError?: (err: Error) => void;
}

type Props = StaticProps | StreamProps;

// ─── Slide chrome ─────────────────────────────────────────────────────

const Slide: React.FC<{
  number: number;
  kicker: string;
  title: string;
  children: React.ReactNode;
}> = ({ number, kicker, title, children }) => (
  <article className="bg-white border border-neutral-200/80 rounded-lg overflow-hidden mb-10 sm:mb-14 break-inside-avoid print:mb-0 print:rounded-none print:border-x-0">
    {/* Header — no fill band. Eyebrow + display title + hairline rule. */}
    <header className="px-8 sm:px-14 pt-14 sm:pt-20 pb-8 sm:pb-10">
      <p className="font-mono text-[10.5px] text-gold-dark uppercase tracking-[0.22em] font-semibold mb-5">
        <span className="tabular-nums">{String(number).padStart(2, "0")}</span>
        <span className="mx-2 text-neutral-300">·</span>
        {kicker}
      </p>
      <h2 className="font-heading text-neutral-900 text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.08] max-w-[26ch]">
        {title}
      </h2>
      <div className="mt-7 h-px w-12 bg-gold-dark" aria-hidden />
    </header>

    <div className="px-8 sm:px-14 pb-14 sm:pb-20">
      {children}
    </div>

    <footer className="flex items-center justify-between px-8 sm:px-14 py-4 border-t border-neutral-100 text-[10.5px] uppercase tracking-[0.22em] font-medium">
      <span className="text-neutral-400">TopUni · Strategy report</span>
      <span className="text-neutral-500 tabular-nums">{String(number).padStart(2, "0")} / 05</span>
    </footer>
  </article>
);

const SlideSkeleton: React.FC<{ number: number; kicker: string; title: string }> = ({ number, kicker, title }) => (
  <Slide number={number} kicker={kicker} title={title}>
    <div className="animate-pulse space-y-3 pt-2">
      <div className="h-3 bg-neutral-100 rounded w-3/4" />
      <div className="h-3 bg-neutral-100 rounded w-1/2" />
      <div className="h-3 bg-neutral-100 rounded w-5/6" />
    </div>
  </Slide>
);

// ─── Slide 01 — Cover ─────────────────────────────────────────────────

const Cover: React.FC<{ studentName: string; gradeLabel?: string; generatedAt?: string }> = ({
  studentName, gradeLabel, generatedAt,
}) => {
  const firstName = (studentName ?? "").trim().split(/\s+/)[0] || "you";
  const dateLine = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;
  return (
    <article
      className="rounded-lg overflow-hidden mb-10 sm:mb-14 print:rounded-none print:mb-0 text-white relative"
      style={{ background: "hsl(222 30% 10%)" }}
    >
      {/* Soft gold radial spotlight behind the wordmark. */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, hsl(var(--gold) / 0.10) 0%, transparent 55%)",
        }}
      />
      <div className="relative px-8 sm:px-14 py-20 sm:py-32 text-center">
        <p className="font-mono text-gold uppercase tracking-[0.36em] text-[10.5px] font-semibold mb-10">
          TopUni
        </p>
        <h1 className="font-heading text-white text-[40px] sm:text-[64px] font-bold tracking-[-0.03em] leading-[1.02] max-w-[16ch] mx-auto">
          Strategy report
        </h1>
        <div className="mt-7 h-px w-12 bg-gold mx-auto" aria-hidden />
        <p className="font-heading text-neutral-300 text-[17px] sm:text-[20px] font-medium tracking-tight mt-7">
          for <span className="text-gold">{firstName}</span>
        </p>
      </div>
      <footer className="relative flex items-center justify-between px-8 sm:px-14 py-4 border-t border-white/10 text-[10.5px] uppercase tracking-[0.22em] font-medium">
        <span className="text-neutral-500">
          {gradeLabel && <span className="text-gold">{gradeLabel}</span>}
          {gradeLabel && dateLine && <span className="mx-2 text-neutral-700">·</span>}
          {dateLine && <span>{dateLine}</span>}
        </span>
        <span className="text-neutral-500 tabular-nums">01 / 05</span>
      </footer>
    </article>
  );
};

// ─── Slide 02 — The Starting Line ─────────────────────────────────────

const StartingLine: React.FC<{
  thesis?: string;
  body?: string;
  gaps: GapEntry[];
  color?: string;
}> = ({ thesis, body, gaps, color }) => (
  <WrappedCard
    kicker="01 · Where you stand"
    headline={thesis ?? "Where you stand today."}
    color={color}
    expandLabel="Read the reasoning"
    collapseLabel="Hide the reasoning"
  >
    {body && (
      <div className="space-y-4 text-neutral-700 text-[15px] leading-[1.75] max-w-[64ch]">
        {body.split(/\n\n+/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    )}

    {gaps.length > 0 && (
      <div className="mt-12 sm:mt-14">
        <p className="font-mono text-[10.5px] text-neutral-500 uppercase tracking-[0.18em] font-medium mb-5">
          Close these
        </p>
        <ol className="divide-y divide-neutral-100">
          {gaps.map((g, i) => (
            <li key={i} className="py-5 grid grid-cols-[auto,1fr] gap-x-5 sm:gap-x-7">
              <span className="font-mono text-neutral-300 text-[14px] font-medium tabular-nums pt-0.5 min-w-[28px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-heading font-semibold text-neutral-900 text-[16px] leading-snug tracking-[-0.005em]">
                  {g.title}
                </p>
                {g.actionThisMonth && (
                  <p className="text-neutral-600 text-[14px] leading-relaxed mt-2 max-w-[58ch]">
                    {g.actionThisMonth}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    )}
  </WrappedCard>
);

// ─── Slide 03 — Where you can land ────────────────────────────────────

const TIER_STYLE: Record<SchoolEntry["tier"], { label: string; dot: string }> = {
  reach: { label: "Reach", dot: "bg-rose-400" },
  target: { label: "Target", dot: "bg-gold" },
  safety: { label: "Safety", dot: "bg-emerald-400" },
};

const Shortlist: React.FC<{ entries: SchoolEntry[] }> = ({ entries }) => (
  <Slide number={3} kicker="Where you can land" title="Three schools to anchor on.">
    <ol className="divide-y divide-neutral-100">
      {entries.map((s, i) => {
        const tier = TIER_STYLE[s.tier] ?? TIER_STYLE.target;
        return (
          <li key={`${s.name}-${i}`} className="py-6 sm:py-7 grid grid-cols-[auto,1fr] gap-x-5 sm:gap-x-7">
            {/* Tier marker — dot + small label, no badge fill. */}
            <div className="pt-0.5 min-w-[72px]">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} aria-hidden />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-neutral-500 font-medium">
                  {tier.label}
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h3 className="font-heading text-neutral-900 font-bold text-[18px] sm:text-[19px] tracking-[-0.01em]">
                  {s.name}
                </h3>
                {s.country && (
                  <span className="text-neutral-400 text-[12.5px]">{s.country}</span>
                )}
              </div>
              {s.whyItFits && (
                <p className="text-neutral-700 text-[14.5px] leading-[1.7] mt-2.5 max-w-[58ch]">
                  {s.whyItFits}
                </p>
              )}
              {(s.threshold || s.careerAnchor) && (
                <dl className="mt-4 grid sm:grid-cols-2 gap-x-10 gap-y-2 text-[13.5px]">
                  {s.threshold && (
                    <div>
                      <dt className="text-neutral-400 text-[10.5px] uppercase tracking-[0.18em] font-medium">
                        Threshold
                      </dt>
                      <dd className="text-neutral-700 mt-1 leading-relaxed">{s.threshold}</dd>
                    </div>
                  )}
                  {s.careerAnchor && (
                    <div>
                      <dt className="text-neutral-400 text-[10.5px] uppercase tracking-[0.18em] font-medium">
                        Anchor with
                      </dt>
                      <dd className="text-neutral-700 mt-1 leading-relaxed">{s.careerAnchor}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  </Slide>
);

// ─── Slide 04 — What to write ─────────────────────────────────────────

const EssayAngles: React.FC<{ entries: EssayEntry[] }> = ({ entries }) => (
  <Slide number={4} kicker="What to write" title="Three angles only you can write.">
    <ol className="divide-y divide-neutral-100">
      {entries.map((e, i) => (
        <li key={`${e.title}-${i}`} className="py-6 sm:py-7 grid grid-cols-[auto,1fr] gap-x-5 sm:gap-x-7">
          <span className="font-mono text-neutral-300 text-[14px] font-medium tabular-nums pt-0.5 min-w-[36px]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-neutral-900 font-bold text-[18px] sm:text-[19px] tracking-[-0.01em] leading-snug">
              {e.title}
            </h3>
            {e.anchorItWith && (
              <p className="text-neutral-700 text-[14.5px] leading-[1.7] mt-2.5 max-w-[58ch]">
                {e.anchorItWith}
              </p>
            )}
            {(e.whyItWorks || e.playsBestTo) && (
              <dl className="mt-4 grid sm:grid-cols-2 gap-x-10 gap-y-2 text-[13.5px]">
                {e.whyItWorks && (
                  <div>
                    <dt className="text-neutral-400 text-[10.5px] uppercase tracking-[0.18em] font-medium">
                      Why it works
                    </dt>
                    <dd className="text-neutral-700 mt-1 leading-relaxed">{e.whyItWorks}</dd>
                  </div>
                )}
                {e.playsBestTo && (
                  <div>
                    <dt className="text-neutral-400 text-[10.5px] uppercase tracking-[0.18em] font-medium">
                      Plays best to
                    </dt>
                    <dd className="text-neutral-700 mt-1 leading-relaxed">{e.playsBestTo}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </li>
      ))}
    </ol>
  </Slide>
);

// ─── Slide 05 — Your next 28 days ─────────────────────────────────────

const ActionPlan: React.FC<{ weeks: WeekBlock[]; closingLine?: string }> = ({ weeks, closingLine }) => (
  <Slide number={5} kicker="Your next 28 days" title="A 4-week plan, mapped.">
    <ol className="divide-y divide-neutral-100">
      {weeks.map((w, i) => (
        <li key={`${w.label}-${i}`} className="py-6 sm:py-7 grid grid-cols-[auto,1fr] gap-x-5 sm:gap-x-7">
          <div className="pt-0.5 min-w-[80px]">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-gold-dark font-semibold">
              {w.label}
            </p>
          </div>
          <div className="min-w-0">
            {w.focus && (
              <h3 className="font-heading text-neutral-900 font-bold text-[17px] sm:text-[18px] tracking-[-0.01em] leading-snug">
                {w.focus}
              </h3>
            )}
            {w.tasks && w.tasks.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {w.tasks.map((t, j) => (
                  <li key={j} className="text-neutral-700 text-[14.5px] leading-[1.7] flex gap-3">
                    <span className="text-gold-dark/50 select-none mt-2 flex-none">
                      <span className="block h-1 w-1 rounded-full bg-gold-dark/60" />
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
    {closingLine && (
      <p className="mt-12 text-center font-heading italic text-neutral-500 text-[14.5px] tracking-tight">
        {closingLine}
      </p>
    )}
  </Slide>
);

// ─── v7 Phase 3 (#13 part 2) reshape components ───────────────────────
// These replace Shortlist / EssayAngles / ActionPlan when the brief
// generator emits the new payload shapes. The old components remain
// in place as the fallback for cached schema-2 briefs.

/* ─── WrappedCard ─────────────────────────────────────────────────
   Q1=A polish (2026-05-23): Wrapped-style first impression for the
   substantive brief cards. The big quote-shaped headline + minimal
   subhead sit on a tinted archetype-color background; the editorial
   body is revealed via tap-to-expand below. Print path always shows
   the expanded body (so PDF export still has the full prose).

   Each v7 card component (Card 01-06) renders through this shell.
   The kicker is the small all-caps label on top; headline is the
   pull-quote-sized typography that does the actual visual work;
   subhead is the smaller italic line below; children is whatever
   the card's editorial body would be in non-Wrapped mode.

   The "Read more" / "Show less" toggle is a button at the bottom
   of the closed card. Clicking it animates the body open or shut.
   Closed by default — tap to reveal substance. */
interface WrappedCardProps {
  kicker?: string;
  headline?: string;
  subhead?: string;
  /** Hex from archetype-library.ts. Defaults to a neutral navy
   *  if absent (legacy schema-2 cached briefs with no archetype). */
  color?: string;
  /** The editorial body — revealed when expanded. Always shown
   *  in print so PDFs include the full prose. */
  children?: React.ReactNode;
  /** Override the expand-button labels if the card wants
   *  surface-specific copy (e.g., "Read the reasoning"). Defaults
   *  to "Read more" / "Show less". */
  expandLabel?: string;
  collapseLabel?: string;
}

const WrappedCard: React.FC<WrappedCardProps> = ({
  kicker,
  headline,
  subhead,
  color = "#1A3B66",
  children,
  expandLabel = "Read more",
  collapseLabel = "Show less",
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!children;
  // Color tinting: convert hex to rgba with low alpha so the card
  // reads as Wrapped-saturated but the kicker / read-more button
  // text stay legible. Use the same hex for the top border (full
  // saturation) as the visual anchor.
  const rgb = hexToRgb(color);
  const tintBg = rgb ? `linear-gradient(180deg, rgba(${rgb}, 0.14) 0%, rgba(${rgb}, 0.06) 60%, rgba(${rgb}, 0.03) 100%)` : "white";
  return (
    <article
      className="bg-white border border-neutral-200/80 rounded-lg overflow-hidden mb-10 sm:mb-14 break-inside-avoid print:mb-0 print:rounded-none print:border-x-0"
      style={{ background: tintBg, borderTop: `4px solid ${color}` }}
    >
      <div className="px-8 sm:px-14 pt-14 sm:pt-20 pb-10 sm:pb-12">
        {kicker && (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] font-semibold mb-6" style={{ color }}>
            {kicker}
          </p>
        )}
        {headline && (
          <h2
            className="font-heading font-bold tracking-[-0.025em] leading-[1.05] text-[clamp(2rem,5vw,3.5rem)] max-w-[20ch]"
            style={{ color: "hsl(222 30% 12%)" }}
          >
            {headline}
          </h2>
        )}
        {subhead && (
          <p className="mt-6 sm:mt-8 font-heading italic text-neutral-700 text-[clamp(1.125rem,2vw,1.5rem)] leading-snug tracking-tight max-w-[40ch]">
            {subhead}
          </p>
        )}
        {hasBody && (
          <>
            {/* Body: collapsed in interactive mode, always-open in
                print. The print: utility forces the body block to
                display regardless of `expanded` state, since PDF
                readers can't tap to expand. */}
            <div
              className={`overflow-hidden transition-all duration-300 print:!max-h-none print:!opacity-100 print:!mt-10 ${
                expanded ? "max-h-[5000px] opacity-100 mt-10 sm:mt-12" : "max-h-0 opacity-0 mt-0"
              }`}
              aria-hidden={!expanded}
            >
              <div className="border-t border-neutral-200/70 pt-8">
                {children}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-8 inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.18em] hover:opacity-80 transition-opacity print:hidden"
              style={{ color }}
            >
              {expanded ? collapseLabel : expandLabel}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </>
        )}
      </div>
    </article>
  );
};

/** Convert a #RRGGBB hex to "R, G, B" suitable for embedding in
 *  rgba(). Returns null if the input doesn't parse — caller
 *  should fall back to a literal color. */
function hexToRgb(hex: string): string | null {
  if (!hex || typeof hex !== "string") return null;
  const m = hex.replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

const WhereYouBelongBuckets: React.FC<{ buckets: CountryBucket[]; color?: string }> = ({ buckets, color }) => {
  const countryList = buckets.slice(0, 3).map((b) => b.country).join(" · ");
  return (
    <WrappedCard
      kicker="02 · Where you belong"
      headline={`Three places that fit how you actually move.`}
      subhead={countryList ? `${countryList} — pulled from your countries with your file in mind.` : undefined}
      color={color}
      expandLabel="See the schools"
      collapseLabel="Hide the schools"
    >
      <div className="divide-y divide-neutral-100">
        {buckets.map((b, i) => (
          <section key={`${b.country}-${i}`} className="py-7 sm:py-8 first:pt-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h3 className="font-heading text-neutral-900 font-bold text-[18px] sm:text-[19px] tracking-[-0.01em]">
                {b.country}
              </h3>
              {b.cities && (
                <span className="text-neutral-400 text-[12.5px]">{b.cities}</span>
              )}
            </div>
            <div className="mt-3 space-y-3.5">
              {b.schools.map((s, j) => (
                <div key={`${s.name}-${j}`} className="grid grid-cols-[auto,1fr] gap-x-4">
                  <span className="select-none pt-2 flex-none">
                    <span className="block h-1 w-1 rounded-full" style={{ background: color ?? "hsl(38 58% 35%)" }} />
                  </span>
                  <div>
                    <p className="font-heading text-neutral-900 font-semibold text-[15.5px] sm:text-[16px] tracking-[-0.005em]">
                      {s.name}
                    </p>
                    {s.lore && (
                      <p className="text-neutral-700 text-[14px] leading-[1.7] mt-1 max-w-[58ch]">
                        {s.lore}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </WrappedCard>
  );
};

const EssaySeedSlide: React.FC<{ seed: EssaySeed; color?: string }> = ({ seed, color }) => (
  <WrappedCard
    kicker="03 · The essay only you can write"
    headline={seed.title ?? "The essay you should write doesn't exist yet."}
    subhead={seed.closer ?? "Find the moment that already lives somewhere in your head."}
    color={color}
    expandLabel="Read the seed"
    collapseLabel="Hide the seed"
  >
    <div className="max-w-[58ch]">
      <p className="text-neutral-800 text-[15.5px] leading-[1.75]">
        {seed.body}
      </p>
    </div>
  </WrappedCard>
);

const MondayMoveSlide: React.FC<{ move: MondayMove; color?: string }> = ({ move, color }) => (
  <WrappedCard
    kicker="06 · Your Monday move"
    headline={move.headline ?? "One move this week."}
    subhead={move.closer ?? "It opens the rest."}
    color={color}
    expandLabel="See the move"
    collapseLabel="Hide the move"
  >
    <div className="max-w-[58ch]">
      <p className="text-neutral-800 text-[15.5px] leading-[1.75]">
        {move.body}
      </p>
    </div>
  </WrappedCard>
);

// ─── Next-steps card (non-deck, post-brief CTAs) ──────────────────────

const NextStepsCard: React.FC = () => (
  <section className="mt-12 print:hidden">
    <p className="font-mono text-[10.5px] text-neutral-500 uppercase tracking-[0.22em] font-medium mb-4 text-center">
      Next steps
    </p>
    <div className="grid sm:grid-cols-2 gap-3">
      <Link
        to="/discover"
        className="group block bg-white border border-neutral-200 hover:border-gold-dark/40 rounded-lg p-6 transition-colors"
      >
        <Compass className="h-4 w-4 text-gold-dark mb-3" />
        <h3 className="font-heading text-neutral-900 font-bold text-[17px] tracking-tight">
          Open Discover
        </h3>
        <p className="text-neutral-500 text-[13px] leading-relaxed mt-1.5 max-w-[40ch]">
          Live scholarship matches, filtered to your profile.
        </p>
        <span className="inline-flex items-center gap-1 text-gold-dark text-[12px] font-semibold mt-4 group-hover:gap-2 transition-all">
          Browse <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
      <Link
        to="/academy"
        className="group block bg-white border border-neutral-200 hover:border-neutral-400 rounded-lg p-6 transition-colors"
      >
        <GraduationCap className="h-4 w-4 text-neutral-700 mb-3" />
        <h3 className="font-heading text-neutral-900 font-bold text-[17px] tracking-tight">
          Join Academy
        </h3>
        <p className="text-neutral-500 text-[13px] leading-relaxed mt-1.5 max-w-[40ch]">
          Live workshops and office hours.
        </p>
        <span className="inline-flex items-center gap-1 text-neutral-700 text-[12px] font-semibold mt-4 group-hover:gap-2 transition-all">
          See what's included <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
    </div>
  </section>
);

// ─── Stream / Static orchestrator ─────────────────────────────────────

export const BriefDeck: React.FC<Props> = (props) => {
  const [sections, setSections] = useState<BriefSections>(() =>
    props.mode === "static" ? props.sections : {}
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (props.mode !== "stream") return;
    const ctl = new AbortController();
    abortRef.current = ctl;

    (async () => {
      try {
        const resp = await fetch(props.streamUrl, {
          method: "POST",
          signal: ctl.signal,
          headers: {
            "Content-Type": "application/json",
            ...(props.authHeader ? { Authorization: props.authHeader, apikey: props.authHeader.replace(/^Bearer\s+/i, "") } : {}),
          },
          body: JSON.stringify(props.requestBody),
        });
        if (!resp.ok || !resp.body) {
          const text = await resp.text().catch(() => "");
          throw new Error(`Brief stream HTTP ${resp.status}: ${text.slice(0, 200)}`);
        }
        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        const accumulated: BriefSections = {};

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) buf += dec.decode(value, { stream: true });
          while (true) {
            const sep = buf.indexOf("\n\n");
            if (sep === -1) break;
            const event = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            if (!event.startsWith("data: ")) continue;
            const payload = event.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as { section?: SectionId; payload?: unknown };
              if (parsed.section && parsed.payload !== undefined) {
                accumulated[parsed.section] = parsed.payload as never;
                setSections({ ...accumulated });
              }
            } catch { /* defensive */ }
          }
        }
        props.onComplete?.(accumulated);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const msg = (e as Error).message || "Unknown stream error";
        setStreamError(msg);
        props.onError?.(e as Error);
      }
    })();

    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const archetype = sections.archetype;
  const stand = sections.whereYouStand;
  const gaps = sections.whatsBlockingYou?.entries ?? [];
  // v6 shapes — fallback path for old cached briefs (schema 2)
  const schoolEntries = sections.whereYouCanLand?.entries ?? [];
  const essayEntries = sections.whatToWrite?.entries ?? [];
  const weeks = sections.whatToDoThisMonth?.weeks ?? [];
  // v7 shapes — pure-v7 generations after the brief-v7-payload-reshape PR
  const buckets = sections.whereYouCanLand?.buckets ?? [];
  const essaySeed = sections.whatToWrite?.essaySeed;
  const mondayMove = sections.whatToDoThisMonth?.mondayMove;

  const streaming = props.mode === "stream" && !streamError;
  const anyLoaded = Object.keys(sections).length > 0;

  /* v7 Phase 3 (#13): card-stack swipe nav.
     Each substantive section becomes a self-contained card; the user
     swipes horizontally (mobile) or arrows through them (desktop).
     Print path bypasses the swipe container via `print:` utilities —
     PDFs still render vertically as one document. */
  const archetypeNode =
    archetype?.id && archetype?.name ? (
      <section
        aria-label="Your archetype"
        className="rounded-2xl px-8 py-10 text-center shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${archetype.color}1A, ${archetype.color}33)`,
          borderTop: `4px solid ${archetype.color}`,
        }}
      >
        <div className="text-[10px] uppercase tracking-[0.28em] text-foreground/60 font-medium">
          You are
        </div>
        <h2
          className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-serif font-bold leading-tight tracking-tight"
          style={{ color: archetype.color }}
        >
          {archetype.name}
        </h2>
        {archetype.tagline && (
          <p className="mt-4 text-base sm:text-lg text-foreground/80 italic font-serif max-w-md mx-auto leading-snug">
            {archetype.tagline}
          </p>
        )}
      </section>
    ) : null;

  type CardEntry = {
    id: string;
    kicker: string;
    node: React.ReactNode;
    /** v7 Phase 3 (#14): Wrapped-Bold variant rendered off-screen for
     *  the share-to-Story PNG capture. Omit for cards without a
     *  sensible share shape (Cover, NextStepsCard) — the share button
     *  on those falls back to the URL-only path. */
    shareAsset?: React.ReactNode;
  };
  const archetypeColorForShare = archetype?.color;
  const cards: CardEntry[] = [
    { id: "cover", kicker: "Brief", node: <Cover studentName={props.studentName} gradeLabel={props.gradeLabel} generatedAt={props.generatedAt} /> },
  ];
  if (archetypeNode && archetype) {
    cards.push({
      id: "archetype",
      kicker: "Your archetype",
      node: archetypeNode,
      shareAsset: <ArchetypeShareCard payload={archetype as ArchetypePayload} />,
    });
  }
  if (stand?.body || stand?.lead || gaps.length > 0) {
    cards.push({
      id: "stand",
      kicker: "Where you stand",
      node: <StartingLine thesis={stand?.headline ?? stand?.lead} body={stand?.body ?? stand?.lead} gaps={gaps} color={archetypeColorForShare} />,
      shareAsset: stand ? <WhereYouStandShareCard color={archetypeColorForShare} payload={stand} /> : undefined,
    });
  } else if (streaming) {
    cards.push({ id: "stand-skeleton", kicker: "Where you stand", node: <SlideSkeleton number={2} kicker="The starting line" title="Where you stand today." /> });
  }
  // v7 buckets win when present; fall back to v6 reach/target/safety
  // entries for old cached briefs.
  if (buckets.length > 0) {
    cards.push({
      id: "buckets",
      kicker: "Where you belong",
      node: <WhereYouBelongBuckets buckets={buckets} color={archetypeColorForShare} />,
      shareAsset: <WhereYouBelongShareCard color={archetypeColorForShare} buckets={buckets} />,
    });
  } else if (schoolEntries.length > 0) {
    cards.push({ id: "shortlist", kicker: "Where you can land", node: <Shortlist entries={schoolEntries} /> });
  } else if (streaming) {
    cards.push({ id: "shortlist-skeleton", kicker: "Where you belong", node: <SlideSkeleton number={3} kicker="Where you belong" title="Places that fit how you actually move." /> });
  }
  // v7 essaySeed wins when present; fall back to v6 three-entries
  // shape for cached briefs.
  if (essaySeed?.body) {
    cards.push({
      id: "essay-seed",
      kicker: "What to write",
      node: <EssaySeedSlide seed={essaySeed} color={archetypeColorForShare} />,
      shareAsset: <EssaySeedShareCard color={archetypeColorForShare} seed={essaySeed} />,
    });
  } else if (essayEntries.length > 0) {
    cards.push({ id: "essays", kicker: "What to write", node: <EssayAngles entries={essayEntries} /> });
  } else if (streaming) {
    cards.push({ id: "essays-skeleton", kicker: "What to write", node: <SlideSkeleton number={4} kicker="What to write" title="The essay only you can write." /> });
  }
  // v7 mondayMove wins when present; fall back to v6 4-week plan.
  if (mondayMove?.body) {
    cards.push({
      id: "monday-move",
      kicker: "Your Monday move",
      node: <MondayMoveSlide move={mondayMove} color={archetypeColorForShare} />,
      shareAsset: <MondayMoveShareCard color={archetypeColorForShare} move={mondayMove} />,
    });
  } else if (weeks.length > 0) {
    cards.push({ id: "plan", kicker: "Your next 28 days", node: <ActionPlan weeks={weeks} closingLine={sections.whatToDoThisMonth?.closingLine} /> });
  } else if (streaming) {
    cards.push({ id: "plan-skeleton", kicker: "Your Monday move", node: <SlideSkeleton number={5} kicker="Your Monday move" title="One move this week." /> });
  }
  if (anyLoaded && !streamError) {
    cards.push({ id: "next", kicker: "What next", node: <NextStepsCard /> });
  }

  return (
    <div id="printable-report-inner" className="relative">
      {streamError && (
        <div className="my-6 mx-auto max-w-md text-center text-rose-500 text-sm">
          Brief generation failed: {streamError}. Try regenerating.
        </div>
      )}
      <CardStack cards={cards} archetypeColor={archetype?.color} />
    </div>
  );
};

/* ─── CardStack ───────────────────────────────────────────────────────
   v7 Phase 3 (#13). Horizontal scroll-snap container with progress
   dots + keyboard nav + a Share button per card. Each card fills the
   viewport (or near-viewport on mobile) and scrolls internally when
   its content overflows. Print mode falls back to vertical block
   flow so the PDF export still renders as one document. */
interface CardStackProps {
  cards: Array<{ id: string; kicker: string; node: React.ReactNode; shareAsset?: React.ReactNode }>;
  archetypeColor?: string;
}

const CardStack: React.FC<CardStackProps> = ({ cards, archetypeColor }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  /* v7 Phase 3 (#14): refs to each card's hidden Wrapped-Bold variant.
     Populated as the hidden container renders below; consumed by the
     share button to feed shareCardAsImage(). Cards without a
     shareAsset (Cover, NextStepsCard) get no ref — their share
     button falls back to the URL-only path. */
  const shareAssetRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [isSharing, setIsSharing] = useState<string | null>(null);

  // Scroll handler tracks which card is centered in the viewport so
  // the progress dots stay in sync. Uses the container's scrollLeft
  // and the first card's offsetWidth as the per-card stride.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cardWidth = el.firstElementChild instanceof HTMLElement ? el.firstElementChild.offsetWidth : 1;
        const idx = Math.round(el.scrollLeft / Math.max(cardWidth, 1));
        setActiveIdx(Math.min(Math.max(idx, 0), cards.length - 1));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [cards.length]);

  const scrollToCard = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.children[i] as HTMLElement | undefined;
    if (target) target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  // Arrow-key nav on desktop. Capture-phase listener so the buttons
  // inside each card don't swallow the keystroke when focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when focus is inside an editable field — users typing
      // shouldn't get their cursor stolen.
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToCard(Math.min(activeIdx + 1, cards.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToCard(Math.max(activeIdx - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, cards.length]);

  const handleShare = async (card: { id: string; kicker: string; shareAsset?: React.ReactNode }) => {
    // v7 Phase 3 (#14): if this card has a Wrapped-Bold shareAsset
    // mounted off-screen, capture it to PNG and share via the
    // platform's native share sheet (which on iOS/Android includes
    // Instagram Stories as a destination). Otherwise fall back to
    // the URL-only share (Cover / NextStepsCard cards).
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `My TopUni AI brief said: ${card.kicker}. topuni.kz/ai`;

    const shareEl = shareAssetRefs.current.get(card.id);
    if (card.shareAsset && shareEl) {
      setIsSharing(card.id);
      try {
        const ok = await shareCardAsImage(shareEl, {
          title: `TopUni AI · ${card.kicker}`,
          text,
          url,
          filename: `topuni-${card.id}.png`,
        });
        if (ok) {
          setIsSharing(null);
          return;
        }
      } catch (err) {
        console.warn("[card-stack] share-with-asset failed, falling back:", (err as Error).message);
      }
      setIsSharing(null);
    }

    // Fallback A: native share sheet without image
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav !== "undefined" && nav.share) {
      try {
        await nav.share({ title: `TopUni AI · ${card.kicker}`, text, url });
        return;
      } catch {
        // user-cancelled — fall through to clipboard
      }
    }

    // Fallback B: copy URL to clipboard so the user can paste it.
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="relative">
      {/* Progress dots — sticky at top, hidden in print. */}
      <div className="sticky top-0 z-20 print:hidden bg-background/80 backdrop-blur-sm py-3">
        <div className="flex items-center justify-center gap-1.5">
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to ${c.kicker}`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === activeIdx ? 24 : 6,
                background: i === activeIdx ? (archetypeColor ?? "currentColor") : "rgba(0,0,0,0.2)",
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 text-center text-[10px] uppercase tracking-[0.22em] text-foreground/60 font-medium">
          {String(activeIdx + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")} · {cards[activeIdx]?.kicker}
        </div>
      </div>

      {/* The swipe container. Horizontal scroll-snap on interactive;
          vertical block flow in print. */}
      <div
        ref={scrollRef}
        className="
          flex overflow-x-auto snap-x snap-mandatory
          [&::-webkit-scrollbar]:hidden
          [-ms-overflow-style:none] [scrollbar-width:none]
          print:block print:overflow-visible
        "
      >
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="
              flex-shrink-0 w-full snap-start
              min-h-[calc(100vh-5rem)]
              overflow-y-auto
              px-4 sm:px-8 py-6
              print:flex-shrink print:w-auto print:min-h-0 print:overflow-visible print:break-inside-avoid print:px-0 print:py-0
            "
          >
            <div className="max-w-3xl mx-auto">{card.node}</div>

            {/* Card footer — share + next button. Hidden in print. */}
            <div className="print:hidden mt-6 max-w-3xl mx-auto flex items-center justify-between gap-3">
              <button
                onClick={() => handleShare(card)}
                disabled={isSharing === card.id}
                className="text-xs font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                {isSharing === card.id ? "Preparing…" : card.shareAsset ? "Share to Story" : "Share"}
              </button>
              {i < cards.length - 1 ? (
                <button
                  onClick={() => scrollToCard(i + 1)}
                  className="text-xs font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* v7 Phase 3 (#14): hidden off-screen render of each card's
          Wrapped-Bold share asset at full 1080×1920. The share
          button captures the matching ref via html-to-image into a
          PNG and hands it to the native share sheet. Hidden via
          fixed-position-left-far-offscreen (NOT display:none —
          html-to-image needs the element to compute styles and
          paint dimensions, which display:none breaks). */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {cards
          .filter((c) => c.shareAsset)
          .map((card) => (
            <div
              key={`share-${card.id}`}
              ref={(el) => {
                if (el) shareAssetRefs.current.set(card.id, el);
                else shareAssetRefs.current.delete(card.id);
              }}
              style={{ width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT }}
            >
              {card.shareAsset}
            </div>
          ))}
      </div>
    </div>
  );
};

// Back-compat alias — TopUniDashboard imports BriefMagazine.
export const BriefMagazine = BriefDeck;
export const BriefMinimal = BriefDeck;

export const VISIBLE_SECTIONS: SectionId[] = SECTION_ORDER;
