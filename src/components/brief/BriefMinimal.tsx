/**
 * BriefMinimal — 2026-05-20 redesign. Replaces the magazine-style
 * BriefMagazine renderer.
 *
 * User direction was "scrap the current admission strategy report UI
 * because now it's horrendously ugly. revamp." Goals:
 *   - Fewer visible components (denser, not vertically compressed)
 *   - Quality over quantity — no drop caps, no pull quotes, no
 *     editorial chrome that was reading as 2010-blog
 *   - Single column, generous whitespace, modern minimal
 *   - Numbered sections (01 / 02 / 03 / 04) with clean dividers
 *   - Same streaming SSE protocol as BriefMagazine — the LLM payload
 *     shape is unchanged; this is purely a visual rewrite
 *
 * Section consolidation:
 *   01 · The read           = whereYouStand body + whatsBlockingYou top-priority gap
 *   02 · The shortlist      = whereYouCanLand (3 schools, compact rows)
 *   03 · The story          = whatToWrite (3 essay angles, compact rows)
 *   04 · This month         = whatToDoThisMonth (4 weeks, 3 tasks each)
 *
 * "How you'll pay" (funding lanes) is dropped from the report — the
 * live /discover database is the personalized funding source of truth
 * and the brief used to duplicate it. End-of-brief CTA bridges to
 * /discover + /academy.
 */
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, GraduationCap, AlertTriangle, MapPin, BookOpenText, Calendar } from "lucide-react";
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

// ─── Visual primitives ──────────────────────────────────────────────

const SectionHeader: React.FC<{ index: number; kicker: string; headline?: string; lead?: string }> = ({
  index, kicker, headline, lead,
}) => (
  <header className="mb-8">
    <div className="flex items-baseline gap-3 mb-3">
      <span className="font-mono text-[12px] text-gold-dark font-semibold tabular-nums tracking-wider">
        {String(index).padStart(2, "0")}
      </span>
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
        {kicker}
      </span>
    </div>
    {headline && (
      <h2 className="font-heading text-2xl sm:text-[28px] font-bold text-foreground tracking-[-0.015em] leading-[1.18]">
        {headline}
      </h2>
    )}
    {lead && (
      <p className="text-foreground/75 text-[15px] leading-relaxed mt-3 max-w-[58ch]">
        {lead}
      </p>
    )}
  </header>
);

const Divider: React.FC = () => (
  <div className="my-12 sm:my-16 flex items-center justify-center">
    <div className="h-px w-12 bg-border" aria-hidden />
  </div>
);

const Skeleton: React.FC<{ index: number; kicker: string }> = ({ index, kicker }) => (
  <section className="animate-pulse">
    <SectionHeader index={index} kicker={kicker} headline=" " />
    <div className="space-y-2 mt-6">
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  </section>
);

// ─── Section renderers ──────────────────────────────────────────────

const TheRead: React.FC<{
  body?: string;
  pullquote?: string;
  topGap?: GapEntry;
}> = ({ body, pullquote, topGap }) => (
  <section>
    <SectionHeader index={1} kicker="The read" headline={pullquote ?? undefined} />
    {body && (
      <div className="space-y-4 text-foreground/85 text-[15.5px] leading-[1.7] max-w-[62ch]">
        {body.split(/\n\n+/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    )}
    {topGap && (
      <div className="mt-7 border-l-2 border-amber-500/60 pl-5 py-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400 font-semibold mb-1.5 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" /> Top priority to close
        </p>
        <p className="font-heading text-foreground font-semibold text-[16px] leading-snug">
          {topGap.title}
        </p>
        {topGap.actionThisMonth && (
          <p className="text-foreground/75 text-[13.5px] leading-relaxed mt-1.5">
            {topGap.actionThisMonth}
          </p>
        )}
      </div>
    )}
  </section>
);

const TierBadge: React.FC<{ tier: SchoolEntry["tier"] }> = ({ tier }) => {
  const map: Record<SchoolEntry["tier"], string> = {
    reach: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    target: "bg-gold/15 text-gold-dark border-gold/40",
    safety: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  };
  return (
    <span className={`text-[10px] uppercase tracking-[0.18em] font-semibold px-2 py-0.5 rounded border ${map[tier]}`}>
      {tier}
    </span>
  );
};

const TheShortlist: React.FC<{ entries: SchoolEntry[] }> = ({ entries }) => (
  <section>
    <SectionHeader index={2} kicker="The shortlist" headline="Three schools to anchor on." />
    <div className="space-y-7">
      {entries.map((s, i) => (
        <article key={`${s.name}-${i}`} className="grid grid-cols-[auto,1fr] gap-x-5 sm:gap-x-7 gap-y-1">
          <div className="flex flex-col items-start gap-1.5 pt-1 min-w-[64px]">
            <TierBadge tier={s.tier} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="font-heading text-foreground font-bold text-[17px] sm:text-[18px] tracking-[-0.01em]">
                {s.name}
              </h3>
              {s.country && (
                <span className="text-muted-foreground text-[12.5px] inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {s.country}
                </span>
              )}
            </div>
            {s.whyItFits && (
              <p className="text-foreground/80 text-[14.5px] leading-relaxed mt-2 max-w-[58ch]">
                {s.whyItFits}
              </p>
            )}
            {(s.threshold || s.careerAnchor) && (
              <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                {s.threshold && (
                  <div>
                    <dt className="text-muted-foreground text-[10.5px] uppercase tracking-[0.18em] font-medium">Threshold</dt>
                    <dd className="text-foreground/85 mt-0.5">{s.threshold}</dd>
                  </div>
                )}
                {s.careerAnchor && (
                  <div>
                    <dt className="text-muted-foreground text-[10.5px] uppercase tracking-[0.18em] font-medium">Career anchor</dt>
                    <dd className="text-foreground/85 mt-0.5">{s.careerAnchor}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </article>
      ))}
    </div>
  </section>
);

const TheStory: React.FC<{ entries: EssayEntry[] }> = ({ entries }) => (
  <section>
    <SectionHeader index={3} kicker="The story" headline="Three angles only you can write." />
    <div className="space-y-7">
      {entries.map((e, i) => (
        <article key={`${e.title}-${i}`} className="grid grid-cols-[auto,1fr] gap-x-5 sm:gap-x-7">
          <span className="font-mono text-muted-foreground text-[13px] font-medium tabular-nums pt-1 min-w-[28px]">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-foreground font-bold text-[17px] sm:text-[18px] tracking-[-0.01em] leading-snug">
              {e.title}
            </h3>
            {e.anchorItWith && (
              <p className="text-foreground/80 text-[14.5px] leading-relaxed mt-2 max-w-[58ch]">
                {e.anchorItWith}
              </p>
            )}
            {(e.whyItWorks || e.playsBestTo) && (
              <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                {e.whyItWorks && (
                  <div>
                    <dt className="text-muted-foreground text-[10.5px] uppercase tracking-[0.18em] font-medium">Why it works</dt>
                    <dd className="text-foreground/85 mt-0.5">{e.whyItWorks}</dd>
                  </div>
                )}
                {e.playsBestTo && (
                  <div>
                    <dt className="text-muted-foreground text-[10.5px] uppercase tracking-[0.18em] font-medium">Plays best to</dt>
                    <dd className="text-foreground/85 mt-0.5">{e.playsBestTo}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </article>
      ))}
    </div>
  </section>
);

const ThisMonth: React.FC<{ weeks: WeekBlock[]; closingLine?: string }> = ({ weeks, closingLine }) => (
  <section>
    <SectionHeader index={4} kicker="This month" headline="Your next 28 days, mapped." />
    <ol className="space-y-6">
      {weeks.map((w, i) => (
        <li key={`${w.label}-${i}`} className="grid grid-cols-[auto,1fr] gap-x-5 sm:gap-x-7">
          <div className="pt-0.5">
            <div className="h-7 w-7 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
              <span className="font-mono text-gold-dark text-[11px] font-bold tabular-nums">{i + 1}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-medium mb-0.5">
              {w.label}
            </p>
            {w.focus && (
              <h3 className="font-heading text-foreground font-bold text-[16px] leading-snug">
                {w.focus}
              </h3>
            )}
            {w.tasks && w.tasks.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {w.tasks.map((t, j) => (
                  <li key={j} className="text-foreground/85 text-[14px] leading-relaxed flex gap-2">
                    <span className="text-gold-dark/60 select-none mt-2">•</span>
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
      <p className="mt-10 text-center font-heading italic text-gold-dark text-[15px] tracking-[0.02em]">
        {closingLine}
      </p>
    )}
  </section>
);

const NextStepsCard: React.FC = () => (
  <section className="mt-16 sm:mt-20">
    <div className="grid sm:grid-cols-2 gap-3">
      <Link
        to="/discover"
        className="group block bg-card hover:bg-gold/[0.04] border border-border hover:border-gold/50 rounded-xl p-5 transition-colors"
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Compass className="h-4 w-4 text-gold-dark" />
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-gold-dark font-semibold">
            Your live matches
          </span>
        </div>
        <h3 className="font-heading text-foreground font-bold text-[17px] tracking-tight">
          Open Discover
        </h3>
        <p className="text-foreground/65 text-[13px] leading-relaxed mt-1.5">
          Personalised scholarship list, refreshed daily.
        </p>
        <span className="inline-flex items-center gap-1 text-gold-dark text-[12px] font-semibold mt-3 group-hover:gap-2 transition-all">
          Browse <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
      <Link
        to="/academy"
        className="group block bg-card hover:bg-primary/[0.04] border border-border hover:border-primary/40 rounded-xl p-5 transition-colors"
      >
        <div className="flex items-center gap-2 mb-2.5">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-primary font-semibold">
            Live help
          </span>
        </div>
        <h3 className="font-heading text-foreground font-bold text-[17px] tracking-tight">
          Join Academy
        </h3>
        <p className="text-foreground/65 text-[13px] leading-relaxed mt-1.5">
          Live workshops and office hours with the team.
        </p>
        <span className="inline-flex items-center gap-1 text-primary text-[12px] font-semibold mt-3 group-hover:gap-2 transition-all">
          What's included <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
    </div>
  </section>
);

// ─── Masthead — simple, no magazine chrome ──────────────────────────

const Masthead: React.FC<{
  studentName: string;
  gradeLabel?: string;
  generatedAt?: string;
  synthesisLine?: string;
}> = ({ studentName, gradeLabel, generatedAt, synthesisLine }) => {
  const dateLine = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : null;
  return (
    <header className="mb-14 sm:mb-20 text-center">
      <div className="flex items-center justify-center gap-2 mb-5 text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground font-medium">
        <BookOpenText className="h-3 w-3" />
        Strategy report
        {gradeLabel && <span className="text-gold-dark">· {gradeLabel}</span>}
      </div>
      <h1 className="font-heading text-[34px] sm:text-5xl font-bold text-foreground tracking-[-0.02em] leading-[1.05] max-w-[18ch] mx-auto">
        Built for{" "}
        <span className="text-gold-dark">{studentName}</span>.
      </h1>
      {synthesisLine && (
        <p className="text-foreground/70 text-[15px] sm:text-[16px] leading-relaxed mt-5 max-w-[52ch] mx-auto">
          {synthesisLine}
        </p>
      )}
      {dateLine && (
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium mt-6 inline-flex items-center gap-1.5">
          <Calendar className="h-3 w-3" /> {dateLine}
        </p>
      )}
    </header>
  );
};

// ─── Stream / Static orchestrator ───────────────────────────────────

export const BriefMinimal: React.FC<Props> = (props) => {
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
  const synthesisLine = stand?.lead ?? stand?.headline;
  const topGap = sections.whatsBlockingYou?.entries?.find((g) => g.priority === "high")
    ?? sections.whatsBlockingYou?.entries?.[0];

  const schoolEntries = sections.whereYouCanLand?.entries ?? [];
  const essayEntries = sections.whatToWrite?.entries ?? [];
  const weeks = sections.whatToDoThisMonth?.weeks ?? [];

  const anySectionLoaded = Object.keys(sections).length > 0;
  const streaming = props.mode === "stream" && !streamError;

  return (
    <div id="printable-report" className="max-w-2xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-foreground">
      <Masthead
        studentName={props.studentName}
        gradeLabel={props.gradeLabel}
        generatedAt={props.generatedAt}
        synthesisLine={synthesisLine}
      />

      {streamError && (
        <div className="my-10 mx-auto max-w-md text-center text-rose-500 text-sm">
          Brief generation failed: {streamError}. Try regenerating.
        </div>
      )}

      {/* 01 — The read */}
      {(stand?.body || stand?.lead || topGap) ? (
        <TheRead body={stand?.body ?? stand?.lead} pullquote={stand?.pullquote ?? stand?.headline} topGap={topGap} />
      ) : streaming ? (
        <Skeleton index={1} kicker="The read" />
      ) : null}

      <Divider />

      {/* 02 — The shortlist */}
      {schoolEntries.length > 0 ? (
        <TheShortlist entries={schoolEntries} />
      ) : streaming ? (
        <Skeleton index={2} kicker="The shortlist" />
      ) : null}

      <Divider />

      {/* 03 — The story */}
      {essayEntries.length > 0 ? (
        <TheStory entries={essayEntries} />
      ) : streaming ? (
        <Skeleton index={3} kicker="The story" />
      ) : null}

      <Divider />

      {/* 04 — This month */}
      {weeks.length > 0 ? (
        <ThisMonth weeks={weeks} closingLine={sections.whatToDoThisMonth?.closingLine} />
      ) : streaming ? (
        <Skeleton index={4} kicker="This month" />
      ) : null}

      {anySectionLoaded && !streamError && <NextStepsCard />}
    </div>
  );
};

// Maintain BriefMagazine export name for back-compat with TopUniDashboard
export const BriefMagazine = BriefMinimal;

// Iterate the visible 4-section order — used by stream-cache replay.
export const VISIBLE_SECTIONS: SectionId[] = SECTION_ORDER;
