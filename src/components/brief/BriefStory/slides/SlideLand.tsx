/**
 * Slide 04 — Where you can land. Funnel teaser + top-match card + country
 * rows + meta footer (funding total + deadline).
 */
import type { CountryRow, FunnelMeta, StoryVariant, TopMatch } from "../types";
import { SlideKicker, SlideMeta } from "./_shared";

interface Props {
  variant: StoryVariant;
  funnel?: FunnelMeta;
  topMatch?: TopMatch;
  countries?: CountryRow[];
}

export const SlideLand = ({ funnel, topMatch, countries = [] }: Props) => {
  const totalSchools = countries.reduce((acc, c) => acc + c.count, 0);
  const numCountries = countries.length;

  return (
    <article className="absolute inset-0 px-7 pt-11 pb-[70px] flex flex-col bg-surface text-foreground">
      <div className="flex-1 flex flex-col min-h-0">
        <SlideKicker n="04" label="Where you can land" />
        {funnel && funnel.from > 0 && (
          <p className="flex items-baseline gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] font-medium text-[hsl(212_18%_55%)] m-0 mb-3.5">
            <span className="font-heading font-bold text-[14px] text-gold-dark tracking-[-0.01em] tabular-nums">
              {funnel.from}
            </span>
            considered <span className="text-[hsl(212_18%_55%)]">→</span>
            <span className="font-heading font-bold text-[14px] text-gold-dark tracking-[-0.01em] tabular-nums">
              {funnel.to}
            </span>
            matched <span className="text-[hsl(212_18%_55%)]">→</span>
            <span className="font-heading font-bold text-[14px] text-gold-dark tracking-[-0.01em] tabular-nums">
              {funnel.countries}
            </span>
            countries
          </p>
        )}
        <h2 className="font-heading font-bold text-[30px] tracking-[-0.03em] leading-[1.05] m-0 mb-2.5 text-balance">
          {totalSchools > 0
            ? `${totalSchools} school${totalSchools === 1 ? "" : "s"}.`
            : "Your shortlist."}
          {numCountries > 0 && (
            <>
              <br />
              {numCountries} different bet{numCountries === 1 ? "" : "s"}.
            </>
          )}
        </h2>

        {topMatch && (
          <div className="my-3.5 px-4 py-3.5 bg-canvas-soft border border-[hsl(41_22%_86%)] rounded-[10px] grid grid-cols-[1fr_auto] gap-x-3.5 gap-y-2 items-baseline">
            <p className="col-span-2 font-mono text-[9px] uppercase tracking-[0.22em] font-semibold text-gold-dark m-0 mb-0.5">
              Top match
            </p>
            <p className="font-heading font-bold text-[22px] tracking-[-0.025em] text-[hsl(var(--navy-deep))] m-0 leading-[1.05]">
              {topMatch.short}
            </p>
            <p className="font-heading font-bold text-[22px] tracking-[-0.025em] text-gold-dark tabular-nums leading-none text-right m-0">
              {topMatch.fit != null ? (
                <>
                  {topMatch.fit}
                  <span className="font-sans text-[11px] font-medium text-[hsl(212_18%_55%)] ml-px">
                    /100
                  </span>
                </>
              ) : (
                "—"
              )}
            </p>
            <p className="font-sans text-[12.5px] text-muted-foreground m-0 leading-[1.3]">
              {topMatch.name}
              {topMatch.location ? ` · ${topMatch.location}` : ""}
            </p>
            {topMatch.funding && (
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[hsl(212_18%_55%)] text-right m-0">
                {topMatch.funding}
              </p>
            )}
          </div>
        )}

        {countries.length > 0 && (
          <div className="mt-1">
            {countries.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className="grid grid-cols-[26px_1fr_auto_auto] items-center gap-2.5 py-2.5 border-t border-[hsl(41_22%_86%)] last:border-b"
              >
                <span className="text-[17px] leading-none">{c.flag}</span>
                <div>
                  <p className="font-heading font-semibold text-[13.5px] tracking-[-0.01em] text-foreground m-0 leading-[1.1]">
                    {c.name}
                  </p>
                  {c.anchors && (
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[hsl(212_18%_55%)] m-0 mt-px">
                      {c.anchors}
                    </p>
                  )}
                </div>
                {c.note && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[hsl(212_18%_55%)] px-1.5 py-0.5 border border-[hsl(41_22%_86%)] rounded-full">
                    {c.note}
                  </span>
                )}
                <span className="font-heading font-bold text-[17px] tracking-[-0.02em] text-gold-dark tabular-nums leading-none min-w-[14px] text-right">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        )}
        <SlideMeta
          items={[
            { label: "Funding", value: funnel?.funding ?? "—" },
            { label: "Top deadline", value: topMatch?.deadline ?? "—" },
          ]}
        />
      </div>
    </article>
  );
};
