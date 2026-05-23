/**
 * BriefMagazine — orchestrator for the v6 editorial brief renderer.
 *
 * Two render modes:
 *   1. STATIC — pass `sections` directly. Used by SharedBrief and any
 *      already-persisted brief (cache hit replay also supplies this).
 *   2. STREAMING — pass `streamUrl` + `requestBody`. The component POSTs
 *      to the edge function, parses the SSE event stream (each event
 *      is `data: {section, payload}` JSON), and renders each section
 *      as soon as it arrives.
 *
 * Either way, the renderer walks SECTION_ORDER and either shows the
 * payload or a SectionSkeleton in-place — layout never jumps because
 * skeletons reserve the same vertical space as the real sections.
 */
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, GraduationCap, Sparkles } from "lucide-react";
import { MagazineMasthead } from "./primitives/MagazineMasthead";
import { SectionSkeleton } from "./primitives/SectionSkeleton";
import { WhereYouStand } from "./sections/WhereYouStand";
import { WhereYouCanLand } from "./sections/WhereYouCanLand";
import { HowYoullPay } from "./sections/HowYoullPay";
import { WhatToWrite } from "./sections/WhatToWrite";
import { WhatsBlockingYou } from "./sections/WhatsBlockingYou";
import { WhatToDoThisMonth } from "./sections/WhatToDoThisMonth";
import {
  SECTION_ORDER,
  SECTION_KICKERS,
  type BriefSections,
  type SectionId,
  type WhereYouStandPayload,
  type WhereYouCanLandPayload,
  type HowYoullPayPayload,
  type WhatToWritePayload,
  type WhatsBlockingYouPayload,
  type WhatToDoThisMonthPayload,
} from "./types";

interface CommonProps {
  studentName: string;
  /** "Basic" | "Member" | undefined */
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
  /** Full URL of the topuni-ai-pathway edge function. */
  streamUrl: string;
  /** Body to POST (profile + reportGrade + language). */
  requestBody: Record<string, unknown>;
  /** Bearer / apikey forwarded as Authorization header. */
  authHeader?: string;
  /** Fires once when the stream completes (DONE), with the full
   *  accumulated sections payload. */
  onComplete?: (sections: BriefSections) => void;
  /** Fires on stream error. */
  onError?: (err: Error) => void;
}

type Props = StaticProps | StreamProps;

const renderSection = (id: SectionId, payload: unknown): React.ReactNode => {
  if (!payload || typeof payload !== "object") return null;
  switch (id) {
    case "whereYouStand":
      return <WhereYouStand payload={payload as WhereYouStandPayload} />;
    case "whereYouCanLand":
      return <WhereYouCanLand payload={payload as WhereYouCanLandPayload} />;
    case "howYoullPay":
      return <HowYoullPay payload={payload as HowYoullPayPayload} />;
    case "whatToWrite":
      return <WhatToWrite payload={payload as WhatToWritePayload} />;
    case "whatsBlockingYou":
      return <WhatsBlockingYou payload={payload as WhatsBlockingYouPayload} />;
    case "whatToDoThisMonth":
      return <WhatToDoThisMonth payload={payload as WhatToDoThisMonthPayload} />;
    default:
      return null;
  }
};

export const BriefMagazine: React.FC<Props> = (props) => {
  const [sections, setSections] = useState<BriefSections>(() =>
    props.mode === "static" ? props.sections : {}
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stream mode — POST + parse SSE chunks. Run once on mount.
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

          // Process every full event in buf
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
            } catch {
              // Defensive: not every SSE chunk we receive is necessarily a
              // valid {section, payload}. Skip and continue.
            }
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
    // We intentionally only run on mount; stream parameters are
    // expected to be stable for the lifetime of a single brief view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick a synthesis line for the masthead — first sentence of the
  // whereYouStand `lead` if available, else the `headline`.
  const stand = sections.whereYouStand;
  const synthesisLine = stand?.lead ?? stand?.headline;

  return (
    <div id="printable-report" className="max-w-[860px] mx-auto px-4 sm:px-6 pb-24 text-foreground">
      <MagazineMasthead
        studentName={props.studentName}
        synthesisLine={synthesisLine}
        gradeLabel={props.gradeLabel}
        generatedAt={props.generatedAt}
        onShare={props.onShare}
        onPrint={props.onPrint}
      />

      {streamError && (
        <div className="my-10 mx-auto max-w-xl text-center font-heading text-rose-500 text-sm">
          Brief generation failed: {streamError}. Try regenerating.
        </div>
      )}

      {SECTION_ORDER.map((id) => {
        const payload = sections[id];
        if (payload) {
          return (
            <React.Fragment key={id}>
              {renderSection(id, payload)}
            </React.Fragment>
          );
        }
        // Skeleton if streaming and not yet received
        if (props.mode === "stream" && !streamError) {
          return <SectionSkeleton key={id} kicker={SECTION_KICKERS[id]} />;
        }
        return null;
      })}

      {/* 2026-05-19: End-of-brief handoff card. The brief itself sketches
          the strategy; the live scholarship list and live workshops
          live elsewhere in the product. Surface both as clear next
          steps so the brief doesn't end in a dead end. Only renders
          once at least one section has arrived — avoids flashing
          during initial stream skeleton state. */}
      {Object.keys(sections).length > 0 && !streamError && (
        <section className="mt-16 sm:mt-20 mb-8">
          <div className="text-center mb-8">
            <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
              What's next
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
              Take the next step.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <Link
              to="/discover"
              className="group block bg-gradient-to-br from-gold/12 via-gold/6 to-transparent border border-gold/40 rounded-2xl p-6 hover:from-gold/22 hover:via-gold/10 transition-colors"
            >
              <div className="flex items-start gap-3 mb-2.5">
                <div className="shrink-0 w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center">
                  <Compass className="h-4.5 w-4.5 text-gold-dark" />
                </div>
                <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mt-1.5">
                  Your live matches
                </p>
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground tracking-tight leading-tight">
                Open Discover
              </h3>
              <p className="text-muted-foreground text-[13.5px] leading-relaxed mt-1.5">
                Your personalized scholarship list — filtered to your profile, refreshed daily.
              </p>
              <span className="inline-flex items-center gap-1.5 text-gold-dark text-[12.5px] font-semibold mt-3 group-hover:gap-2.5 transition-all">
                Browse now <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <Link
              to="/academy"
              className="group block bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-primary/30 rounded-2xl p-6 hover:from-primary/15 hover:via-primary/7 transition-colors"
            >
              <div className="flex items-start gap-3 mb-2.5">
                <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <GraduationCap className="h-4.5 w-4.5 text-primary" />
                </div>
                <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-primary font-semibold mt-1.5">
                  Get live help
                </p>
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground tracking-tight leading-tight">
                Join Academy
              </h3>
              <p className="text-muted-foreground text-[13.5px] leading-relaxed mt-1.5">
                Live workshops and office hours with the team. Walk through your plan with humans.
              </p>
              <span className="inline-flex items-center gap-1.5 text-primary text-[12.5px] font-semibold mt-3 group-hover:gap-2.5 transition-all">
                See what's included <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
          <div className="text-center mt-6">
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-gold-dark" />
              Your report is saved — return to it anytime from your account.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
