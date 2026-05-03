import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Instagram, ArrowRight, Crown,
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
import { TrendingScholarships } from "@/components/TrendingScholarships";
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
    body: "Seven quick questions — your scores, your story, your dream schools. No transcript upload, no 90-minute call.",
    detail: "TopUni AI",
    path: "/topuni-ai",
  },
  {
    n: "02",
    title: "Get your strategy",
    body: "215+ scholarships ranked against your profile. Deadlines mapped to your timeline. The three highest-leverage next steps, written for you.",
    detail: "Discover",
    path: "/discover",
  },
  {
    n: "03",
    title: "Execute, don't guess",
    body: "Yale · Cambridge · Harvard alumni run live workshops every month. Country guides. Admitted essays you study while writing yours.",
    detail: "Academy",
    path: "/academy",
  },
];

const TEAM = [
  { name: "Samuel Han", title: "Founder & CEO", school: "Yale", photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", title: "Co-Founder", school: "Tsinghua · Cambridge", photo: nurzadaPhoto },
  { name: "Josh Hughes", title: "Lead Consultant", school: "Harvard", photo: joshPhoto },
  { name: "Aigul Abdoubaetova", title: "Senior Advisor", school: "Ex-OSCE Academy", photo: aigulPhoto },
];

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldRedirectToRussian()) navigate('/ru');
  }, [navigate]);

  return (
    <div className="min-h-screen relative bg-background text-foreground antialiased">
      <ScrollProgress />

      {/* ── Page-level parallax campus image — fixed in viewport, visible
          behind every section all the way to the footer. Filter neutralizes
          the autumn foliage to a grey gothic palette so it reads color-neutral. */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url(${heroImage})`,
          filter: "grayscale(1) contrast(1.05) brightness(0.96)",
        }}
        aria-hidden="true"
      />
      {/* ── Page-level cream wash on top of the campus image. This is what
          gives every section its readable cream backdrop while still letting
          the campus shimmer through. */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(180deg,
            hsl(var(--background) / 0.84) 0%,
            hsl(var(--background) / 0.90) 35%,
            hsl(var(--background) / 0.92) 70%,
            hsl(var(--background) / 0.88) 100%)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <Navigation language="en" variant="overlay" />

      <main className="relative">

        {/* HERO — pulled up behind the nav (-mt-16). Only adds the navy band
            at the very top; the page-level cream wash + campus image handle
            the rest. */}
        <section className="relative -mt-16 min-h-[86vh] flex items-center overflow-hidden text-foreground">
          {/* Navy band at the top, fades into the page-level wash */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(180deg,
                hsl(var(--primary) / 0.95) 0%,
                hsl(var(--primary) / 0.78) 5%,
                hsl(var(--primary) / 0.50) 12%,
                hsl(var(--primary) / 0.22) 20%,
                hsl(var(--primary) / 0.06) 28%,
                transparent 38%,
                transparent 100%)`,
            }}
          />

          <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center pt-20 pb-24 sm:pt-20 sm:pb-28 w-full">
            <motion.h1
              {...fadeUp(0.15)}
              className="font-heading text-[2.125rem] sm:text-6xl font-bold tracking-tight leading-[1.08] sm:leading-[1.02] mb-6 sm:mb-7 text-balance max-w-4xl mx-auto text-foreground md:text-6xl"
            >
              Find every scholarship you qualify for —<br className="hidden sm:block" />
              <span className="text-gold-dark">in 60 seconds.</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.25)}
              className="text-base sm:text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed mb-6 font-medium"
            >
              AI-built admissions strategy from Yale, Harvard, Cambridge & Tsinghua alumni. 215+ funded programs in our database — matched to your profile.
            </motion.p>

            <motion.p {...fadeUp(0.32)} className="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-foreground/75 mb-9 max-w-xl mx-auto font-medium">
               FREE  ·  NO TRANSCRIPT UPLOAD  ·  RUSSIAN & ENGLISH
            </motion.p>

            <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <Button
                variant="gold"
                size="lg"
                className="text-sm sm:text-base px-7 py-5 gap-2"
                onClick={() => navigate('/topuni-ai')}
              >
                Show me my matches <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm px-4 text-foreground/65 hover:bg-foreground/5 hover:text-foreground"
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How it works
              </Button>
            </motion.div>
          </div>
        </section>

        {/* TRENDING SCHOLARSHIPS — live social proof above the fold-2.
            Falls back to Editor's Picks while activity data accumulates.
            Always populated, never empty. */}
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <TrendingScholarships language="en" limit={4} />
          </div>
        </section>

        {/* HOW IT WORKS — vertical, editorial, not card-grid */}
        <section id="how" className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-2xl mx-auto text-center mb-14 sm:mb-16">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">How it works</p>
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12]">
                60 seconds. 3 steps. A real plan.
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
          className="py-20 sm:py-28"
          style={{ backgroundImage: `linear-gradient(180deg, transparent, hsl(var(--primary) / 0.07) 50%, transparent)` }}
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-3xl mx-auto text-center mb-14 sm:mb-16">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Team</p>
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-5">
                We've sat in the rooms you're applying to.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Yale · Harvard · Cambridge · Tsinghua — admitted, funded, and on the other side of the table.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {TEAM.map((m, i) => (
                <motion.button
                  key={m.name}
                  {...fadeUp(0.06 * i)}
                  onClick={() => navigate('/team')}
                  className="group text-center"
                >
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-5 bg-canvas mx-auto ring-1 ring-border/60 ring-offset-4 ring-offset-background shadow-sm">
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700"
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
                Meet the team <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* ACADEMY — single inline editorial moment, no specific dates or sample list */}
        <section className="py-20 sm:py-28">
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <motion.p {...fadeUp()} className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">
              Academy
            </motion.p>
            <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-5">
              Stop reading 100 Reddit threads.
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Live monthly workshops with Yale, Cambridge, and Harvard alumni founders. Admitted essays you study while writing your own. The library compounds every month — recordings yours forever.
            </motion.p>
            <motion.div {...fadeUp(0.18)}>
              <Button onClick={() => navigate('/academy')} variant="gold" className="gap-2">
                Preview Academy <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* MEMBERSHIP — top stays cream for content legibility, then a long
            gradient ramp bridges all the way into the footer's full navy.
            Content sits in the cream/light-tint half; the bottom 30% is the bridge. */}
        <section
          className="pt-20 sm:pt-28 pb-32 sm:pb-40"
          style={{
            backgroundImage: `linear-gradient(180deg,
              transparent 0%,
              transparent 30%,
              hsl(var(--primary) / 0.06) 55%,
              hsl(var(--primary) / 0.45) 85%,
              hsl(var(--primary)) 100%)`,
          }}
        >
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <motion.div {...fadeUp()} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold-dark text-[11px] font-medium tracking-[0.18em] uppercase mb-7">
              <Crown className="h-3.5 w-3.5" /> Founding Membership · 100 spots
            </motion.div>
            <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.1] mb-5">
              Lock in $19/month for life.
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg mb-4 max-w-xl mx-auto leading-relaxed">
              TopUni AI · Discover · Academy · monthly live workshops. Founding price never changes for our first 100 members. Public price moves to $39/month when the cohort fills.
            </motion.p>
            <motion.p {...fadeUp(0.14)} className="text-xs text-muted-foreground/70 mb-9 max-w-md mx-auto">
              30-day money-back guarantee · Cancel anytime · Stripe secure
            </motion.p>
            <motion.div {...fadeUp(0.2)} className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="gold"
                size="lg"
                className="text-base px-8 py-6 gap-2"
                onClick={() => navigate('/pricing')}
              >
                Claim my founding spot <ArrowRight className="h-4 w-4" />
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

      {/* FOOTER — solid navy now that the membership section gradients all
          the way into full primary at its bottom edge. */}
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
    </div>
  );
};

export default Index;
