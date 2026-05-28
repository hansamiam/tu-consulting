import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileDown, MapPin, GraduationCap } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { UNDERRATED_SCHOLARSHIPS, type EduLevel } from "@/data/underratedScholarships";

/**
 * Free lead-magnet page #1 from the digital-products catalog plan
 * (~/.claude/plans/cheerful-waddling-pike.md). A curated awareness
 * list of 30 international scholarships beginner applicants miss
 * because they only know Rhodes / Marshall / Fulbright.
 *
 * Why this shape (no dates, no stipend numbers): printed PDFs rot.
 * We surface name + sponsor + level + region + the "why it's
 * underrated" hook so the PDF stays useful for 12+ months. Readers
 * who want the live cycle data can look the program up themselves
 * (TopUni Discover plays the live-database role).
 *
 * Print-ready via window.print() — same flow as the strategy report.
 */

const levelLabel = (lvl: EduLevel): string =>
  lvl === "UG" ? "Undergrad"
    : lvl === "Masters" ? "Master's"
    : lvl === "PhD" ? "PhD"
    : lvl === "Postdoc" ? "Postdoc"
    : "Professional";

const UnderratedScholarships = () => {
  // Group by region for printed-page layout — readers scan by region
  // first ("what's in Europe?") more often than by level. Falls back
  // to Other for entries without a region tag.
  const groups = useMemo(() => {
    const regions: { label: string; tag: string }[] = [
      { label: "Asia",          tag: "Asia" },
      { label: "Europe",        tag: "Europe" },
      { label: "United States", tag: "US" },
      { label: "United Kingdom", tag: "UK" },
      { label: "North America (Canada)", tag: "North America" },
      { label: "Middle East & North Africa", tag: "MENA" },
      { label: "Africa",        tag: "Africa" },
      { label: "Oceania",       tag: "Oceania" },
      { label: "Multi-country / open", tag: "_other" },
    ];
    return regions
      .map((r) => ({
        ...r,
        items: UNDERRATED_SCHOLARSHIPS.filter((s) => {
          if (r.tag === "_other") {
            return !s.tags || !s.tags.some((t) =>
              ["Asia", "Europe", "US", "UK", "North America", "MENA", "Africa", "Oceania"].includes(t),
            );
          }
          return s.tags?.includes(r.tag) ?? false;
        }),
      }))
      .filter((r) => r.items.length > 0);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language="en" variant="overlay" />
      <main className="flex-1 pt-28 pb-16 px-6 print:pt-4 print:pb-4 print:px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>

          <header className="mb-10 print:mb-6 print:break-after-page">
            <div className="inline-block text-[10px] font-semibold tracking-[0.22em] uppercase text-gold-dark border-b border-gold-dark/40 pb-1 mb-3">
              Free guide · TopUni
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 print:text-3xl">
              30 international scholarships you haven't heard of.
            </h1>
            <p className="text-muted-foreground leading-relaxed print:text-sm">
              The Rhodes, Marshall, and Fulbright get all the airtime. Meanwhile,
              <strong> 30 high-value scholarships</strong> sit underused because
              their websites are buried, their eligibility rules sound scarier
              than they are, or the only people who know about them are the
              alumni. Here's the list, with the hook on why each one is
              undervalued.
            </p>
            <p className="text-xs text-muted-foreground leading-snug mt-3 print:text-[11px]">
              We deliberately don't print stipend amounts or deadline dates —
              those change every cycle. Look up the program once the name is
              in your head; the cycle info will be on the sponsor's site.
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline print:hidden"
            >
              <FileDown className="w-4 h-4" /> Save as PDF
            </button>

            <p className="hidden print:block print:mt-8 text-xs text-muted-foreground border-t pt-3">
              TopUni · topuni.org · International scholarship strategy
            </p>
          </header>

          <div className="space-y-12 print:space-y-8">
            {groups.map((region) => (
              <section
                key={region.tag}
                className="break-inside-avoid print:break-before-page"
              >
                <div className="flex items-center gap-2 mb-4 print:mb-3">
                  <MapPin className="w-4 h-4 text-gold-dark shrink-0" />
                  <h2 className="font-heading text-xl font-bold text-foreground print:text-lg">
                    {region.label}
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {region.items.length}
                  </span>
                </div>

                <ol className="space-y-4 print:space-y-3">
                  {region.items.map((s) => (
                    <li
                      key={s.name}
                      className="rounded-xl border border-border bg-card p-4 print:p-3 print:rounded-lg break-inside-avoid"
                    >
                      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                        <h3 className="font-heading font-bold text-foreground text-base print:text-sm leading-tight">
                          {s.name}
                        </h3>
                        <span className="text-[10px] text-muted-foreground tracking-wide uppercase shrink-0">
                          {s.sponsor}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2 print:mb-1.5">
                        {s.levels.map((l) => (
                          <span
                            key={l}
                            className="inline-flex items-center gap-1 rounded-full bg-gold/10 text-gold-dark px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                          >
                            <GraduationCap className="w-3 h-3" />
                            {levelLabel(l)}
                          </span>
                        ))}
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.country}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug mb-1.5 print:text-[11px]">
                        <strong className="text-foreground">Eligible:</strong>{" "}
                        {s.eligibility}
                      </p>
                      <p className="text-sm text-foreground leading-snug print:text-xs">
                        <strong className="text-gold-dark">Why underrated:</strong>{" "}
                        {s.hook}
                      </p>
                      {s.fieldFocus && (
                        <p className="text-[11px] text-muted-foreground leading-snug mt-1.5 italic print:text-[10px]">
                          Field focus: {s.fieldFocus}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          {/* Print footer */}
          <div className="mt-10 print:mt-6 flex items-center justify-between text-[10px] text-muted-foreground print:text-[9px] border-t border-border/40 pt-3 print:pt-2">
            <span>© TopUni · topuni.org · International scholarship strategy</span>
            <span>Verify each program's current cycle on the sponsor's site.</span>
          </div>

          <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center print:hidden">
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">
              Want a personalised shortlist?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The TopUni AI strategy report takes your profile and surfaces the
              5–8 scholarships you should actually apply to this cycle —
              ranked by fit and deadline, not by which ones have the prettiest
              website.
            </p>
            <Link
              to="/topuni-ai"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition"
            >
              Build my strategy report
            </Link>
          </div>
        </div>
      </main>
      <Footer language="en" variant="dark" />
    </div>
  );
};

export default UnderratedScholarships;
