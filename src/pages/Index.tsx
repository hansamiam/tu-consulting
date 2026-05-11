import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import joshPhoto from "@/assets/josh.jpg";
import aigulPhoto from "@/assets/aigul.jpeg";
import Navigation from "@/components/Navigation";
import { shouldRedirectToRussian } from "@/utils/languageDetection";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Footer } from "@/components/Footer";
import { OutcomesBar } from "@/components/OutcomesBar";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
});

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

          {/* pt-36 on mobile pushes the H1 well below the navy nav band
              (per user — "Mobile your tailored admission but lower
              release"; the hero text was sitting too high under the
              nav). pb shrinks to compensate so the section still fits
              in 86vh without crowding the next section. Desktop layout
              is unchanged. */}
          <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center pt-36 pb-12 sm:pt-20 sm:pb-28 w-full">
            <motion.h1
              {...fadeUp(0.15)}
              className="font-heading text-[2.125rem] sm:text-6xl font-bold tracking-tight leading-[1.08] sm:leading-[1.02] mb-6 sm:mb-7 text-balance max-w-4xl mx-auto text-foreground md:text-6xl"
            >
              Your tailored <span className="text-gold-dark">scholarship strategy</span>
              <br className="hidden sm:block" /> in minutes.
            </motion.h1>

            <motion.p
              {...fadeUp(0.25)}
              className="text-base sm:text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed mb-6 font-medium"
            >
              With insights from Yale, Harvard, Cambridge & Tsinghua alumni
            </motion.p>

            <motion.p {...fadeUp(0.32)} className="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-foreground/75 mb-9 max-w-xl mx-auto font-medium">
               · AVAILABLE IN RUSSIAN & ENGLISH
            </motion.p>

            <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <Button
                variant="gold"
                size="lg"
                className="text-sm sm:text-base px-7 py-5 gap-2"
                onClick={() => navigate('/topuni-ai')}
              >
                Get my free strategy <ArrowRight className="h-4 w-4" />
              </Button>
              {/* Secondary path for users who don't want to fill out a
                  form first. Discover lets them poke the database;
                  they can run the wizard later. */}
              <Button
                variant="ghost"
                size="lg"
                className="text-sm sm:text-base px-5 text-foreground/75 hover:bg-foreground/5 hover:text-foreground gap-2"
                onClick={() => navigate('/discover')}
              >
                Discover scholarships
              </Button>
            </motion.div>
          </div>
        </section>

        {/* CONSOLIDATED — one section that combines worldview + how-it-works
            + before/after into a single tight narrative. Earlier these were
            four separate sections that all said variations of "we exist
            because admissions is broken; here are 5 things we do better."
            Round 10 collapse: lead with the shift (the user's status quo
            vs ours), follow with one editorial line on what makes us
            different. The product takes 60 seconds; the page should too. */}
        <section id="how" className="py-20 sm:py-28">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-2xl mx-auto text-center mb-12 sm:mb-14">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">The shift</p>
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12]">
                From scattered tabs to a ranked plan.
              </h2>
              {/* Auto-hides until at least one TopUni member logs an
                  accepted award. Once outcomes flow, this becomes a
                  compounding trust signal right above the section. */}
              <div className="mt-6">
                <OutcomesBar variant="card" language="en" />
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 mb-12 sm:mb-16">
              <motion.div
                {...fadeUp(0.05)}
                className="rounded-2xl border border-border bg-card p-6 sm:p-7"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">
                  Without TopUni
                </p>
                <ul className="space-y-3">
                  {[
                    "Listing sites that show every scholarship to every visitor",
                    "Random Reddit advice",
                    "Missed deadlines",
                    "Unsure if you actually qualify for any of them",
                    "No clear essay strategy",
                  ].map((line, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-foreground/75 leading-snug">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                {...fadeUp(0.1)}
                className="relative rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.07] via-card to-card p-6 sm:p-7 overflow-hidden"
              >
                <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-gold-dark via-gold to-gold-dark" />
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold mb-4">
                  With TopUni
                </p>
                <ul className="space-y-3">
                  {[
                    "Ranked opportunities tailored to your profile",
                    "Why-it-fits notes for each scholarship",
                    "Funding filters that actually narrow the universe",
                    "Deadline plan that emails you before each one",
                    "Live monthly workshops with admitted founders",
                  ].map((line, i) => (
                    <li key={i} className="flex items-start gap-3 text-[15px] text-foreground leading-snug">
                      <span className="mt-1 text-gold-dark shrink-0">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* One-line worldview anchor — closes the section with WHY this
                exists, after showing WHAT it does. Keeps the section
                focused without adding a 2nd visual block. */}
            <motion.p
              {...fadeUp(0.18)}
              className="font-sans text-lg sm:text-xl text-foreground/85 leading-[1.5] tracking-[-0.005em] text-center text-balance max-w-3xl mx-auto"
            >
              Elite admissions consulting costs thousands. Generic scholarship listing sites bury you in opportunities you don't qualify for.
              {" "}
              <span className="text-gold-dark font-semibold">TopUni is the software in between</span> — personalized strategy, opportunities ranked against your actual profile, and live execution support, at a fraction of the cost.
            </motion.p>
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

        {/* Academy section retired round 10 — Academy lives at /academy
            for users who want it; the home page no longer has a dedicated
            Academy block. Pricing section below covers the full toolkit. */}

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
              <Crown className="h-3.5 w-3.5" /> Early access · first 50 lock for life
            </motion.div>
            <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.1] mb-5">
              The full toolkit, $39/month.
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg mb-9 max-w-xl mx-auto leading-relaxed">
              TopUni AI · Discover · Academy · monthly live workshops with the alumni team. Early-access discount applies automatically; promo codes accepted at checkout.
            </motion.p>
            <motion.div {...fadeUp(0.2)} className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="gold"
                size="lg"
                className="text-base px-8 py-6 gap-2"
                onClick={() => navigate('/pricing')}
              >
                Claim my early-access spot <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>

      </main>

      {/* Footer — Instagram chip + nav now baked into the Footer
          component itself (2026-05-10), so the home page no longer
          wraps it in a custom navy outer with a duplicated Instagram
          icon. The Footer's own bg-primary handles the navy band. */}
      <Footer language="en" variant="dark" />
      </div>
    </div>
  );
};

export default Index;
