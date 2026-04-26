import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Editorial, dense, YC-grade. Four sections only. No fluff.
const WhyTU = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero — editorial, asymmetric, soft layered backdrop */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-hero-soft" aria-hidden />
        <div className="absolute inset-0 bg-dot-grid opacity-60" aria-hidden />
        <div
          className="absolute inset-x-0 top-0 h-[420px] opacity-[0.08] bg-cover bg-center"
          style={{ backgroundImage: "url('/src/assets/topuni-bg.jpg')" }}
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-transparent via-background/60 to-background" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-10 pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            <div className="lg:col-span-8">
              <p className="label-mono text-accent mb-6">
                Why Top Uni
              </p>
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight">
                A shortlist, a plan, and an expert
                <br />
                <span className="text-accent">when you need one.</span>
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                Built by admissions consultants from Yale, Harvard, Cambridge and Tsinghua.
                Used by students applying from Central Asia and beyond.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="gold" size="lg" onClick={() => navigate("/discover")} className="gap-2">
                  See scholarships <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate("/offerings")}>
                  Consulting
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The four differences — single dense block, numbered */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-14">
            <div className="lg:col-span-5">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-4">
                01 — What we do
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                A scholarship engine, plus consulting when stakes go up.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-10">
              <p className="text-base text-muted-foreground leading-relaxed">
                Self-serve tools handle the search, fit scoring, and prep. Optional 1:1
                support kicks in for essays, interviews, and final-round decisions.
                You only pay for what you use.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              {
                n: "01",
                t: "Ranked, not listed",
                b: "Scholarships scored against your grades, budget, country, and timeline.",
              },
              {
                n: "02",
                t: "Hard cutoffs surfaced",
                b: "IELTS, GPA, SAT thresholds shown upfront — so you don't waste a cycle.",
              },
              {
                n: "03",
                t: "Cross-border by default",
                b: "Built around Central Asian and emerging-market applicants, not US-only assumptions.",
              },
              {
                n: "04",
                t: "Experts on demand",
                b: "Consultants from Yale, Harvard, Cambridge, Tsinghua — booked à la carte, not bundled.",
              },
            ].map((d) => (
              <div key={d.n} className="bg-background p-7 lg:p-9 hover:bg-muted/30 transition-colors">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-mono text-xs text-accent">{d.n}</span>
                  <h3 className="font-heading font-semibold text-lg tracking-tight">{d.t}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility — inline editorial stats */}
      <section className="border-y border-border bg-muted/20 py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-4">
                02 — Track record
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Numbers, not adjectives.
              </h2>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                We don't promise admission. We help you target schools where your
                application is competitive.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { k: "$500K+", v: "Scholarships secured by students we've advised" },
                { k: "Yale · Harvard · Cambridge · Tsinghua", v: "Where our team studied" },
                { k: "EN · RU", v: "Bilingual support" },
                { k: "UG · Grad · Scholarship · Summer", v: "Application types covered" },
              ].map((s) => (
                <div key={s.v} className="border-l-2 border-accent/40 pl-5">
                  <div className="font-heading font-bold text-xl lg:text-2xl tracking-tight leading-tight">
                    {s.k}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* You don't need a perfect profile — single statement */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-6">
            03 — If your profile isn't textbook
          </p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-6">
            Top scholarships aren't reserved for <span className="text-accent">flawless transcripts.</span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-10">
            Uneven grades, financial constraints, gap years, unusual backgrounds — these are
            common in the profiles that win. The work is choosing the right targets and
            framing your story clearly.
          </p>
          <Button variant="gold" size="lg" onClick={() => navigate("/discover")} className="gap-2">
            See your matches <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Final CTA — minimal */}
      <section className="border-t border-border bg-primary py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-primary-foreground tracking-tight mb-4">
            Start with the shortlist.
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Free to use. Add 1:1 support only if you want it.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover")} className="gap-2">
              See scholarships <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/offerings")}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Consulting
            </Button>
          </div>
        </div>
      </section>

      <Footer language="en" />
    </div>
  );
};

export default WhyTU;
