/**
 * BriefStory — Wrapped-style story-deck strategy report.
 *
 * Replaces the old McKinsey-deck rendering (BriefMinimal.tsx) as the
 * default post-form-submit view. Designer handoff at
 * ~/Downloads/Top Uni AI/. Seven slides (cover, archetype, stand,
 * land, essay, block, monday move) in a 400×711 9:16 frame with
 * tap-zone nav, autoplay, progress segments, and three visual
 * variants (Editorial / Bold / Quiet).
 *
 * Static mode: caller passes the resolved sections. Stream mode is
 * left to a wrapper higher up (TopUniDashboard already has the SSE
 * accumulator) — keep this component data-only.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Pause,
  Play,
  RotateCw,
  Share2,
} from "lucide-react";
import type { BriefStoryProps, StoryVariant } from "./types";
import { buildStoryData, formatDate } from "./utils";
import { useDeck } from "./useDeck";
import { SlideCover } from "./slides/SlideCover";
import { SlideArchetype } from "./slides/SlideArchetype";
import { SlideStand } from "./slides/SlideStand";
import { SlideLand } from "./slides/SlideLand";
import { SlideEssay } from "./slides/SlideEssay";
import { SlideBlock } from "./slides/SlideBlock";
import { SlideMove } from "./slides/SlideMove";

const TOTAL_SLIDES = 7;

const VARIANT_OPTIONS: { id: StoryVariant; label: string }[] = [
  { id: "editorial", label: "Editorial" },
  { id: "bold", label: "Bold" },
  { id: "quiet", label: "Quiet" },
];

/** Slides where the frame inverts to navy (progress + play colors flip). */
const NAVY_SLIDE_INDICES: Record<StoryVariant, Set<number>> = {
  editorial: new Set([4]), // essay only
  bold: new Set([1, 4]),   // archetype + essay
  quiet: new Set([]),
};

export const BriefStory = ({
  sections,
  student,
  funnel,
  topMatch,
  loading = false,
  error = null,
  initialVariant = "editorial",
  showVariantPicker = true,
  onOpenFullReport,
  onShare,
  onPrint,
}: BriefStoryProps) => {
  const [variant, setVariant] = useState<StoryVariant>(initialVariant);
  const data = useMemo(
    () => buildStoryData(sections, student, funnel, topMatch),
    [sections, student, funnel, topMatch],
  );

  const deck = useDeck({ total: TOTAL_SLIDES });
  const inverted = NAVY_SLIDE_INDICES[variant].has(deck.active);

  const slides = [
    <SlideCover key="cover" student={data.student} cover={data.cover} />,
    <SlideArchetype
      key="archetype"
      variant={variant}
      name={data.archetype?.name}
      tagline={data.archetype?.tagline}
      body={data.archetype?.body}
      confidence={data.archetype?.confidence}
    />,
    <SlideStand
      key="stand"
      variant={variant}
      headline={data.stand?.headline}
      body={data.stand?.body}
      pullquote={data.stand?.pullquote}
    />,
    <SlideLand
      key="land"
      variant={variant}
      funnel={data.funnel}
      topMatch={data.topMatch}
      countries={data.countries}
    />,
    <SlideEssay
      key="essay"
      variant={variant}
      pre={data.essay?.pre}
      closer={data.essay?.closer}
      body={data.essay?.body}
      field={data.student.field}
    />,
    <SlideBlock
      key="block"
      variant={variant}
      headline={data.block?.headline}
      body={data.block?.body}
      items={data.block?.items ?? []}
    />,
    <SlideMove
      key="move"
      variant={variant}
      headline={data.mondayMove?.headline}
      sub={data.mondayMove?.sub}
      body={data.mondayMove?.body}
      duration={data.mondayMove?.duration}
    />,
  ];

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (typeof window !== "undefined") window.print();
  };

  const handleShare = () => {
    if (onShare) {
      onShare(deck.active);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(typeof window !== "undefined" ? window.location.href : "")
        .catch(() => {});
    }
  };

  // Sidebar meta — "312 → 6" style funnel summary.
  const schoolsCell =
    data.funnel && data.funnel.from > 0
      ? `${data.funnel.from} → ${data.funnel.to}`
      : data.funnel?.to
        ? String(data.funnel.to)
        : "—";

  return (
    <div
      className="relative min-h-screen bg-background text-foreground brief-story-root"
      data-variant={variant}
    >
      {/* Subtle dot-pattern stage background. */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(hsl(210 64% 16% / 0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 30%, #000, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 30%, #000, transparent 80%)",
        }}
      />

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="relative z-10 max-w-[1280px] mx-auto px-7 sm:px-7 py-4 sm:py-[18px] grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 print:hidden">
        <div className="font-heading font-bold text-[14px] tracking-[-0.015em] text-foreground inline-flex items-center gap-2">
          <span className="w-[5px] h-[5px] rounded-full bg-gold" aria-hidden />
          TopUni AI
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground font-medium ml-3">
            Strategy report
          </span>
        </div>

        {showVariantPicker ? (
          <div
            role="tablist"
            aria-label="Visual variant"
            className="justify-self-start sm:justify-self-center inline-flex bg-surface border border-[hsl(41_22%_86%)] rounded-full p-[3px] shadow-sm"
          >
            {VARIANT_OPTIONS.map((v) => {
              const active = variant === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setVariant(v.id)}
                  className={[
                    "px-4 py-1.5 rounded-full font-sans text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-all duration-200",
                    active
                      ? "bg-[hsl(var(--navy-deep))] text-[hsl(43_44%_96%)] shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-[5px] h-[5px] rounded-full",
                      active ? "bg-gold opacity-100" : "bg-current opacity-50",
                    ].join(" ")}
                    aria-hidden
                  />
                  {v.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        <nav className="justify-self-start sm:justify-self-end font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground font-medium flex gap-4 sm:gap-[18px] items-center">
          <button
            type="button"
            onClick={deck.restart}
            className="inline-flex items-center gap-1 hover:text-gold-dark transition-colors"
          >
            <RotateCw className="w-3 h-3" /> Restart
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="hover:text-gold-dark transition-colors"
          >
            Save as PDF
          </button>
        </nav>
      </header>

      {/* ── Stage: side-context · frame · side-actions ────────────── */}
      <main className="relative z-[1] max-w-[1280px] mx-auto px-4 sm:px-8 pb-14 grid items-center gap-5 lg:gap-8 lg:grid-cols-[1fr_auto_1fr]">
        {/* LEFT SIDE — context (desktop only) */}
        <aside className="hidden lg:block max-w-[280px] justify-self-end text-right self-center print:hidden">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold m-0 mb-2.5">
            — · Made for
          </p>
          <h2 className="font-heading font-bold text-[21px] tracking-[-0.025em] text-foreground m-0 mb-3 leading-[1.15]">
            {[student.firstName, student.lastName].filter(Boolean).join(" ")}
          </h2>
          <p className="text-[13.5px] text-muted-foreground leading-[1.55] m-0 mb-[18px]">
            {[student.gradeLabel, student.city, student.field].filter(Boolean).join(" · ")}.
            {student.generatedAt && ` Generated ${formatDate(student.generatedAt)}.`}
          </p>
          <div className="mt-[22px] pt-4 border-t border-[hsl(41_22%_86%)] grid grid-cols-2 gap-[14px] text-right">
            <SideMetaCell label="Cards" value="7" />
            <SideMetaCell label="Schools" value={schoolsCell} />
            <SideMetaCell label="Funding" value={data.funnel?.funding ?? "—"} />
            <SideMetaCell label="Read" value="~2 min" />
          </div>
        </aside>

        {/* THE STORY FRAME */}
        <div
          className="brief-story-frame relative w-[400px] max-w-full h-[711px] sm:h-[711px] rounded-[28px] bg-surface overflow-hidden select-none mx-auto"
          style={{
            boxShadow:
              "0 24px 56px -16px hsl(210 74% 13% / 0.20), 0 8px 16px -4px hsl(210 74% 13% / 0.08), 0 0 0 1px hsl(41 22% 81% / 0.6) inset",
          }}
          data-inverted={inverted ? "1" : "0"}
        >
          {/* Progress segments */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => {
              let pct = 0;
              if (i < deck.active) pct = 100;
              else if (i === deck.active) pct = deck.segmentFill;
              return (
                <div
                  key={i}
                  className={[
                    "flex-1 h-[2.5px] rounded-[2px] overflow-hidden relative",
                    inverted ? "bg-[hsl(43_44%_96%/0.22)]" : "bg-[hsl(210_64%_16%/0.18)]",
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

          {/* Slide stack — only the active one is visible */}
          <div className="absolute inset-0">
            {slides.map((slide, i) => (
              <div
                key={i}
                className={[
                  "brief-story-slide-wrap absolute inset-0 transition-all duration-[350ms]",
                  "[transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
                  i === deck.active
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-2 pointer-events-none",
                ].join(" ")}
              >
                {slide}
              </div>
            ))}
          </div>

          {/* Skeleton overlay while sections are still streaming. */}
          {loading && Object.keys(sections).length < 2 && (
            <div className="absolute inset-x-7 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <div className="space-y-3 animate-pulse">
                <div className="h-3 bg-foreground/5 rounded w-3/4" />
                <div className="h-3 bg-foreground/5 rounded w-1/2" />
                <div className="h-3 bg-foreground/5 rounded w-5/6" />
              </div>
            </div>
          )}

          {/* Error banner inside frame — gives the user a recovery */}
          {error && (
            <div
              role="alert"
              className="absolute inset-x-5 bottom-16 z-20 rounded-xl border border-rose-200 bg-rose-50/95 backdrop-blur px-4 py-3 text-center"
            >
              <p className="font-heading text-[13px] font-semibold text-rose-900 m-0 mb-1">
                Strategy stopped partway.
              </p>
              <Link
                to="/topuni-ai"
                className="font-sans text-[12px] font-medium text-rose-700 underline"
              >
                Try again
              </Link>
            </div>
          )}

          {/* Tap zones — left third = prev, right two-thirds = next.
              Sit below frame-controls so the play button still works. */}
          <div className="absolute inset-0 grid grid-cols-[1fr_2fr] z-20">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={deck.prev}
              className="cursor-pointer focus:outline-none"
            />
            <button
              type="button"
              aria-label="Next slide"
              onClick={deck.next}
              className="cursor-pointer focus:outline-none"
            />
          </div>

          {/* Bottom frame controls — play/pause + counter */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-30 pointer-events-none">
            <button
              type="button"
              onClick={deck.toggle}
              aria-label={deck.playing ? "Pause" : "Play"}
              className={[
                "pointer-events-auto w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors backdrop-blur",
                inverted
                  ? "bg-[hsl(43_44%_96%/0.12)] border border-[hsl(43_44%_96%/0.12)] text-[hsl(43_44%_96%)] hover:bg-[hsl(43_44%_96%/0.2)]"
                  : "bg-[hsl(210_64%_16%/0.08)] border border-[hsl(210_64%_16%/0.08)] text-foreground hover:bg-[hsl(210_64%_16%/0.16)]",
              ].join(" ")}
            >
              {deck.playing ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            </button>
            <span
              className={[
                "pointer-events-auto font-mono text-[9.5px] uppercase tracking-[0.22em] font-medium px-2.5 py-1.5 rounded-full backdrop-blur",
                inverted
                  ? "text-[hsl(43_44%_96%/0.7)] bg-[hsl(43_44%_96%/0.08)]"
                  : "text-muted-foreground bg-[hsl(210_64%_16%/0.04)]",
              ].join(" ")}
            >
              {String(deck.active + 1).padStart(2, "0")} / {String(TOTAL_SLIDES).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* RIGHT SIDE — actions (desktop only) */}
        <aside className="hidden lg:block max-w-[280px] justify-self-start self-center print:hidden">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold m-0 mb-2.5">
            — · Take it with you
          </p>
          <h2 className="font-heading font-bold text-[21px] tracking-[-0.025em] text-foreground m-0 mb-3 leading-[1.15]">
            Your story, in your pocket.
          </h2>
          <p className="text-[13.5px] text-muted-foreground leading-[1.55] m-0 mb-[18px]">
            Seven cards, story-sized. Share one, share the deck, or save as PDF.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-[hsl(var(--navy-deep))] border border-[hsl(var(--navy-deep))] text-[hsl(43_44%_96%)] font-sans text-[13px] font-semibold tracking-[-0.005em] shadow-sm transition-all duration-200 hover:bg-[hsl(var(--navy))] hover:border-[hsl(var(--navy))] hover:-translate-y-px"
            >
              <span className="inline-flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5" /> Share this deck
              </span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-surface border border-[hsl(var(--border))] text-foreground font-sans text-[13px] font-semibold tracking-[-0.005em] shadow-sm transition-all duration-200 hover:border-gold-dark hover:text-gold-dark hover:-translate-y-px"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="w-3.5 h-3.5" /> Save as PDF
              </span>
            </button>
            {onOpenFullReport && (
              <button
                type="button"
                onClick={onOpenFullReport}
                className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-surface border border-[hsl(var(--border))] text-foreground font-sans text-[13px] font-semibold tracking-[-0.005em] shadow-sm transition-all duration-200 hover:border-gold-dark hover:text-gold-dark hover:-translate-y-px"
              >
                Open full report
              </button>
            )}
          </div>
        </aside>
      </main>

      {/* Footer wordmark */}
      <footer className="relative z-[5] max-w-[1280px] mx-auto px-4 sm:px-8 pt-5 pb-7 flex flex-col sm:flex-row justify-between gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium print:hidden">
        <span>TopUni AI · Strategy report</span>
        <span>v7</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};

const SideMetaCell = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground font-medium m-0 mb-[3px]">
      {label}
    </p>
    <p className="font-heading font-semibold text-[15px] tracking-[-0.015em] text-foreground m-0">
      {value}
    </p>
  </div>
);

export default BriefStory;
