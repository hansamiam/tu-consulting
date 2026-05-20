import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-campus.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import joshPhoto from "@/assets/josh.jpg";
import aigulPhoto from "@/assets/aigul.jpeg";
import usFlag from "@/assets/flags/us.svg";
import caFlag from "@/assets/flags/ca.svg";
import gbFlag from "@/assets/flags/gb.svg";
import cnFlag from "@/assets/flags/cn.svg";
import krFlag from "@/assets/flags/kr.svg";
import Navigation from "@/components/Navigation";
import { shouldRedirectToRussian } from "@/utils/languageDetection";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Footer } from "@/components/Footer";
import { OutcomesBar } from "@/components/OutcomesBar";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
});

// Home-page team grid — Samuel's title intentionally shorter than on
// /team (just "Founder", no "Founder & CEO") so the home cards stay
// scannable.
const TEAM = [
  { name: "Samuel Han", title: "Founder", school: "Yale", photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", title: "Co-Founder", school: "Tsinghua · Cambridge", photo: nurzadaPhoto },
  { name: "Josh Hughes", title: "Lead Consultant", school: "Harvard", photo: joshPhoto },
  { name: "Aigul Abdoubaetova", title: "Senior Advisor", school: "U of Oregon", photo: aigulPhoto },
];

const Index = () => {
  const navigate = useNavigate();
  // Live catalog counter — pulled from Supabase on mount. Falls back
  // gracefully to a static line if the count call fails. Read scope
  // is anon-safe (head:true count uses public RLS).
  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    if (shouldRedirectToRussian()) navigate('/ru');
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { count, error } = await supabase
        .from("scholarships")
        .select("scholarship_id", { count: "exact", head: true })
        .in("lifecycle_status", ["active", "reopens_annually"])
        .gte("application_deadline", todayIso);
      if (!error && typeof count === "number") setLiveCount(count);
    })();
  }, []);

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

            <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center justify-center gap-3 mb-5">
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

            {/* Live-catalog freshness line retired 2026-05-20 per user
                direction — the count was reading too low for the claim
                ("live database of 10") and undermined credibility. The
                `liveCount` state + fetch stay in place for now in case
                we re-introduce a different surfacing of the same number
                downstream (e.g. on /discover). */}
          </div>
        </section>

        {/* CONSOLIDATED — one section that combines worldview + how-it-works
            + before/after into a single tight narrative. Earlier these were
            four separate sections that all said variations of "we exist
            because admissions is broken; here are 5 things we do better."
            Round 10 collapse: lead with the shift (the user's status quo
            vs ours), follow with one editorial line on what makes us
            different. The product takes 60 seconds; the page should too. */}
        {/* The 'scattered tabs / ranked plan' section was retired here:
            the four-bullet listicle felt generic and over-extended the
            scroll before the user got to the team — the actual proof
            point right now while the Discover database is still
            maturing. Headlining with the team's track record + cross-
            continental experience lands the consulting/advising story
            faster. OutcomesBar moved into the team section header below
            so the trust signal still appears once outcomes flow in. */}

        {/* TEAM — subtle background shift, no hard block.
            Header carries over the /team stats block ($500K+, 10+ years,
            5-flag row) so the home page leads with the consulting moat
            instead of a generic tagline. */}
        <section
          className="py-20 sm:py-28"
          style={{ backgroundImage: `linear-gradient(180deg, transparent, hsl(var(--primary) / 0.07) 50%, transparent)` }}
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-4xl mx-auto text-center mb-20 sm:mb-24">
              {/* "TEAM" kicker dropped — the H2 below already names the
                  section. A kicker + H2 that says the same thing twice
                  is redundant chrome; keeping just the H2 reads cleaner
                  and matches the other sections that don't double-label. */}
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-8 sm:mb-10">
                Meet the team.
              </h2>

              {/* Stats block — carried over from /team. $500K+ secured,
                  10+ years of collective experience, 5-country flag row.
                  Animated numbers count up on scroll-into-view. Wider
                  horizontal gap between the 3 stat columns so each one
                  reads as its own anchor instead of a crowded triplet. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-4xl mx-auto mb-6">
                <motion.div whileHover={{ scale: 1.04 }} className="space-y-1 sm:space-y-2">
                  <div className="min-h-[44px] sm:min-h-[56px] flex items-center justify-center">
                    <div className="text-4xl sm:text-5xl font-bold text-gold">
                      $<AnimatedNumber value={500} />K+
                    </div>
                  </div>
                  <div className="text-xs sm:text-base text-muted-foreground">in scholarships secured</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} className="space-y-1 sm:space-y-2">
                  <div className="min-h-[44px] sm:min-h-[56px] flex items-center justify-center">
                    <div className="text-4xl sm:text-5xl font-bold text-gold">
                      <AnimatedNumber value={10} />+
                    </div>
                  </div>
                  <div className="text-xs sm:text-base text-muted-foreground">years of collective experience</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} className="space-y-1 sm:space-y-2">
                  <div className="min-h-[44px] sm:min-h-[56px] flex items-center justify-center">
                    <div className="flex flex-nowrap gap-2 sm:gap-3 items-center justify-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={usFlag} alt="USA" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={caFlag} alt="Canada" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={gbFlag} alt="UK" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={cnFlag} alt="China" className="w-full h-full object-cover object-left" loading="lazy" />
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={krFlag} alt="South Korea" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs sm:text-base text-muted-foreground">cross-continental expertise</div>
                </motion.div>
              </div>

              {/* OutcomesBar — kept from the retired 'shift' section so
                  once one TopUni member logs an accepted award, the
                  compounding trust signal still surfaces above the team. */}
              <div className="mt-4">
                <OutcomesBar variant="card" language="en" />
              </div>
            </motion.div>

            {/* Team grid — bumped row gap on mobile (gap-y-12) so the
                2×2 stack on small screens has visible breathing between
                rows. Desktop's 4-across row-gap unchanged. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 sm:gap-x-8 gap-y-12 sm:gap-y-10">
              {TEAM.map((m, i) => (
                <motion.button
                  key={m.name}
                  {...fadeUp(0.06 * i)}
                  onClick={() => navigate('/team')}
                  className="group text-center flex flex-col items-center"
                >
                  {/* Photo: square ring with fixed dimensions + shrink-0
                      so the flex layout never compresses one card's
                      photo when its sibling has a longer name/school
                      string below. On mobile the 2-col grid was showing
                      uneven photo heights because the buttons were
                      stretching to row height; locking aspect via
                      flex-col + shrink-0 + min-h on the caption block
                      keeps every photo identical. */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-5 bg-canvas ring-1 ring-border/60 ring-offset-4 ring-offset-background shadow-sm shrink-0 aspect-square">
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>
                  <p className="font-heading font-semibold text-foreground text-base leading-tight min-h-[2.5rem] flex items-center">{m.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{m.title}</p>
                  {/* School / credential — locked min-height so a
                      single-line "Yale" doesn't shorten its card vs a
                      two-line "Tsinghua · Cambridge" sibling. */}
                  <p className="font-heading text-[11px] sm:text-xs text-gold-dark mt-2.5 font-bold uppercase tracking-[0.16em] min-h-[2rem] flex items-center text-center">
                    {m.school}
                  </p>
                </motion.button>
              ))}
            </div>

            <motion.div {...fadeUp(0.3)} className="mt-16 sm:mt-20 text-center">
              <button
                onClick={() => navigate('/team')}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-gold-dark transition-colors"
              >
                More about us <ArrowRight className="h-4 w-4" />
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
              <Crown className="h-3.5 w-3.5" /> Early access · first 50 signups
            </motion.div>
            <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.1] mb-5">
              Become a member, $39/month.
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg mb-9 max-w-xl mx-auto leading-relaxed">
              TopUni AI · Discover · Academy · monthly live workshops with the team. Early-access discount applied automatically.
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
