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

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldRedirectToRussian()) navigate('/ru');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ScrollProgress />
      <Navigation language="en" variant="overlay" />

      <main className="relative">

        {/* HERO — pulled up behind the nav (-mt-16) so the navy gradient at the
            top of the section sits BEHIND the (transparent) nav strip. */}
        <section className="relative -mt-16 min-h-[86vh] flex items-center overflow-hidden bg-background text-foreground">
          {/* Campus image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          {/* Wash: full navy at the very top (covers the nav strip area),
              fading through cream wash. The 0–10% navy zone now sits behind
              the transparent nav, so the navy gradient extends through the
              top-left "Top Uni" logo and the entire ribbon. Cream wash is
              lighter than before so the campus image shimmers through —
              subtle texture without dominating. */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(180deg,
                hsl(var(--primary) / 0.95) 0%,
                hsl(var(--primary) / 0.78) 5%,
                hsl(var(--primary) / 0.42) 12%,
                hsl(var(--primary) / 0.15) 22%,
                hsl(var(--background) / 0.97) 30%,
                hsl(var(--background) / 0.99) 50%,
                hsl(var(--background) / 0.97) 70%,
                hsl(var(--background) / 0.92) 85%,
                hsl(var(--background) / 1.00) 100%)`,
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center pt-16 pb-24 sm:pt-20 sm:pb-28 w-full">
            <motion.h1
              {...fadeUp(0.15)}
              className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.02] mb-7 text-balance max-w-4xl mx-auto text-foreground"
            >
              Your <span className="text-gold-dark">admission strategy</span>
              <br className="hidden sm:block" /> in minutes.
            </motion.h1>

            <motion.p
              {...fadeUp(0.25)}
              className="text-lg sm:text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed mb-6 font-medium"
            >
              A two-minute intake builds your plan. Then discover the funding, and learn the playbook.
            </motion.p>

            <motion.p {...fadeUp(0.32)} className="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-foreground/75 mb-9 max-w-xl mx-auto font-medium">
              With insights from Yale, Harvard, Cambridge & Tsinghua alumni · Available in Russian & English
            </motion.p>

            <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <Button
                variant="gold"
                size="lg"
                className="text-sm sm:text-base px-7 py-5 gap-2"
                onClick={() => navigate('/topuni-ai')}
              >
                Get my admissions plan <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm px-4 text-foreground/65 hover:bg-foreground/5 hover:text-foreground"
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Scroll
              </Button>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS — vertical, editorial, not card-grid */}
        <section id="how" className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-2xl mx-auto text-center mb-14 sm:mb-16">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">How it works</p>
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12]">
                Three steps. One plan.
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
          style={{ backgroundImage: `linear-gradient(180deg, hsl(var(--background)), hsl(var(--primary) / 0.055) 50%, hsl(var(--background)))` }}
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-3xl mx-auto text-center mb-14 sm:mb-16">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Team</p>
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-5">
                Built with alumni insight.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Yale, Harvard, Cambridge, Tsinghua, Schwarzman — concise guidance from people who know the process.
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
                Meet the full team <ArrowRight className="h-4 w-4" />
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
              The application playbook.
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-xl mx-auto">
              Workshops with our founders, country guides, and admitted essays. Recordings live in your library so you can return to them.
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
              hsl(var(--background)) 0%,
              hsl(var(--background)) 30%,
              hsl(var(--primary) / 0.05) 55%,
              hsl(var(--primary) / 0.30) 85%,
              hsl(var(--primary)) 100%)`,
          }}
        >
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <motion.div {...fadeUp()} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold-dark text-[11px] font-medium tracking-[0.18em] uppercase mb-7">
              <Crown className="h-3.5 w-3.5" /> Founding Membership
            </motion.div>
            <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.1] mb-5">
              Become a founding member.
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
  );
};

export default Index;
