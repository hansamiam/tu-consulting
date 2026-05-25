/**
 * BriefStory — Wrapped-style story-deck strategy report.
 *
 * Samuel's instruction trail this thread:
 *   1. Take INSPIRATION from the designer's 9:16 Wrapped mockup —
 *      vertical card frame, swipe + autoplay + progress segments.
 *      Don't copy the mockup's content language or chrome.
 *   2. Drop variant picker (internal exploration, never user-facing).
 *   3. Drop side panels, "TopUni AI · v7" mono wordmark, "TU" seal,
 *      "© 2026" footer, "Duration · Cost $0" meta footers — every
 *      hint of vibecoded chrome.
 *   4. Use OUR 7-surface spec — archetype hook + WHO YOU ARE /
 *      HIDDEN ADVANTAGE / WHERE YOU BELONG / ESSAY ONLY YOU CAN WRITE /
 *      WHAT YOU'RE AVOIDING / MONDAY MOVE.
 *   5. Avoid AI-slop phrases like "refreshed daily", "Your work could
 *      lead to impact in X", "We'll match across every geography" —
 *      lock-in the punchy direct register.
 *
 * ─── Stream C overhaul (2026-05-25) — per-frame visual anchor plan ───
 *
 * Audit: every frame ends in a content stack with `flex-1` taking the
 * rest of the 9:16 card height — but the content itself stops well
 * short of the bottom, leaving the bottom 1/2 to 2/3 visibly empty.
 * Plan per frame:
 *
 *   • archetype (ArchetypeHook / "Frame 02"):
 *       Centered gradient circle (120px) with archetype initials —
 *       static placeholder, Stream D replaces with <ArchetypeRadial>.
 *   • who (Body / "Frame 03 — WHO YOU ARE"):
 *       Body copy fills naturally with new BODY size; no anchor.
 *   • hidden (Pullquote / "Frame 03 — WHERE YOU STAND/HIDDEN ADV."):
 *       Pullquote pinned to bottom, sized via PULLQUOTE constant
 *       (larger than current). No additional anchor.
 *   • belong (WhereYouBelong / "Frame 04"):
 *       Country rows get larger flag tiles for more visual weight.
 *       Stream E will append an adjacency strip below.
 *   • essay (EssayCard / "Frame 05", navy):
 *       Body fills naturally on navy background — no anchor.
 *   • avoiding (WhatYoureAvoiding / "Frame 06"):
 *       3 priority items rendered as horizontal bars with
 *       priority-color left borders (red=now, amber=next,
 *       zinc=later). Bars expand vertically to fill space.
 *   • monday (MondayMoveCard / "Frame 07"):
 *       Calendar mini-strip (Mon-Sun pills, target day in gold).
 *       Static placeholder — Stream D does NOT touch this one.
 *
 * Type scale (KICKER/HEADING/BODY/PULLQUOTE/CLOSER) is codified
 * below and replaces hardcoded font-size classNames in every frame.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Compass, Pause, Play } from "lucide-react";
import type { BriefStoryProps } from "./types";
import { buildStoryData } from "./utils";
import { useDeck } from "./useDeck";
import { tokenToIso } from "@/lib/adjacent-countries";
import { useAdjacentSuggestions } from "@/lib/use-adjacent-suggestions";
import { ArchetypeRadial, ARCHETYPE_AXES } from "@/components/brief/ArchetypeRadial";

// ─── Type scale ────────────────────────────────────────────────────────
// Type scale for Story cards. Sized for the 400px-wide 9:16 frame.
// Kicker stays tiny + uppercase (current eyebrow).
// Heading: 28px mobile, 32px desktop — bigger than current.
// Body: 14px with leading-snug — bigger than current 12px.
// Pullquote: 18px italic.
// Closer: 13px semibold (CTA-style sign-off).
const KICKER = "text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold";
const HEADING = "font-heading text-[28px] md:text-[32px] font-bold leading-tight tracking-tight";
const BODY = "text-[14px] leading-snug text-foreground/90";
const PULLQUOTE = "text-[18px] italic font-medium text-foreground/85 leading-snug";
const CLOSER = "text-[13px] font-semibold text-foreground/80";

// ─── Visual anchor slot ────────────────────────────────────────────────
// Per-frame visual anchor. Frames opt in by passing children to this slot.
// Frames that pass nothing render with empty space (Stream D will fill these
// with real charts; Stream C ships with static placeholders below).
const VisualAnchor = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) =>
  children ? (
    <div className={`mt-auto pt-4 ${className}`}>{children}</div>
  ) : null;

interface SurfaceSpec {
  id: string;
  kicker: string;
  render: () => React.ReactNode;
  /** When true the frame inverts to navy (essay slide). */
  navy?: boolean;
}

export const BriefStory = ({
  sections,
  student,
  funnel,
  topMatch,
  loading = false,
  error = null,
}: BriefStoryProps) => {
  const data = buildStoryData(sections, student, funnel, topMatch);

  const surfaces: SurfaceSpec[] = [];

  if (data.archetype?.name) {
    surfaces.push({
      id: "archetype",
      kicker: "You are",
      render: () => <ArchetypeHook archetype={data.archetype!} color={sections.archetype?.color} archetypeId={sections.archetype?.id} />,
    });
  }
  if (data.stand?.headline || data.stand?.body) {
    surfaces.push({
      id: "who",
      kicker: "Who you are",
      render: () => <Body headline={data.stand?.headline} body={data.stand?.body} />,
    });
  }
  if (data.stand?.pullquote) {
    surfaces.push({
      id: "hidden",
      kicker: "Hidden advantage",
      render: () => <Pullquote>{data.stand!.pullquote!}</Pullquote>,
    });
  }
  if (data.countries && data.countries.length > 0) {
    surfaces.push({
      id: "belong",
      kicker: "Where you belong",
      render: () => <WhereYouBelong topMatch={data.topMatch} countries={data.countries!} />,
    });
  }
  if (data.essay && (data.essay.body || data.essay.closer)) {
    surfaces.push({
      id: "essay",
      kicker: "Essay only you can write",
      navy: true,
      render: () => <EssayCard pre={data.essay?.pre} closer={data.essay?.closer} body={data.essay?.body} />,
    });
  }
  if (data.block && data.block.items.length > 0) {
    surfaces.push({
      id: "avoiding",
      kicker: "What you're avoiding",
      render: () => <WhatYoureAvoiding block={data.block!} />,
    });
  }
  if (data.mondayMove && (data.mondayMove.headline || data.mondayMove.body)) {
    surfaces.push({
      id: "monday",
      kicker: "Monday move",
      render: () => <MondayMoveCard move={data.mondayMove!} />,
    });
  }

  const total = surfaces.length;
  const deck = useDeck({ total: Math.max(total, 1) });
  const inverted = surfaces[deck.active]?.navy === true;

  // 2026-05-25: a mid-stream error used to wipe ALL slides off-frame
  // (showError gated everything). Now: if cards loaded before the error,
  // keep them — only show the standalone ErrorSlide when nothing arrived.
  // Partial-error case surfaces a small retry strip below the frame.
  const showSkeleton = loading && total === 0;
  const showErrorOnly = !!error && total === 0;
  const showPartialError = !!error && total > 0;

  return (
    <div className="w-full flex flex-col items-center gap-5 py-2 sm:py-4">
      <div
        className={[
          "relative w-full max-w-[400px] aspect-[9/16] rounded-[28px] overflow-hidden select-none transition-colors duration-300",
          inverted ? "bg-[hsl(var(--navy-deep))] text-[hsl(43_44%_96%)]" : "bg-surface text-foreground",
        ].join(" ")}
        style={{
          boxShadow:
            "0 24px 56px -16px hsl(210 74% 13% / 0.18), 0 8px 16px -4px hsl(210 74% 13% / 0.06), 0 0 0 1px hsl(41 22% 81% / 0.6) inset",
        }}
      >
        {total > 1 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {surfaces.map((_, i) => {
              const pct = i < deck.active ? 100 : i === deck.active ? deck.segmentFill : 0;
              return (
                <div
                  key={i}
                  className={[
                    "flex-1 h-[2.5px] rounded-[2px] overflow-hidden relative",
                    inverted ? "bg-[hsl(43_44%_96%/0.22)]" : "bg-[hsl(210_64%_16%/0.16)]",
                  ].join(" ")}
                >
                  <div
                    className="absolute inset-0 bg-gold transition-[width] duration-150 ease-linear"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="absolute inset-0">
          {showSkeleton && <Skeleton />}
          {showErrorOnly && <ErrorSlide error={error!} />}
          {!showSkeleton && !showErrorOnly && surfaces.map((surface, i) => (
            <div
              key={surface.id}
              className={[
                "absolute inset-0 px-7 pt-12 pb-[68px] flex flex-col",
                "transition-all duration-[350ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
                i === deck.active
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-2 pointer-events-none",
              ].join(" ")}
            >
              <p
                className={[
                  // KICKER constant inlined here because the navy variant
                  // swaps the muted-foreground color for gold-light.
                  "m-0 mb-4 text-[11px] uppercase tracking-[0.18em] font-semibold",
                  surface.navy ? "text-gold-light" : "text-muted-foreground",
                ].join(" ")}
              >
                {surface.kicker}
              </p>
              <div className="flex-1 min-h-0 flex flex-col">{surface.render()}</div>
            </div>
          ))}
        </div>

        {total > 1 && !showErrorOnly && (
          <div className="absolute inset-0 grid grid-cols-[1fr_2fr] z-20">
            <button type="button" aria-label="Previous" onClick={deck.prev} className="cursor-pointer focus:outline-none" />
            <button type="button" aria-label="Next" onClick={deck.next} className="cursor-pointer focus:outline-none" />
          </div>
        )}

        {total > 1 && (
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-30 pointer-events-none">
            <button
              type="button"
              onClick={deck.toggle}
              aria-label={deck.playing ? "Pause" : "Play"}
              className={[
                "pointer-events-auto w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors backdrop-blur",
                inverted
                  ? "bg-[hsl(43_44%_96%/0.12)] text-[hsl(43_44%_96%)] hover:bg-[hsl(43_44%_96%/0.2)]"
                  : "bg-[hsl(210_64%_16%/0.08)] text-foreground hover:bg-[hsl(210_64%_16%/0.16)]",
              ].join(" ")}
            >
              {deck.playing ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            </button>
            <span
              className={[
                "pointer-events-auto text-[11px] font-medium tabular-nums px-2.5 py-1 rounded-full backdrop-blur",
                inverted
                  ? "text-[hsl(43_44%_96%/0.7)] bg-[hsl(43_44%_96%/0.08)]"
                  : "text-foreground/60 bg-[hsl(210_64%_16%/0.06)]",
              ].join(" ")}
            >
              {String(deck.active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {total > 1 && (
        <div className="flex items-center gap-2 text-foreground/45">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={deck.prev}
            disabled={deck.active === 0}
            className="w-9 h-9 rounded-full border border-border/60 hover:border-foreground/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={deck.next}
            disabled={deck.active === total - 1}
            className="w-9 h-9 rounded-full border border-border/60 hover:border-foreground/40 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Partial-stream-error strip — visible whenever some cards
          rendered but the stream errored before completing. Sits below
          the frame so the user keeps what loaded + can retry. */}
      {showPartialError && (
        <div
          role="alert"
          className="w-full max-w-[400px] rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center justify-between gap-3 -mt-2"
        >
          <p className="text-[13px] text-rose-900 m-0 leading-snug">
            Generation stopped partway. Some cards may be missing.
          </p>
          <Link
            to="/topuni-ai"
            className="text-[13px] font-semibold text-rose-700 hover:text-rose-900 underline-offset-2 hover:underline whitespace-nowrap"
          >
            Try again
          </Link>
        </div>
      )}

      {total > 1 && deck.active === total - 1 && !error && (
        <Link
          to="/discover"
          className="group block w-full max-w-[400px] mt-3 rounded-2xl bg-[hsl(var(--navy-deep))] hover:bg-[hsl(var(--navy))] text-[hsl(43_44%_96%)] px-6 py-5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
              <Compass className="w-[18px] h-[18px] text-gold-light" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold text-[16px] tracking-tight leading-tight m-0 mb-0.5">
                Open Discover
              </p>
              <p className="text-[13px] text-[hsl(43_44%_96%)]/75 m-0 leading-snug">
                Every scholarship that fits your profile.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-gold-light group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}
    </div>
  );
};

// ─── Surface contents ─────────────────────────────────────────────────

const ArchetypeHook = ({
  archetype,
  color,
  archetypeId,
}: {
  archetype: { name: string; tagline?: string; confidence?: number };
  color?: string;
  archetypeId?: string;
}) => {
  const cleanName = archetype.name.replace(/\.$/, "").trim();
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Archetype name keeps its display size — this is the branded
          hook, not a body heading, so HEADING (28-32px) would underplay
          it. PULLQUOTE governs the tagline below. */}
      <h1
        className="font-heading font-bold text-[44px] sm:text-[52px] leading-[1.0] tracking-[-0.04em] m-0 mb-3 text-balance"
        style={color ? { color } : undefined}
      >
        {cleanName}.
      </h1>
      {archetype.tagline && (
        <p className={`font-heading ${PULLQUOTE} text-foreground/75 tracking-tight m-0 max-w-[24ch] text-balance`}>
          {archetype.tagline}
        </p>
      )}
      {/* Stream D: real ArchetypeRadial replaces the gradient-initials placeholder. */}
      <VisualAnchor className="flex justify-center">
        <ArchetypeRadial
          axes={ARCHETYPE_AXES[archetypeId ?? "default"] ?? ARCHETYPE_AXES.default}
          archetypeColor={color ?? "#1A3B66"}
          size={180}
        />
      </VisualAnchor>
    </div>
  );
};

const Body = ({ headline, body }: { headline?: string; body?: string }) => (
  <div className="flex-1 min-h-0 flex flex-col">
    {headline && (
      <h2 className={`${HEADING} text-foreground m-0 mb-4 text-balance`}>
        {headline}
      </h2>
    )}
    {body && (
      <p className={`font-sans ${BODY} m-0 overflow-y-auto`}>
        {body}
      </p>
    )}
  </div>
);

const Pullquote = ({ children }: { children: string }) => (
  // Per Stream C C.1: pullquote moves to the bottom of the card so the
  // empty bottom-two-thirds gap disappears. PULLQUOTE constant sizes it
  // larger than the prior text-[22px] body-block treatment.
  <div className="flex-1 min-h-0 flex flex-col justify-end">
    <blockquote className="m-0 border-l-2 border-gold pl-5 py-1">
      <p className={`font-heading ${PULLQUOTE} text-foreground tracking-[-0.01em] m-0 text-balance`}>
        {children}
      </p>
    </blockquote>
  </div>
);

const WhereYouBelong = ({
  topMatch,
  countries,
}: {
  topMatch?: { name: string; location?: string; funding?: string };
  countries: Array<{ flag: string; name: string; count: number; anchors?: string }>;
}) => {
  const totalSchools = countries.reduce((acc, c) => acc + c.count, 0);

  // Sparse: fewer than 3 countries — show adjacent-tier suggestions.
  const isSparse = countries.length < 3;
  const primaryIso = isSparse && countries[0]
    ? tokenToIso(countries[0].name)
    : null;
  const adjacentSamples = useAdjacentSuggestions(primaryIso);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <h2 className={`${HEADING} text-foreground m-0 mb-4 text-balance`}>
        {totalSchools} school{totalSchools === 1 ? "" : "s"}, {countries.length} {countries.length === 1 ? "country" : "countries"}.
      </h2>
      {topMatch && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gold-dark m-0 mb-1">
            Top match
          </p>
          <p className={`font-heading font-semibold ${CLOSER} text-foreground m-0 leading-tight`}>
            {topMatch.name}
          </p>
          {topMatch.location && (
            <p className={`${BODY} text-muted-foreground m-0 mt-0.5`}>{topMatch.location}</p>
          )}
        </div>
      )}
      {/* Larger flag tiles per Stream C C.1 — country rows carry more
          visual weight; sparse adjacency strip rendered below. */}
      <div className="overflow-y-auto flex-shrink">
        {countries.map((c, i) => (
          <div
            key={`${c.name}-${i}`}
            className="grid grid-cols-[40px_1fr_auto] items-center gap-3 py-3 border-t border-border/60 last:border-b"
          >
            <span className="text-[30px] leading-none">{c.flag}</span>
            <div className="min-w-0">
              <p className={`font-heading font-semibold ${BODY} text-foreground m-0 leading-tight`}>
                {c.name}
              </p>
              {c.anchors && (
                <p className="text-[12px] text-muted-foreground m-0 mt-0.5 truncate">{c.anchors}</p>
              )}
            </div>
            <span className="font-heading font-semibold text-[18px] text-foreground tabular-nums">
              {c.count}
            </span>
          </div>
        ))}
      </div>

      {/* Sparse adjacency strip — horizontal scroll, 3 mini-cards */}
      {isSparse && adjacentSamples.length > 0 && (
        <div className="mt-3 shrink-0">
          <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/45 m-0 mb-2">
            You might also fit
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {adjacentSamples.map((sample) => (
              <Link
                key={sample.iso}
                to={`/discover?country=${encodeURIComponent(sample.sampleSchool ? (STORY_COUNTRY_EN[sample.iso] ?? sample.iso) : sample.iso)}`}
                className="shrink-0 flex flex-col gap-0.5 rounded-lg border border-border/60 bg-foreground/[0.03] hover:border-gold/50 hover:bg-gold/8 px-3 py-2 transition-colors min-w-[100px] max-w-[130px]"
              >
                <span className="font-heading font-semibold text-[12px] text-foreground leading-tight">
                  {sample.name}
                </span>
                {sample.sampleSchool && (
                  <span className="font-heading text-[10.5px] text-foreground/55 leading-snug line-clamp-2">
                    {sample.sampleSchool}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// English country names by ISO — used for Discover link params in the story frame.
const STORY_COUNTRY_EN: Record<string, string> = {
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

const EssayCard = ({
  pre,
  closer,
  body,
}: {
  pre?: string;
  closer?: string;
  body?: string;
}) => (
  <div className="flex-1 min-h-0 flex flex-col">
    {pre && (
      <p className={`font-heading font-medium ${CLOSER} text-[hsl(43_44%_96%)]/60 m-0`}>
        {pre}
      </p>
    )}
    {closer && (
      <h2 className={`${HEADING} italic text-gold-light m-0 mt-2 mb-4 max-w-[14ch] text-balance`}>
        {closer}
      </h2>
    )}
    {body && (
      <p className={`font-sans ${BODY} text-[hsl(43_44%_96%)]/80 m-0 overflow-y-auto`}>
        {body}
      </p>
    )}
  </div>
);

const WhatYoureAvoiding = ({
  block,
}: {
  block: { headline?: string; body?: string; items: Array<{ priority: "high" | "medium"; title: string; action: string }> };
}) => (
  <div className="flex-1 min-h-0 flex flex-col">
    {block.headline && (
      <h2 className={`${HEADING} text-foreground m-0 mb-3 text-balance`}>
        {block.headline}
      </h2>
    )}
    {block.body && (
      <p className={`font-sans ${BODY} text-foreground/70 m-0 mb-3`}>{block.body}</p>
    )}
    {/* Stream C C.3 visual anchor — priority-color left-border bars.
        Type enum is high/medium (no third tier), so:
          high → red (Now), medium → amber (Soon). */}
    <VisualAnchor className="space-y-1.5">
      {block.items.map((it, i) => (
        <div
          key={i}
          className={[
            "border-l-[3px] pl-2.5 py-1.5",
            it.priority === "high" ? "border-red-500" : "border-amber-500",
          ].join(" ")}
        >
          <p className={`font-heading font-semibold ${BODY} text-foreground/90 leading-tight m-0`}>
            {it.title}
          </p>
          {it.action && (
            <p className="text-[12px] text-muted-foreground leading-snug mt-0.5 m-0">
              {it.action}
            </p>
          )}
        </div>
      ))}
    </VisualAnchor>
  </div>
);

const MondayMoveCard = ({
  move,
}: {
  move: { headline?: string; sub?: string; body?: string };
}) => (
  // Per Stream C C.4: Monday Move now uses the shared HEADING constant
  // (was 30-36px, oversized vs body — heading-to-body ratio now matches
  // the other frames).
  <div className="flex-1 min-h-0 flex flex-col">
    {move.headline && (
      <h2 className={`${HEADING} text-foreground m-0 mb-3 text-balance`}>
        {move.headline}
      </h2>
    )}
    {move.sub && (
      <p className={`font-heading font-medium ${BODY} text-muted-foreground m-0 mb-3 max-w-[26ch] text-balance`}>
        {move.sub}
      </p>
    )}
    {move.body && (
      <p className={`font-sans ${BODY} m-0`}>
        {move.body}
      </p>
    )}
    {/* Stream C C.3 visual anchor — Mon-Sun pill strip with Monday
        highlighted in gold (the "Monday move"). */}
    <VisualAnchor className="flex gap-1.5 justify-center">
      {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
        <div
          key={d}
          className={[
            "h-8 w-8 rounded-full text-[10px] font-semibold flex items-center justify-center",
            i === 0 ? "bg-gold text-primary" : "bg-muted/40 text-muted-foreground",
          ].join(" ")}
        >
          {d}
        </div>
      ))}
    </VisualAnchor>
  </div>
);

const Skeleton = () => (
  <div className="absolute inset-0 px-7 pt-12 pb-[68px] flex flex-col">
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-foreground/5 rounded w-1/3" />
      <div className="h-8 bg-foreground/5 rounded w-3/4" />
      <div className="h-3 bg-foreground/5 rounded w-full" />
      <div className="h-3 bg-foreground/5 rounded w-5/6" />
    </div>
  </div>
);

const ErrorSlide = ({ error }: { error: string }) => (
  <div className="absolute inset-0 px-7 pt-12 pb-[68px] flex flex-col items-center justify-center text-center">
    <p className="font-heading text-[18px] font-semibold text-rose-900 m-0 mb-2">
      Generation stopped partway.
    </p>
    <p className="text-[13px] text-rose-700/90 m-0 mb-5 max-w-[28ch]">{error}</p>
    <Link
      to="/topuni-ai"
      className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
    >
      Try again
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);

export default BriefStory;
