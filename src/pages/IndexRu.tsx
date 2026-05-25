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
// /team/ru (just "Основатель", no "Основатель и CEO") so the home
// cards stay scannable. Mirrors Index.tsx.
const TEAM = [
  { name: "Samuel Han", title: "Основатель", school: "Yale", photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", title: "Со-основатель", school: "Tsinghua · Cambridge", photo: nurzadaPhoto },
  { name: "Josh Hughes", title: "Ведущий консультант", school: "Harvard", photo: joshPhoto },
  { name: "Aigul Abdoubaetova", title: "Старший советник", school: "U of Oregon", photo: aigulPhoto },
];

const IndexRu = () => {
  const navigate = useNavigate();
  const [liveCount, setLiveCount] = useState<number | null>(null);

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

      {/* ── Page-level parallax campus image (fixed) — matches the English
          hero treatment so both languages share one visual identity. */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url(${heroImage})`,
          filter: "grayscale(1) contrast(1.05) brightness(0.96)",
        }}
        aria-hidden="true"
      />
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
        <Navigation language="ru" variant="overlay" />

        <main className="relative">

          {/* HERO — pulled up behind the nav */}
          <section className="relative -mt-16 min-h-[86vh] flex items-center overflow-hidden text-foreground">
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

            {/* Hero text shifted lower on mobile (pt-36 vs pt-20 desktop)
                so it sits comfortably below the navy nav band instead
                of crowding the navigation. Desktop unchanged. */}
            <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center pt-36 pb-12 sm:pt-20 sm:pb-28 w-full">
              <motion.h1
                {...fadeUp(0.15)}
                className="font-heading text-[2.125rem] sm:text-6xl font-bold tracking-tight leading-[1.08] sm:leading-[1.02] mb-6 sm:mb-7 text-balance max-w-4xl mx-auto text-foreground md:text-6xl"
              >
                Ваша индивидуальная <span className="text-gold-dark">стратегия стипендий</span>
                <br className="hidden sm:block" /> за минуты.
              </motion.h1>

              <motion.p
                {...fadeUp(0.25)}
                className="text-base sm:text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed mb-6 font-medium"
              >
                Опыт выпускников Yale, Harvard, Cambridge и Tsinghua
              </motion.p>

              <motion.p {...fadeUp(0.32)} className="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-foreground/75 mb-9 max-w-xl mx-auto font-medium">
                 · ДОСТУПНО НА РУССКОМ И АНГЛИЙСКОМ
              </motion.p>

              <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center justify-center gap-3 mb-5">
                <Button
                  variant="gold"
                  size="lg"
                  className="text-sm sm:text-base px-7 py-5 gap-2"
                  onClick={() => navigate('/topuni-ai/ru')}
                >
                  Моя бесплатная стратегия <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-sm sm:text-base px-5 text-foreground/75 hover:bg-foreground/5 hover:text-foreground gap-2"
                  onClick={() => navigate('/discover/ru')}
                >
                  Сразу к стипендиям
                </Button>
              </motion.div>

              {liveCount !== null && liveCount > 0 && (
                <motion.p {...fadeUp(0.42)} className="text-[11.5px] sm:text-xs text-foreground/65 mb-10 inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Живая база <span className="font-semibold text-foreground tabular-nums">{liveCount}</span> активных стипендий, обновляется ежедневно.
                </motion.p>
              )}
            </div>
          </section>

          {/* CONSOLIDATED — Round 10's worldview + before/after listicle
              was retired here to mirror EN (commit 95d382a). The four-bullet
              compare felt generic and stretched the scroll before users hit
              the team — the actual proof point right now while Discover is
              still maturing. OutcomesBar moved into the team section header
              below so the trust signal still surfaces. */}

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
                {/* "Команда" kicker dropped — the H2 below already names
                    the section. A kicker + H2 that say the same thing
                    twice is redundant chrome. Mirrors EN. */}
                <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-8 sm:mb-10">
                  Знакомьтесь с командой.
                </h2>

                {/* Stats block — carried over from /team. $500K+ secured,
                    10+ years of collective experience, 5-country flag row.
                    Animated numbers count up on scroll-into-view. */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-4xl mx-auto mb-6">
                  <motion.div whileHover={{ scale: 1.04 }} className="space-y-1 sm:space-y-2">
                    <div className="min-h-[44px] sm:min-h-[56px] flex items-center justify-center">
                      <div className="text-4xl sm:text-5xl font-bold text-gold">
                        $<AnimatedNumber value={500} />K+
                      </div>
                    </div>
                    <div className="text-xs sm:text-base text-muted-foreground">привлечено в стипендиях</div>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.04 }} className="space-y-1 sm:space-y-2">
                    <div className="min-h-[44px] sm:min-h-[56px] flex items-center justify-center">
                      <div className="text-4xl sm:text-5xl font-bold text-gold">
                        <AnimatedNumber value={10} />+
                      </div>
                    </div>
                    <div className="text-xs sm:text-base text-muted-foreground">лет совместного опыта</div>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.04 }} className="space-y-1 sm:space-y-2">
                    <div className="min-h-[44px] sm:min-h-[56px] flex items-center justify-center">
                      <div className="flex flex-nowrap gap-2 sm:gap-3 items-center justify-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                          <img src={usFlag} alt="США" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                          <img src={caFlag} alt="Канада" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                          <img src={gbFlag} alt="Великобритания" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                          <img src={cnFlag} alt="Китай" className="w-full h-full object-cover object-left" loading="lazy" />
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                          <img src={krFlag} alt="Южная Корея" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-base text-muted-foreground">опыт с пяти континентов</div>
                  </motion.div>
                </div>

                {/* OutcomesBar — moved here from the retired "Сдвиг" section
                    so once one TopUni member logs an accepted award, the
                    compounding trust signal still surfaces above the team. */}
                <div className="mt-4">
                  <OutcomesBar variant="card" language="ru" />
                </div>
              </motion.div>

              {/* Team grid — gap-y-12 on mobile so the 2×2 stack on small
                  screens has visible breathing between rows. Mirrors EN. */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 sm:gap-x-8 gap-y-12 sm:gap-y-10">
                {TEAM.map((m, i) => (
                  <motion.button
                    key={m.name}
                    {...fadeUp(0.06 * i)}
                    onClick={() => navigate('/team/ru')}
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
                    {/* School / credential — editorial uppercase + tight
                        letter-spacing + gold-dark weight reads like the
                        masthead credit line on a profile piece. Mirrors EN. */}
                    <p className="font-heading text-[11px] sm:text-xs text-gold-dark mt-2.5 font-bold uppercase tracking-[0.16em]">
                      {m.school}
                    </p>
                  </motion.button>
                ))}
              </div>

              <motion.div {...fadeUp(0.3)} className="mt-16 sm:mt-20 text-center">
                <button
                  onClick={() => navigate('/team/ru')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-gold-dark transition-colors"
                >
                  Подробнее о команде <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            </div>
          </section>

          {/* MEMBERSHIP — long gradient ramp into footer navy */}
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
                <Crown className="h-3.5 w-3.5" /> Ранний доступ · первые 20 закрепляют цену навсегда
              </motion.div>
              <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.1] mb-5">
                Стать участником, $39/мес.
              </motion.h2>
              <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg mb-9 max-w-xl mx-auto leading-relaxed">
                Академия · ежемесячные живые воркшопы и office hours с командой · новые инструменты и обновления каждый месяц.
              </motion.p>
              <motion.div {...fadeUp(0.2)} className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="gold"
                  size="lg"
                  className="text-base px-8 py-6 gap-2"
                  onClick={() => navigate('/pricing/ru')}
                >
                  Забронировать место <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </section>

        </main>

        {/* Instagram chip baked into Footer — see EN page comment. */}
        <Footer language="ru" variant="dark" />
      </div>
    </div>
  );
};

export default IndexRu;
