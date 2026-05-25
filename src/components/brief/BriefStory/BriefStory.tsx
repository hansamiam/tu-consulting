/**
 * BriefStory — the post-form-submit strategy report.
 *
 * 2026-05-25 redesign #2. Previous revision copy-pasted the designer's
 * mockup chrome (9:16 frame, variant picker, side panels, "TopUni AI · v7"
 * mono wordmarks, "Duration · Cost" meta footers) and felt vibecoded.
 * Samuel called it on the live site walkthrough; this revision rips all
 * of that out and rebuilds against OUR spec:
 *
 *   archetype hook + 6 cards
 *     · WHO YOU ARE
 *     · HIDDEN ADVANTAGE
 *     · WHERE YOU BELONG
 *     · ESSAY ONLY YOU CAN WRITE
 *     · WHAT YOU'RE AVOIDING
 *     · MONDAY MOVE
 *
 * Vertical scroll. No 9:16 frame, no carousel, no variant picker, no
 * side panels, no top wordmark, no footer stamp, no `01 ·` kickers, no
 * meta footers. The brief reads as an editorial article, not a slide
 * deck stuck on a webpage.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import type { BriefStoryProps } from "./types";
import { buildStoryData } from "./utils";

export const BriefStory = ({
  sections,
  student,
  funnel,
  topMatch,
  loading = false,
  error = null,
}: BriefStoryProps) => {
  const data = buildStoryData(sections, student, funnel, topMatch);
  const anyLoaded = Object.keys(sections).length > 0;
  const standHasBody = !!(data.stand?.body || data.stand?.headline);
  const standHasPull = !!data.stand?.pullquote;

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-7 py-4 sm:py-8 text-foreground">
      {/* Archetype hook — small opener, sets the tone. The big surfaces
          below carry the substance. */}
      {data.archetype?.name && (
        <ArchetypeHook
          name={data.archetype.name}
          tagline={data.archetype.tagline}
          color={sections.archetype?.color}
        />
      )}

      {/* The six surfaces. Each renders only when its payload arrived. */}
      <div className="space-y-16 sm:space-y-20">
        {standHasBody && (
          <Section kicker="Who you are" headline={data.stand?.headline}>
            {data.stand?.body && <Prose>{data.stand.body}</Prose>}
          </Section>
        )}

        {standHasPull && (
          <Section kicker="Hidden advantage">
            <Pullquote>{data.stand!.pullquote!}</Pullquote>
          </Section>
        )}

        {data.countries && data.countries.length > 0 && (
          <Section
            kicker="Where you belong"
            headline={
              data.topMatch?.name
                ? `${data.topMatch.name}.`
                : "Where the door is already open."
            }
          >
            {data.topMatch && (
              <TopMatchBlock
                name={data.topMatch.name}
                location={data.topMatch.location}
                funding={data.topMatch.funding}
                deadline={data.topMatch.deadline}
              />
            )}
            <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
              {data.countries.map((c, i) => (
                <li
                  key={`${c.name}-${i}`}
                  className="py-4 grid grid-cols-[28px_1fr_auto] items-center gap-3"
                >
                  <span className="text-[18px] leading-none">{c.flag}</span>
                  <div>
                    <p className="font-heading font-semibold text-[15px] text-foreground m-0 leading-tight">
                      {c.name}
                    </p>
                    {c.anchors && (
                      <p className="text-[13px] text-muted-foreground m-0 mt-0.5">
                        {c.anchors}
                      </p>
                    )}
                  </div>
                  <span className="font-heading font-semibold text-[16px] text-foreground tabular-nums">
                    {c.count}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {data.essay && (data.essay.closer || data.essay.body) && (
          <Section
            kicker="Essay only you can write"
            headline={data.essay.closer || "An angle only you have."}
          >
            {data.essay.body && <Prose>{data.essay.body}</Prose>}
          </Section>
        )}

        {data.block && data.block.items.length > 0 && (
          <Section kicker="What you're avoiding" headline={data.block.headline}>
            {data.block.body && <Prose>{data.block.body}</Prose>}
            <div className="mt-6 divide-y divide-border/60 border-y border-border/60">
              {data.block.items.map((it, i) => (
                <div key={i} className="py-4 grid grid-cols-[80px_1fr] gap-4 items-start">
                  <span
                    className={[
                      "inline-block text-[11px] uppercase tracking-[0.06em] font-semibold",
                      it.priority === "high" ? "text-gold-dark" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {it.priority === "high" ? "Now" : "Soon"}
                  </span>
                  <div>
                    <p className="font-heading font-semibold text-[15.5px] text-foreground m-0 mb-1 leading-snug">
                      {it.title}
                    </p>
                    {it.action && (
                      <p className="text-[14.5px] text-muted-foreground leading-relaxed m-0">
                        {it.action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.mondayMove && (data.mondayMove.headline || data.mondayMove.body) && (
          <Section
            kicker="Monday move"
            headline={data.mondayMove.headline || "One thing this week."}
          >
            {data.mondayMove.body && <Prose>{data.mondayMove.body}</Prose>}
          </Section>
        )}
      </div>

      {/* Streaming-error escape hatch. The retry is the whole UI — no
          tiny rose-toast hidden in a corner. */}
      {error && (
        <div
          role="alert"
          className="mt-16 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-7 text-center"
        >
          <p className="font-heading text-base font-semibold text-rose-900 m-0 mb-1">
            Generation stopped partway.
          </p>
          <p className="text-sm text-rose-700/90 m-0 mb-5">{error}</p>
          <Link
            to="/topuni-ai"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            Try again
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* End of brief — primary funnel to Discover. The CTA card is
          bold on purpose (the "Open the database" muted outline button
          was the previous reading). */}
      {anyLoaded && !error && (
        <Link
          to="/discover"
          className="mt-16 sm:mt-20 group block rounded-2xl bg-[hsl(var(--navy-deep))] hover:bg-[hsl(var(--navy))] text-[hsl(43_44%_96%)] px-6 sm:px-8 py-7 transition-colors"
        >
          <div className="flex items-center gap-5">
            <div className="shrink-0 w-11 h-11 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
              <Compass className="w-5 h-5 text-gold-light" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold text-[18px] sm:text-[20px] tracking-tight leading-tight m-0 mb-1">
                Open Discover
              </p>
              <p className="text-[14px] text-[hsl(43_44%_96%)]/75 m-0 leading-snug">
                Every scholarship that fits your profile, refreshed daily.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gold-light group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* While the stream is still arriving, show a soft skeleton for
          any not-yet-loaded surface so the page doesn't feel half-empty. */}
      {loading && !anyLoaded && (
        <div className="space-y-6 animate-pulse mt-2">
          <div className="h-4 bg-foreground/5 rounded w-1/3" />
          <div className="h-10 bg-foreground/5 rounded w-3/4" />
          <div className="h-4 bg-foreground/5 rounded w-full" />
          <div className="h-4 bg-foreground/5 rounded w-5/6" />
        </div>
      )}
    </div>
  );
};

// ─── Inline section primitives ───────────────────────────────────────

const Kicker = ({ children }: { children: string }) => (
  <p className="m-0 mb-4 text-[12px] uppercase tracking-[0.08em] font-semibold text-foreground/55">
    {children}
  </p>
);

const Section = ({
  kicker,
  headline,
  children,
}: {
  kicker: string;
  headline?: string;
  children: React.ReactNode;
}) => (
  <section>
    <Kicker>{kicker}</Kicker>
    {headline && (
      <h2 className="font-heading font-bold text-[28px] sm:text-[34px] leading-[1.1] tracking-[-0.02em] text-foreground m-0 mb-5 text-balance">
        {headline}
      </h2>
    )}
    {children}
  </section>
);

const Prose = ({ children }: { children: string }) => (
  <p className="font-sans text-[15.5px] sm:text-[16px] leading-[1.7] text-foreground/80 m-0">
    {children}
  </p>
);

const Pullquote = ({ children }: { children: string }) => (
  <blockquote className="m-0 border-l-2 border-gold pl-5 sm:pl-6 py-1">
    <p className="font-heading italic font-medium text-[18px] sm:text-[20px] leading-[1.35] text-foreground tracking-tight m-0 text-balance">
      {children}
    </p>
  </blockquote>
);

const ArchetypeHook = ({
  name,
  tagline,
  color,
}: {
  name: string;
  tagline?: string;
  color?: string;
}) => (
  <section className="mb-16 sm:mb-20">
    <p className="m-0 mb-2 text-[12px] uppercase tracking-[0.08em] font-semibold text-foreground/55">
      You are
    </p>
    <h1
      className="font-heading font-bold text-[40px] sm:text-[52px] leading-[1.0] tracking-[-0.03em] m-0 mb-3 text-balance"
      style={color ? { color } : undefined}
    >
      {name.replace(/\.$/, "")}.
    </h1>
    {tagline && (
      <p className="font-heading italic font-medium text-[17px] sm:text-[19px] leading-[1.35] text-foreground/75 tracking-tight m-0 max-w-[40ch] text-balance">
        {tagline}
      </p>
    )}
  </section>
);

const TopMatchBlock = ({
  name,
  location,
  funding,
  deadline,
}: {
  name: string;
  location?: string;
  funding?: string;
  deadline?: string;
}) => (
  <div className="mt-1">
    <p className="text-[13.5px] text-muted-foreground m-0">
      {location ? `${location}. ` : ""}
      {funding ? `${funding}. ` : ""}
      {deadline ? `Deadline ${deadline}.` : ""}
    </p>
  </div>
);

export default BriefStory;
