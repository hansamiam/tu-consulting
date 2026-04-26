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

      {/* Hero — editorial, asymmetric */}
      <section className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            <div className="lg:col-span-8">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-6">
                Why Top Uni
              </p>
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight">
                Most students do not need <span className="text-muted-foreground/50">more lists.</span>
                <br />
                They need <span className="text-accent">a strategy.</span>
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                Where to apply, which scholarships are realistic, and how to make
                your profile stronger. That's the real question.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="gold" size="lg" onClick={() => navigate("/discover")} className="gap-2">
                  Get your plan <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate("/discover")}>
                  Browse scholarships
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
                01 — The difference
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Not a directory. Not a chatbot. A decision engine with humans behind it.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-10">
              <p className="text-base text-muted-foreground leading-relaxed">
                Generic databases give you everything. Generic AI gives you anything.
                Top Uni gives you the four things you can actually use:
                a ranked shortlist, a realistic scholarship plan, a sequence to follow,
                and an expert when the stakes go up.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              {
                n: "01",
                t: "Strategy before search",
                b: "Ranked by your grades, budget, country, and timeline — not alphabet order.",
              },
              {
                n: "02",
                t: "AI tools, human judgment",
                b: "Structured data and recommendations, with expert review where the call matters.",
              },
              {
                n: "03",
                t: "Built for cross-border applicants",
                b: "Designed around Central Asian and emerging-market realities, not U.S.-only assumptions.",
              },
              {
                n: "04",
                t: "Premium without the markup",
                b: "Useful tools first, expert support when needed, no consulting overhead baked in.",
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
                02 — Credibility
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Real experience. Not recycled advice.
              </h2>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                We don't promise admission. We help you build the strongest, most
                realistic case for the targets that actually fit you.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { k: "$500K+", v: "Scholarships secured by students we've advised" },
                { k: "Yale · Harvard · Cambridge · Tsinghua", v: "Where our team has studied and graduated" },
                { k: "EN · RU", v: "Bilingual support for Central Asian students" },
                { k: "UG · Grad · Summer · Scholarship", v: "Application types we've helped students win" },
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
            03 — For students who aren't perfect on paper
          </p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-6">
            Strong applications come from <span className="text-accent">non-linear stories.</span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-10">
            Top universities and scholarships are competitive — but not reserved for
            flawless transcripts. Uneven grades, financial constraints, unusual backgrounds,
            learning differences, gap years. The real work is choosing the right targets and
            telling your story without apology.
          </p>
          <Button variant="gold" size="lg" onClick={() => navigate("/discover")} className="gap-2">
            Find your best-fit options <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Final CTA — minimal */}
      <section className="border-t border-border bg-primary py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-primary-foreground tracking-tight mb-4">
            Ready to stop guessing?
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Build your shortlist in minutes. Add expert support only when you need it.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover")} className="gap-2">
              Get your plan <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/offerings")}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              See consulting
            </Button>
          </div>
        </div>
      </section>

      <Footer language="en" />
    </div>
  );
};

export default WhyTU;
