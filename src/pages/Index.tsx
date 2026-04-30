import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Instagram, ArrowRight, Sparkles, Crown, Check,
} from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import joshPhoto from "@/assets/josh.jpg";
import aigulPhoto from "@/assets/aigul.jpeg";
import Navigation from "@/components/Navigation";
import { shouldRedirectToRussian } from "@/utils/languageDetection";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
});

const STEPS = [
  {
    n: "01",
    title: "Tell us about you",
    body: "A two-minute intake — your scores, your story, your shortlist of dream schools.",
    detail: "TopUni AI",
    path: "/topuni-ai",
  },
  {
    n: "02",
    title: "Get your strategy",
    body: "Target list, timeline, action items, scholarship matches — generated for your profile.",
    detail: "Discover",
    path: "/discover",
  },
  {
    n: "03",
    title: "Execute with the playbook",
    body: "Workshops, country guides, real admitted essays. New material every week from May 10.",
    detail: "Academy",
    path: "/academy",
  },
];

const TEAM = [
  { name: "Samuel Han", title: "Founder & CEO", school: "Yale", photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", title: "Co-Founder", school: "Schwarzman · Cambridge", photo: nurzadaPhoto },
  { name: "Josh Hughes", title: "Lead Consultant", school: "Harvard", photo: joshPhoto },
  { name: "Aigul Abdoubaetova", title: "Senior Advisor", school: "Ex-OSCE Academy", photo: aigulPhoto },
];

const PROMISES = [
  "Your plan, not a template",
  "Real consultants — Yale, Harvard, Cambridge, Tsinghua",
  "Scholarships matched to your verified profile",
  "Built in Bishkek. Bilingual from day one.",
];

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldRedirectToRussian()) navigate('/ru');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ScrollProgress />
      <Navigation language="en" />

      {/* ────────────────────────────────────────────────────────────
          ONE CONTINUOUS CANVAS — sections flow without hard breaks.
          Background is the same parchment throughout; we only vary
          via subtle inner cards, hairlines, and generous space.
         ──────────────────────────────────────────────────────────── */}
      <main className="relative">

        {/* HERO */}
        <section
          className="relative pt-12 sm:pt-20 pb-24 sm:pb-32 overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(180deg, hsl(var(--canvas-soft)) 0%, hsl(var(--background)) 100%), radial-gradient(ellipse 70% 50% at 80% 20%, hsl(var(--gold) / 0.06), transparent 70%)`,
          }}
        >
          {/* faint photo wash on right */}
          <div
            className="hidden md:block absolute right-0 top-0 bottom-0 w-1/2 opacity-[0.18] pointer-events-none bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroImage})`,
              maskImage: "linear-gradient(90deg, transparent 0%, black 60%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 60%)",
            }}
          />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <motion.p
              {...fadeUp(0.05)}
              className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-gold-dark font-medium mb-6"
            >
              <span className="inline-block w-6 h-px bg-gold-dark/60 align-middle mr-2.5" />
              Top Uni Consulting · Est. 2024
            </motion.p>

            <motion.h1
              {...fadeUp(0.15)}
              className="font-heading text-[2.6rem] sm:text-6xl md:text-[4.5rem] lg:text-[5.25rem] font-bold tracking-tight leading-[1.02] mb-7 max-w-5xl"
            >
              Your <span className="text-gold-dark italic font-medium">admission strategy</span>,
              <br className="hidden sm:block" /> built in minutes.
            </motion.h1>

            <motion.p
              {...fadeUp(0.25)}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10"
            >
              A two-minute intake. A real plan. Funding pathways, target schools,
              and the playbook to actually get in — from consultants who've been there.
            </motion.p>

            <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center gap-3 mb-12">
              <Button
                variant="gold"
                size="lg"
                className="text-base px-8 py-6 gap-2"
                onClick={() => navigate('/topuni-ai')}
              >
                <Sparkles className="h-4 w-4" /> Build my plan
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-base px-6 py-6 gap-2 text-foreground hover:bg-secondary"
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How it works <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.p
              {...fadeUp(0.45)}
              className="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-primary/55"
            >
              With insights from Yale · Harvard · Cambridge · Tsinghua alumni · Available in Russian & English
            </motion.p>
          </div>
        </section>

        {/* hairline */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8"><div className="h-px bg-border/70" /></div>

        {/* PROMISE STRIP — flows directly from hero */}
        <section className="py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-8">
            {PROMISES.map((p, i) => (
              <motion.div
                key={p}
                {...fadeUp(0.05 * i)}
                className="flex items-start gap-2.5"
              >
                <Check className="h-4 w-4 text-gold-dark mt-1 shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-foreground/85 leading-relaxed">{p}</span>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-5 sm:px-8"><div className="h-px bg-border/70" /></div>

        {/* HOW IT WORKS — vertical, editorial, not card-grid */}
        <section id="how" className="py-24 sm:py-32">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-2xl mb-16 sm:mb-20">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">How it works</p>
              <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
                Three steps. <span className="text-gold-dark italic font-medium">One outcome.</span>
              </h2>
            </motion.div>

            <div className="space-y-px">
              {STEPS.map((step, i) => (
                <motion.button
                  key={step.n}
                  {...fadeUp(0.08 * i)}
                  onClick={() => navigate(step.path)}
                  className="group w-full text-left grid grid-cols-12 gap-4 sm:gap-8 items-baseline py-7 sm:py-9 border-t border-border/70 hover:bg-canvas-soft/60 transition-colors px-2 sm:px-4 -mx-2 sm:-mx-4 rounded-md"
                >
                  <div className="col-span-2 sm:col-span-1 font-mono text-sm sm:text-base text-gold-dark">{step.n}</div>
                  <div className="col-span-10 sm:col-span-7">
                    <h3 className="font-heading text-xl sm:text-2xl font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px] sm:text-base max-w-xl">
                      {step.body}
                    </p>
                  </div>
                  <div className="hidden sm:flex col-span-4 items-baseline justify-end gap-2 text-sm">
                    <span className="text-primary/70 font-medium">{step.detail}</span>
                    <ArrowRight className="h-4 w-4 text-gold-dark group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              ))}
              <div className="border-t border-border/70" />
            </div>
          </div>
        </section>

        {/* TEAM — subtle background shift, no hard block */}
        <section
          className="py-24 sm:py-32"
          style={{ backgroundImage: `linear-gradient(180deg, hsl(var(--background)), hsl(var(--canvas-soft)) 50%, hsl(var(--background)))` }}
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-3xl mb-14 sm:mb-16">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">The people behind it</p>
              <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
                Consultants who've <span className="text-gold-dark italic font-medium">actually been there.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Yale, Harvard, Cambridge, Tsinghua, Schwarzman. Not a sales team —
                the same people who'll read your essays.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {TEAM.map((m, i) => (
                <motion.button
                  key={m.name}
                  {...fadeUp(0.06 * i)}
                  onClick={() => navigate('/team')}
                  className="group text-left"
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-md mb-4 bg-canvas">
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  </div>
                  <p className="font-heading font-semibold text-foreground text-base leading-tight">{m.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{m.title}</p>
                  <p className="text-xs text-gold-dark mt-1.5 font-medium tracking-wide">{m.school}</p>
                </motion.button>
              ))}
            </div>

            <motion.div {...fadeUp(0.3)} className="mt-12">
              <button
                onClick={() => navigate('/team')}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-gold-dark transition-colors"
              >
                Meet the full team <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* ACADEMY — single inline editorial moment */}
        <section className="py-24 sm:py-32">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <motion.div {...fadeUp()} className="lg:col-span-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">
                  Academy · launching May 10
                </p>
                <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
                  The playbook, <span className="text-gold-dark italic font-medium">unfiltered.</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Workshops, country playbooks, real winning essays, and the tactics
                  our consultants actually use. New every week.
                </p>
                <Button onClick={() => navigate('/academy')} variant="gold" className="gap-2">
                  Preview Academy <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>

              <motion.div {...fadeUp(0.15)} className="lg:col-span-7">
                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {[
                    { tag: "Essay", t: "Yale supplemental essays — 3 admitted samples, annotated" },
                    { tag: "Teardown", t: "Schwarzman application — what actually got me in" },
                    { tag: "Live · May 17", t: "Workshop: building your activities list" },
                    { tag: "Country", t: "USA need-blind aid for international students" },
                  ].map((item) => (
                    <li key={item.t} className="py-5 flex items-start gap-5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-gold-dark font-medium pt-1 w-24 shrink-0">
                        {item.tag}
                      </span>
                      <span className="text-foreground/90 leading-relaxed">{item.t}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* MEMBERSHIP — closing crescendo */}
        <section
          className="py-24 sm:py-32"
          style={{ backgroundImage: `linear-gradient(180deg, hsl(var(--background)), hsl(var(--canvas-soft)))` }}
        >
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <motion.div {...fadeUp()} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold-dark text-[11px] font-medium tracking-[0.18em] uppercase mb-7">
              <Crown className="h-3.5 w-3.5" /> Founding Membership
            </motion.div>
            <motion.h2 {...fadeUp(0.05)} className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-[1.08] mb-5">
              One membership. <span className="text-gold-dark italic font-medium">Everything inside.</span>
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              TopUni AI, Discover, and Academy — locked at the founding price for our first cohort.
            </motion.p>
            <motion.div {...fadeUp(0.2)} className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="gold"
                size="lg"
                className="text-base px-8 py-6 gap-2"
                onClick={() => navigate('/pricing')}
              >
                See Membership <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-base px-6 py-6 text-foreground hover:bg-secondary"
                onClick={() => navigate('/topuni-ai')}
              >
                Try TopUni AI free
              </Button>
            </motion.div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col items-center gap-6">
            <a
              href="https://www.instagram.com/top_uni_consulting/?g=5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-light transition-colors p-2"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={26} strokeWidth={1.5} />
            </a>
            <Footer language="en" variant="dark" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
