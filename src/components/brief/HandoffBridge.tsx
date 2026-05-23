/**
 * HandoffBridge — the brief → Discover handoff card (v7 Beat 7).
 *
 * Replaces the generic NextStepsCard at the tail of the brief with
 * an archetype-personalized bridge: the headline references the
 * student's archetype + countries from the brief plan, the body
 * shows 3 live-matched scholarships, the CTA opens /discover with
 * profile auto-seeded.
 *
 * Per the locked Q-HANDOFF decision (2026-05-23): "Bridge-Domain
 * Kids like you usually save 3-5 scholarships in Canada, UK & Singapore.
 * Here are 3 we already matched to YOUR file." Then 3 scholarship
 * cards. Then "Open Discover →".
 *
 * Substantive renders only — when a brief lacks the handoff payload
 * (legacy schema-2 cache, fallback path, sparse intake without
 * matched scholarships), the parent BriefDeck falls back to
 * NextStepsCard for the generic CTA.
 */

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Compass } from "lucide-react";
import type { HandoffPayload, ScholarshipPreview } from "./types";
import { buildHandoffHeadline } from "./handoff-headlines";
import type { ArchetypeId } from "../../../supabase/functions/_shared/archetype-library";

interface HandoffBridgeProps {
  payload: HandoffPayload;
  /** Saturated archetype hex — used for accents (kicker color,
   *  card border, CTA chip). Falls back to Top Uni navy. */
  archetypeColor?: string;
  /** When true, the CTA deep-links to /discover/ru instead of
   *  /discover. Other surfaces in the renderer use this same
   *  pattern. */
  ru?: boolean;
}

export const HandoffBridge: React.FC<HandoffBridgeProps> = ({
  payload,
  archetypeColor = "#1A3B66",
  ru = false,
}) => {
  const countries = payload.countryBuckets ?? [];
  const topMatches = (payload.topMatches ?? []).slice(0, 3);
  const headline = buildHandoffHeadline(
    payload.archetypeId as ArchetypeId | undefined,
    countries,
  );
  const discoverHref = ru ? "/discover/ru" : "/discover";
  const lead = ru
    ? `Вот 3, которые мы уже подобрали под ваш профиль:`
    : `Here are 3 we already matched to your profile:`;

  return (
    <section
      className="my-10 sm:my-14 mx-auto max-w-2xl rounded-2xl px-8 py-10 sm:px-10 sm:py-12 shadow-sm print:hidden"
      style={{
        background: "linear-gradient(180deg, hsl(210 30% 98%) 0%, hsl(0 0% 100%) 100%)",
        borderTop: `4px solid ${archetypeColor}`,
      }}
    >
      <p
        className="text-[10.5px] uppercase tracking-[0.22em] font-semibold mb-5"
        style={{ color: archetypeColor }}
      >
        07 · {ru ? "Что дальше" : "What's next"}
      </p>

      <h2
        className="font-heading font-bold tracking-[-0.02em] leading-tight text-[clamp(1.5rem,3vw,2.25rem)] max-w-[28ch]"
        style={{ color: "hsl(222 30% 12%)" }}
      >
        {headline}
      </h2>

      {topMatches.length > 0 && (
        <>
          <p className="mt-5 text-[14.5px] text-neutral-700 leading-relaxed">{lead}</p>

          <ol className="mt-5 space-y-3">
            {topMatches.map((m, i) => (
              <ScholarshipPreviewCard key={m.id ?? i} m={m} accent={archetypeColor} ru={ru} />
            ))}
          </ol>
        </>
      )}

      <div className="mt-7 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Link
          to={discoverHref}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold text-sm tracking-tight transition-opacity hover:opacity-90"
          style={{ background: archetypeColor }}
        >
          <Compass className="h-4 w-4" />
          {ru ? "Открыть Discover" : "Open Discover"}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/academy"
          className="text-[12px] text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          {ru ? "Или присоединяйтесь к Academy" : "Or join Academy"}
        </Link>
      </div>
    </section>
  );
};

interface PreviewCardProps {
  m: ScholarshipPreview;
  accent: string;
  ru: boolean;
}

const ScholarshipPreviewCard: React.FC<PreviewCardProps> = ({ m, accent, ru }) => {
  const daysLeft = daysUntil(m.deadlineISO);
  const deadlineLabel = daysLeft == null
    ? null
    : daysLeft < 0
      ? (ru ? "Дедлайн прошёл" : "Deadline passed")
      : daysLeft === 0
        ? (ru ? "Сегодня" : "Today")
        : (ru ? `Через ${daysLeft} дн.` : `In ${daysLeft} day${daysLeft === 1 ? "" : "s"}`);
  return (
    <li
      className="grid grid-cols-[auto,1fr] gap-x-4 py-3 px-4 rounded-lg border border-neutral-200/70 bg-white"
    >
      <span className="select-none pt-1.5 flex-none">
        <span className="block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      </span>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className="font-heading text-neutral-900 font-semibold text-[15px] leading-snug tracking-[-0.005em]">
            {m.name}
          </p>
          {m.country && (
            <span className="text-[11px] text-neutral-500 tabular-nums whitespace-nowrap">
              {m.country}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11.5px] text-neutral-500">
          {m.awardText && <span>{m.awardText}</span>}
          {m.awardText && deadlineLabel && <span className="text-neutral-300">·</span>}
          {deadlineLabel && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {deadlineLabel}
            </span>
          )}
        </div>
        {m.fitNote && (
          <p className="text-[12.5px] text-neutral-600 leading-relaxed mt-1.5 max-w-[52ch]">
            {m.fitNote}
          </p>
        )}
      </div>
    </li>
  );
};

/** Days from now to the given ISO date string. Negative if past.
 *  Returns null if the input is missing or unparseable. */
function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return null;
  const ms = target - Date.now();
  return Math.ceil(ms / 86_400_000);
}
