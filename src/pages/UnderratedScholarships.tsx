import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileDown, MapPin, GraduationCap, Quote, Target, Compass } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import PreviewBanner from "@/components/PreviewBanner";
import {
  UNDERRATED_SCHOLARSHIPS,
  TIER_LOOKUP,
  SIXTY_DAY_PICKS,
  REGION_STRATEGY,
  type EduLevel,
  type CompetitivenessTier,
} from "@/data/underratedScholarships";

const TIER_STYLES: Record<CompetitivenessTier, { bg: string; text: string; label: string }> = {
  S: { bg: "bg-rose-100",   text: "text-rose-900",   label: "S · <5%" },
  A: { bg: "bg-amber-100",  text: "text-amber-900",  label: "A · 5–15%" },
  B: { bg: "bg-sky-100",    text: "text-sky-900",    label: "B · 15–35%" },
  C: { bg: "bg-emerald-100", text: "text-emerald-900", label: "C · 35%+" },
};

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
      <PreviewBanner />
      <main className="flex-1 pt-28 pb-16 px-6 print:pt-4 print:pb-4 print:px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>

          <header className="mb-10 print:mb-6 print:break-after-page">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-gold-dark/40" aria-hidden />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold-dark">
                TopUni · Free Field Guide
              </p>
              <span className="h-px flex-1 bg-gold-dark/40" aria-hidden />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 print:text-4xl leading-[1.05]">
              30 international scholarships you haven't heard of.
            </h1>
            <p className="font-heading italic text-lg text-muted-foreground leading-relaxed max-w-xl print:text-base">
              The Rhodes and Marshall and Fulbright get the airtime.
              Meanwhile 30 high-value programs sit underused.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Programs</p>
                <p className="font-heading font-bold text-foreground text-lg">30</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Regions</p>
                <p className="font-heading font-bold text-foreground text-lg">9</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Tiers</p>
                <p className="font-heading font-bold text-foreground text-lg">S · A · B · C</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Price</p>
                <p className="font-heading font-bold text-foreground text-lg">Free</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:underline print:hidden"
            >
              <FileDown className="w-4 h-4" /> Save as PDF
            </button>

            <p className="hidden print:block print:mt-10 text-[10px] text-muted-foreground border-t pt-3 tracking-wide">
              © TopUni · topuni.org · International scholarship strategy · 2026 edition
            </p>
          </header>

          {/* Field-note opener — first-person framing. Matches the
              LF Field Guide series so the catalogue reads as a coherent
              voice across both products. */}
          <section className="mb-12 print:mb-8 break-inside-avoid print:break-before-page">
            <div className="flex items-center gap-2 mb-4">
              <Quote className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Why this list exists
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4 print:text-xl">
              I almost didn't apply to my own scholarship.
            </h2>
            <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 leading-relaxed print:text-sm print:leading-snug">
              <p>
                Most of the programs on this list, I'd never heard of in high
                school. I went hunting for "scholarships for international
                students" and got six pages of the same five names. I applied
                to those, got rejected, and almost stopped — until a friend
                three years older sent me a Google Doc titled <em>"actual
                scholarships nobody applies to."</em>
              </p>
              <p>
                That doc became this list. The programs here aren't secret —
                they're just buried three clicks deep in government websites or
                hidden behind eligibility filters that sound scarier than they
                are. The Aga Khan one isn't only for Ismaili Muslims. The
                Schwarzman is acceptance-rate easier than half the schools
                you've heard of. KAUST gives full STEM rides on a Red Sea
                campus and almost nobody outside the region applies.
              </p>
              <p>
                Here's the list. The hook on each one. The tier (so you can
                triage by reachability), the eligibility, the field focus. I've
                added a "60-day picks" section in case you're paralysed by 30
                options, and per-region strategy notes for the cycle-specific
                quirks (Fulbright + Chevening interaction; MEXT's two parallel
                tracks; Mastercard's partner-uni model).
              </p>
              <p>
                <em>Now you know.</em>
              </p>
            </div>
          </section>

          {/* Tier legend — sets up the colour coding before it appears
              on each card below. Triage layer is the moat: anyone can
              list scholarships, only field experience tells you which
              ones are actually reachable. */}
          <section className="mb-10 print:mb-6 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                The triage layer
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              Pick your fight before you write the essay.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              Every program below is tagged S, A, B, or C — best-effort triage
              based on published acceptance rates where available, field
              consensus where not. Spend essay time where the math is on your
              side.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              {(["S", "A", "B", "C"] as CompetitivenessTier[]).map((t) => {
                const styles = TIER_STYLES[t];
                const blurb =
                  t === "S" ? "Rhodes-tier brutal. Top-1% profile required." :
                  t === "A" ? "Highly competitive. Top-5% profile, strong fit story." :
                  t === "B" ? "Reachable with a strong profile + clear narrative." :
                              "Underused. Apply if you qualify — math favours you.";
                return (
                  <div key={t} className={`rounded-xl border border-border ${styles.bg} p-3 print:rounded-lg print:p-2`}>
                    <p className={`font-heading font-bold text-base ${styles.text} print:text-sm`}>{styles.label}</p>
                    <p className={`text-[11px] ${styles.text}/80 leading-snug mt-1 print:text-[10px]`}>{blurb}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 60-day picks — paralysis breaker. Five programs picked
              for reachability + broad eligibility + high-coverage. */}
          <section className="mb-12 print:mb-8 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                If you only have 60 days
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              Five picks if you can't apply to thirty.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-5 print:text-sm print:mb-3 print:leading-snug">
              These five balance reachability (mostly Tier B/C), broad
              international eligibility, and high coverage (full-ride or close).
              The list of one if you can only apply to one is the first; add
              the rest as bandwidth allows.
            </p>
            <ol className="space-y-3 print:space-y-2">
              {SIXTY_DAY_PICKS.map((name, i) => {
                const s = UNDERRATED_SCHOLARSHIPS.find((x) => x.name === name);
                if (!s) return null;
                return (
                  <li key={name} className="flex items-start gap-3 rounded-lg border border-gold-dark/30 bg-gold/5 px-4 py-3 print:py-2 print:px-3 break-inside-avoid">
                    <span className="font-heading font-bold text-gold-dark tabular-nums w-6 shrink-0 text-base print:text-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-heading font-bold text-foreground text-base print:text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground tracking-wide uppercase mt-0.5">{s.country} · {s.levels.map((l) => l).join(" / ")}</p>
                      <p className="text-sm text-foreground leading-snug mt-1 print:text-xs print:mt-0.5">{s.hook}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

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
                  {region.items.map((s) => {
                    const tier = TIER_LOOKUP[s.name];
                    const tierStyle = tier ? TIER_STYLES[tier] : null;
                    return (
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
                          {tierStyle && (
                            <span className={`inline-flex items-center gap-1 rounded-full ${tierStyle.bg} ${tierStyle.text} px-2 py-0.5 text-[10px] font-bold tracking-wide`}>
                              {tierStyle.label}
                            </span>
                          )}
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
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>

          {/* Region strategy — the per-region cycle quirks. */}
          <section className="mt-14 print:mt-0 print:break-before-page">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Strategy by region
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-3 print:text-xl">
              Cycle-specific quirks you'll only learn the hard way.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 print:text-sm print:mb-4 print:leading-snug">
              Each region has interaction effects between scholarships that
              ChatGPT can't tell you — Fulbright commission rules vary 10× by
              country, MEXT has two parallel tracks, Mastercard goes through
              partner-uni applications. These are the patterns.
            </p>
            <div className="space-y-4 print:space-y-3">
              {REGION_STRATEGY.map((r) => (
                <div key={r.region} className="rounded-xl border border-border p-4 print:p-3 print:rounded-lg break-inside-avoid">
                  <p className="font-heading font-bold text-foreground text-sm print:text-xs mb-1.5">
                    {r.region}
                  </p>
                  <p className="text-sm text-foreground leading-snug print:text-xs">
                    {r.note}
                  </p>
                </div>
              ))}
            </div>
          </section>

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
