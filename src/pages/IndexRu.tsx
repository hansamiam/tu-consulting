import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram, ArrowRight, Crown } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import joshPhoto from "@/assets/josh.jpg";
import aigulPhoto from "@/assets/aigul.jpeg";
import Navigation from "@/components/Navigation";
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

const IndexRu = () => {
  const navigate = useNavigate();

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
                Ваша индивидуальная <span className="text-gold-dark">стратегия поступления</span>
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

              <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center justify-center gap-3 mb-10">
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
            </div>
          </section>

          {/* CONSOLIDATED — Round 10 collapse: worldview + how-it-works
              + before/after merged into one tight narrative, mirroring EN. */}
          <section id="how" className="py-20 sm:py-28">
            <div className="max-w-5xl mx-auto px-5 sm:px-8">
              <motion.div {...fadeUp()} className="max-w-2xl mx-auto text-center mb-12 sm:mb-14">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Сдвиг</p>
                <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12]">
                  От 47 вкладок к ранжированному плану.
                </h2>
                <div className="mt-6">
                  <OutcomesBar variant="card" language="ru" />
                </div>
              </motion.div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 mb-12 sm:mb-16">
                <motion.div
                  {...fadeUp(0.05)}
                  className="rounded-2xl border border-border bg-card p-6 sm:p-7"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-4">
                    Без TopUni
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Сайты-агрегаторы, которые показывают всем одни и те же стипендии",
                      "Случайные советы с Reddit",
                      "Пропущенные дедлайны",
                      "Непонятно, проходите ли вы вообще",
                      "Нет внятной стратегии для эссе",
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
                    С TopUni
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Ранжированные возможности под ваш профиль",
                      "Заметки «почему стоит изучить» по каждой стипендии",
                      "Фильтры финансирования, которые реально сужают список",
                      "План дедлайнов с напоминаниями на почту",
                      "Ежемесячные живые воркшопы с поступившими основателями",
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

              <motion.p
                {...fadeUp(0.18)}
                className="font-sans text-lg sm:text-xl text-foreground/85 leading-[1.5] tracking-[-0.005em] text-center text-balance max-w-3xl mx-auto"
              >
                Элитный консалтинг по поступлению стоит тысячи. Сайты-агрегаторы заваливают вас стипендиями, на которые вы не проходите.
                {" "}
                <span className="text-gold-dark font-semibold">TopUni — софт между ними</span> — персональная стратегия, возможности, ранжированные под ваш реальный профиль, и поддержка вживую за долю стоимости.
              </motion.p>
            </div>
          </section>

          {/* TEAM */}
          <section
            className="py-20 sm:py-28"
            style={{ backgroundImage: `linear-gradient(180deg, transparent, hsl(var(--primary) / 0.07) 50%, transparent)` }}
          >
            <div className="max-w-6xl mx-auto px-5 sm:px-8">
              <motion.div {...fadeUp()} className="max-w-3xl mx-auto text-center mb-14 sm:mb-16">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Команда</p>
                <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-5">
                  Мы сидели в тех комнатах, в которые вы поступаете.
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Yale · Harvard · Cambridge · Tsinghua — поступали, получали финансирование, теперь по другую сторону стола.
                </p>
              </motion.div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
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
                    <p className="text-xs text-gold-dark mt-1.5 font-medium tracking-wide">{m.school}</p>
                  </motion.button>
                ))}
              </div>

              <motion.div {...fadeUp(0.3)} className="mt-12 text-center">
                <button
                  onClick={() => navigate('/team/ru')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-gold-dark transition-colors"
                >
                  Вся команда <ArrowRight className="h-4 w-4" />
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
                <Crown className="h-3.5 w-3.5" /> Основательная когорта · цена запуска
              </motion.div>
              <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.1] mb-5">
                Полный набор инструментов, $39/мес.
              </motion.h2>
              <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg mb-9 max-w-xl mx-auto leading-relaxed">
                TopUni AI · Discover · Академия · ежемесячные живые воркшопы с поступившими основателями. Скидка основательной когорты доступна по промокоду на оплате.
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

        <footer className="bg-primary text-primary-foreground py-12">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col items-center gap-6">
              <a
                href="https://www.instagram.com/top_uni_consulting/?g=5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors p-2"
                aria-label="Instagram"
              >
                <Instagram size={26} strokeWidth={1.5} />
              </a>
              <Footer language="ru" variant="dark" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default IndexRu;
