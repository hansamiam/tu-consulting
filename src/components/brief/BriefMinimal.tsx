/**
 * BriefDeck — 2026-05-20 redesign #2. McKinsey / Admissionado slide-
 * deck style. Each section renders as a "slide": bold yellow header
 * band, structured tabular body, slide number bottom-right. Reads as
 * a real consulting deliverable instead of free-flowing magazine
 * prose.
 *
 * Reference: Admissionado action-plan PDF — yellow accent band with
 * bold black title, slide content in tables (Category / Score / Key
 * Opportunities / Big Challenges / Important Dates), confidential
 * footer + slide numbers.
 *
 * Adaptation to our schema:
 *   01 Cover         — "Strategy report for [name]"
 *   02 Starting line — strengths + gaps (whereYouStand + whatsBlockingYou)
 *   03 Where to land — 3 schools in a table (reach / target / safety)
 *   04 What to write — 3 essay angles in a table
 *   05 This month    — 4-week action plan in a table
 *
 * Same SSE stream protocol; the renderer is the only thing that's
 * changed. Same back-compat export name (BriefMagazine) so the
 * dashboard import stays unchanged.
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

const SlideShell: React.FC<{
  number: number;
  title: string;
  children: React.ReactNode;
}> = ({ number, title, children }) => (
  <article className="bg-white border border-neutral-200 rounded-lg overflow-hidden mb-6 sm:mb-8 break-inside-avoid print:mb-0 print:rounded-none print:border-x-0">
    {/* Yellow band header — full width, bold black title. */}
    <header className="bg-gold px-6 sm:px-8 py-4 sm:py-5">
      <h2 className="font-heading text-neutral-900 text-[20px] sm:text-[26px] font-bold tracking-[-0.01em] leading-tight">
        {title}
      </h2>
    </header>

    <div className="px-6 sm:px-8 py-6 sm:py-8">
      {children}
    </div>

    {/* Slide footer — slide number, mirrors the Admissionado footer */}
    <footer className="flex items-center justify-end px-6 sm:px-8 py-2.5 bg-neutral-50 border-t border-neutral-200 text-[10.5px] text-neutral-400 uppercase tracking-[0.18em] font-medium">
      <span className="tabular-nums">{String(number).padStart(2, "0")}</span>
    </footer>
  </article>
);

const SlideSkeleton: React.FC<{ number: number; title: string }> = ({ number, title }) => (
  <SlideShell number={number} title={title}>
    <div className="animate-pulse space-y-3">
      <div className="h-3 bg-neutral-200 rounded w-3/4" />
      <div className="h-3 bg-neutral-200 rounded w-1/2" />
      <div className="h-3 bg-neutral-200 rounded w-5/6" />
    </div>
  </SlideShell>
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
    <article className="bg-neutral-900 text-white rounded-lg overflow-hidden mb-6 sm:mb-8 print:rounded-none print:mb-0">
      <div className="px-6 sm:px-12 py-14 sm:py-20 text-center">
        <div className="font-heading text-gold tracking-[0.28em] text-[11px] uppercase font-semibold mb-6">
          TopUni
        </div>
        <h1 className="font-heading text-white text-[32px] sm:text-5xl font-bold tracking-[-0.02em] leading-[1.1] mb-4">
          Strategy Report
        </h1>
        <p className="font-heading text-gold text-[18px] sm:text-2xl font-semibold tracking-tight">
          for {firstName}
        </p>
        <div className="mt-8 inline-flex items-center gap-3 text-neutral-400 text-[11px] uppercase tracking-[0.22em] font-medium">
          {gradeLabel && <span className="text-gold">{gradeLabel}</span>}
          {gradeLabel && dateLine && <span className="text-neutral-600">·</span>}
          {dateLine && <span>{dateLine}</span>}
        </div>
      </div>
      <footer className="flex items-center justify-between px-6 sm:px-8 py-2.5 bg-black/40 border-t border-neutral-800 text-[10.5px] uppercase tracking-[0.18em] font-medium">
        <span className="text-neutral-500">Confidential · Personal to {firstName}</span>
        <span className="text-neutral-500 tabular-nums">01</span>
      </footer>
    </article>
  );
};

// ─── Slide 02 — The Starting Line (strengths + gaps) ──────────────────

const StartingLine: React.FC<{
  thesis?: string;
  body?: string;
  gaps: GapEntry[];
}> = ({ thesis, body, gaps }) => (
  <SlideShell number={2} title="The starting line">
    {thesis && (
      <p className="text-neutral-700 text-[14.5px] leading-relaxed mb-6 italic">
        {thesis}
      </p>
    )}
    <table className="w-full border-collapse text-[14px] leading-relaxed">
      <tbody>
        <tr className="border border-gold/60">
          <td className="bg-gold/15 align-top w-32 sm:w-40 px-3 sm:px-4 py-3 text-neutral-700 text-[12px] font-semibold uppercase tracking-wider">
            Where you stand
          </td>
          <td className="align-top px-4 sm:px-5 py-3 text-neutral-700">
            {body ? body.split(/\n\n+/).map((p, i) => (
              <p key={i} className={i > 0 ? "mt-2.5" : ""}>{p}</p>
            )) : <p className="text-neutral-400 italic">Loading…</p>}
          </td>
        </tr>
        {gaps.length > 0 && (
          <tr className="border border-gold/60">
            <td className="bg-gold/15 align-top w-32 sm:w-40 px-3 sm:px-4 py-3 text-neutral-700 text-[12px] font-semibold uppercase tracking-wider">
              Close these
            </td>
            <td className="align-top px-4 sm:px-5 py-3 text-neutral-700">
              <ol className="space-y-3">
                {gaps.map((g, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 inline-flex h-5 w-5 rounded items-center justify-center bg-neutral-900 text-white text-[11px] font-mono tabular-nums font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900">{g.title}</p>
                      {g.actionThisMonth && (
                        <p className="text-neutral-600 text-[13.5px] mt-0.5">{g.actionThisMonth}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </SlideShell>
);

// ─── Slide 03 — Where you can land (shortlist) ────────────────────────

const TIER_STYLE: Record<SchoolEntry["tier"], { label: string; bg: string; text: string }> = {
  reach: { label: "Reach", bg: "bg-rose-100", text: "text-rose-800" },
  target: { label: "Target", bg: "bg-gold/30", text: "text-neutral-900" },
  safety: { label: "Safety", bg: "bg-emerald-100", text: "text-emerald-800" },
};

const Shortlist: React.FC<{ entries: SchoolEntry[] }> = ({ entries }) => (
  <SlideShell number={3} title="Where you can land">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px] leading-relaxed">
        <thead>
          <tr>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700 w-20">Tier</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">School</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">Why it fits</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700 w-40">Threshold</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700 w-40">Anchor with</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((s, i) => {
            const tier = TIER_STYLE[s.tier] ?? TIER_STYLE.target;
            return (
              <tr key={`${s.name}-${i}`}>
                <td className={`border border-gold/60 align-top px-3 py-3 ${tier.bg}`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${tier.text}`}>
                    {tier.label}
                  </span>
                </td>
                <td className="border border-gold/60 align-top px-3 py-3 bg-white">
                  <p className="font-semibold text-neutral-900">{s.name}</p>
                  {s.country && <p className="text-neutral-500 text-[12px] mt-0.5">{s.country}</p>}
                </td>
                <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                  {s.whyItFits ?? "—"}
                </td>
                <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                  {s.threshold ?? "—"}
                </td>
                <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                  {s.careerAnchor ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </SlideShell>
);

// ─── Slide 04 — What to write ─────────────────────────────────────────

const EssayAngles: React.FC<{ entries: EssayEntry[] }> = ({ entries }) => (
  <SlideShell number={4} title="What to write">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px] leading-relaxed">
        <thead>
          <tr>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700 w-12">#</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">Angle</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">Anchor with</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700 w-48">Why it works</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700 w-44">Plays best to</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={`${e.title}-${i}`}>
              <td className="border border-gold/60 align-top px-3 py-3 bg-gold/10 text-center">
                <span className="font-mono text-neutral-900 font-bold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              </td>
              <td className="border border-gold/60 align-top px-3 py-3 bg-white">
                <p className="font-semibold text-neutral-900">{e.title}</p>
              </td>
              <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                {e.anchorItWith ?? "—"}
              </td>
              <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                {e.whyItWorks ?? "—"}
              </td>
              <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                {e.playsBestTo ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </SlideShell>
);

// ─── Slide 05 — This month ────────────────────────────────────────────

const ActionPlan: React.FC<{ weeks: WeekBlock[]; closingLine?: string }> = ({ weeks, closingLine }) => (
  <SlideShell number={5} title="Your next 28 days">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px] leading-relaxed">
        <thead>
          <tr>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700 w-24">Week</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">Focus</th>
            <th className="bg-gold/30 border border-gold/60 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-700">Tasks</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={`${w.label}-${i}`}>
              <td className="border border-gold/60 align-top px-3 py-3 bg-gold/15">
                <span className="font-semibold text-neutral-900 text-[14px]">{w.label}</span>
              </td>
              <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                {w.focus ?? "—"}
              </td>
              <td className="border border-gold/60 align-top px-3 py-3 bg-white text-neutral-700">
                {w.tasks && w.tasks.length > 0 ? (
                  <ul className="space-y-1">
                    {w.tasks.map((t, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="text-gold-dark/70 select-none">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {closingLine && (
      <p className="mt-6 text-center font-heading italic text-neutral-600 text-[14px]">
        {closingLine}
      </p>
    )}
  </SlideShell>
);

// ─── Next-steps card (post-deck, not a slide) ─────────────────────────

const NextStepsCard: React.FC = () => (
  <section className="mt-6 print:hidden">
    <div className="grid sm:grid-cols-2 gap-3">
      <Link
        to="/discover"
        className="group block bg-white border border-neutral-200 hover:border-gold/60 rounded-lg p-5 transition-colors"
      >
        <div className="flex items-center gap-2 mb-2">
          <Compass className="h-4 w-4 text-gold-dark" />
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-gold-dark font-semibold">
            Your matches
          </span>
        </div>
        <h3 className="font-heading text-neutral-900 font-bold text-[16px] tracking-tight">
          Open Discover
        </h3>
        <p className="text-neutral-500 text-[13px] leading-relaxed mt-1.5">
          Live scholarship list filtered to your profile.
        </p>
        <span className="inline-flex items-center gap-1 text-gold-dark text-[12px] font-semibold mt-3 group-hover:gap-2 transition-all">
          Browse <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
      <Link
        to="/academy"
        className="group block bg-white border border-neutral-200 hover:border-primary/40 rounded-lg p-5 transition-colors"
      >
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-primary font-semibold">
            Live help
          </span>
        </div>
        <h3 className="font-heading text-neutral-900 font-bold text-[16px] tracking-tight">
          Join Academy
        </h3>
        <p className="text-neutral-500 text-[13px] leading-relaxed mt-1.5">
          Workshops and office hours with the team.
        </p>
        <span className="inline-flex items-center gap-1 text-primary text-[12px] font-semibold mt-3 group-hover:gap-2 transition-all">
          What's included <ArrowRight className="h-3 w-3" />
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
          thesis={stand?.headline || stand?.lead}
          body={stand?.body ?? stand?.lead}
          gaps={gaps}
        />
      ) : streaming ? <SlideSkeleton number={2} title="The starting line" /> : null}

      {schoolEntries.length > 0 ? (
        <Shortlist entries={schoolEntries} />
      ) : streaming ? <SlideSkeleton number={3} title="Where you can land" /> : null}

      {essayEntries.length > 0 ? (
        <EssayAngles entries={essayEntries} />
      ) : streaming ? <SlideSkeleton number={4} title="What to write" /> : null}

      {weeks.length > 0 ? (
        <ActionPlan weeks={weeks} closingLine={sections.whatToDoThisMonth?.closingLine} />
      ) : streaming ? <SlideSkeleton number={5} title="Your next 28 days" /> : null}

      {anyLoaded && !streamError && <NextStepsCard />}
    </div>
  );
};

// Back-compat alias — TopUniDashboard imports BriefMagazine.
export const BriefMagazine = BriefDeck;
export const BriefMinimal = BriefDeck;

export const VISIBLE_SECTIONS: SectionId[] = SECTION_ORDER;
