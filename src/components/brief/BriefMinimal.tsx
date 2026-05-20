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
} from "./types";

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
}> = ({ thesis, body, gaps }) => (
  <Slide number={2} kicker="The starting line" title={thesis ?? "Where you stand today."}>
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
  </Slide>
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

  const stand = sections.whereYouStand;
  const gaps = sections.whatsBlockingYou?.entries ?? [];
  const schoolEntries = sections.whereYouCanLand?.entries ?? [];
  const essayEntries = sections.whatToWrite?.entries ?? [];
  const weeks = sections.whatToDoThisMonth?.weeks ?? [];

  const streaming = props.mode === "stream" && !streamError;
  const anyLoaded = Object.keys(sections).length > 0;

  return (
    <div id="printable-report-inner" className="max-w-3xl mx-auto">
      {streamError && (
        <div className="my-6 mx-auto max-w-md text-center text-rose-500 text-sm">
          Brief generation failed: {streamError}. Try regenerating.
        </div>
      )}

      <Cover studentName={props.studentName} gradeLabel={props.gradeLabel} generatedAt={props.generatedAt} />

      {(stand?.body || stand?.lead || gaps.length > 0) ? (
        <StartingLine
          thesis={stand?.headline ?? stand?.lead}
          body={stand?.body ?? stand?.lead}
          gaps={gaps}
        />
      ) : streaming ? <SlideSkeleton number={2} kicker="The starting line" title="Where you stand today." /> : null}

      {schoolEntries.length > 0 ? (
        <Shortlist entries={schoolEntries} />
      ) : streaming ? <SlideSkeleton number={3} kicker="Where you can land" title="Three schools to anchor on." /> : null}

      {essayEntries.length > 0 ? (
        <EssayAngles entries={essayEntries} />
      ) : streaming ? <SlideSkeleton number={4} kicker="What to write" title="Three angles only you can write." /> : null}

      {weeks.length > 0 ? (
        <ActionPlan weeks={weeks} closingLine={sections.whatToDoThisMonth?.closingLine} />
      ) : streaming ? <SlideSkeleton number={5} kicker="Your next 28 days" title="A 4-week plan, mapped." /> : null}

      {anyLoaded && !streamError && <NextStepsCard />}
    </div>
  );
};

// Back-compat alias — TopUniDashboard imports BriefMagazine.
export const BriefMagazine = BriefDeck;
export const BriefMinimal = BriefDeck;

export const VISIBLE_SECTIONS: SectionId[] = SECTION_ORDER;
