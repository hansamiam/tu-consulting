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
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
});

const STEPS = [
  { n: "01", title: "Расскажите о себе", body: "Анкета на 2 минуты — баллы, история, школы мечты.", detail: "TopUni AI", path: "/topuni-ai/ru" },
  { n: "02", title: "Получите стратегию", body: "Список целей, дедлайны, шаги, подбор стипендий — под ваш профиль.", detail: "Discover", path: "/discover/ru" },
  { n: "03", title: "Действуйте по плану", body: "Воркшопы, гайды по странам, реальные эссе. Новое каждую неделю с 10 мая.", detail: "Academy", path: "/academy" },
];

const TEAM = [
  { name: "Samuel Han", title: "Founder & CEO", school: "Yale", photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", title: "Co-Founder", school: "Schwarzman · Cambridge", photo: nurzadaPhoto },
  { name: "Josh Hughes", title: "Lead Consultant", school: "Harvard", photo: joshPhoto },
  { name: "Aigul Abdoubaetova", title: "Senior Advisor", school: "Ex-OSCE Academy", photo: aigulPhoto },
];

const IndexRu = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ScrollProgress />
      <Navigation language="ru" />

      <main className="relative">

        {/* HERO */}
        <section className="relative min-h-[86vh] flex items-center overflow-hidden bg-background text-foreground">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background/90" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center pt-16 pb-24 sm:pt-20 sm:pb-28 w-full">
            <motion.h1 {...fadeUp(0.15)} className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.02] mb-7 text-balance max-w-4xl mx-auto text-foreground">
              Ваша <span className="text-gold-dark">стратегия поступления</span>
              <br className="hidden sm:block" /> за минуты.
            </motion.h1>

            <motion.p {...fadeUp(0.25)} className="text-lg sm:text-xl text-foreground/75 max-w-2xl mx-auto leading-relaxed mb-6">
              Двухминутная анкета строит ваш план. Затем — поиск финансирования и плейбук поступления.
            </motion.p>

            <motion.p {...fadeUp(0.32)} className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-foreground/55 mb-9 max-w-xl mx-auto">
              Опыт выпускников Yale, Harvard, Cambridge & Tsinghua · Доступно на русском и английском
            </motion.p>

            <motion.div {...fadeUp(0.35)} className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <Button variant="gold" size="lg" className="text-sm sm:text-base px-7 py-5 gap-2" onClick={() => navigate('/topuni-ai/ru')}>
                Создать план <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-sm px-4 text-foreground/65 hover:bg-foreground/5 hover:text-foreground"
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
                Ниже
              </Button>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-2xl mx-auto text-center mb-14 sm:mb-16">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Как это работает</p>
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12]">
                Три шага. Один план.
              </h2>
            </motion.div>

            <div className="space-y-px">
              {STEPS.map((step, i) => (
                <motion.button key={step.n} {...fadeUp(0.08 * i)} onClick={() => navigate(step.path)}
                  className="group w-full text-left grid grid-cols-12 gap-4 sm:gap-8 items-baseline py-7 sm:py-9 border-t border-border/70 hover:bg-canvas-soft/60 transition-colors px-2 sm:px-4 -mx-2 sm:-mx-4 rounded-md">
                  <div className="col-span-2 sm:col-span-1 font-mono text-sm sm:text-base text-gold-dark">{step.n}</div>
                  <div className="col-span-10 sm:col-span-7">
                    <h3 className="font-heading text-xl sm:text-2xl font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-[15px] sm:text-base max-w-xl">{step.body}</p>
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

        {/* TEAM */}
        <section className="py-20 sm:py-28"
          style={{ backgroundImage: `linear-gradient(180deg, hsl(var(--background)), hsl(var(--primary) / 0.055) 50%, hsl(var(--background)))` }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <motion.div {...fadeUp()} className="max-w-3xl mx-auto text-center mb-14 sm:mb-16">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Команда</p>
              <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-5">
                С опорой на опыт выпускников.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Yale, Harvard, Cambridge, Tsinghua, Schwarzman — спокойная и точная навигация по процессу.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {TEAM.map((m, i) => (
                <motion.button key={m.name} {...fadeUp(0.06 * i)} onClick={() => navigate('/team/ru')} className="group text-left">
                  <div className="aspect-[4/5] overflow-hidden rounded-md mb-4 bg-canvas">
                    <img src={m.photo} alt={m.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  </div>
                  <p className="font-heading font-semibold text-foreground text-base leading-tight">{m.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{m.title}</p>
                  <p className="text-xs text-gold-dark mt-1.5 font-medium tracking-wide">{m.school}</p>
                </motion.button>
              ))}
            </div>

            <motion.div {...fadeUp(0.3)} className="mt-12">
              <button onClick={() => navigate('/team/ru')}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-gold-dark transition-colors">
                Вся команда <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* ACADEMY */}
        <section className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <motion.div {...fadeUp()} className="lg:col-span-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Academy · старт 10 мая</p>
                <h2 className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.12] mb-5">
                  Application playbook.
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Воркшопы, страновые гайды, реальные эссе и практичные тактики. Новое каждую неделю.
                </p>
                <Button onClick={() => navigate('/academy')} variant="gold" className="gap-2">
                  Превью Academy <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>

              <motion.div {...fadeUp(0.15)} className="lg:col-span-7">
                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {[
                    { tag: "Эссе", t: "Yale supplemental — 3 поступивших разбора" },
                    { tag: "Разбор", t: "Schwarzman — что реально сработало" },
                    { tag: "Live · 17 мая", t: "Воркшоп: список активностей" },
                    { tag: "Страна", t: "USA need-blind помощь иностранным студентам" },
                  ].map((item) => (
                    <li key={item.t} className="py-5 flex items-start gap-5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-gold-dark font-medium pt-1 w-24 shrink-0">{item.tag}</span>
                      <span className="text-foreground/90 leading-relaxed">{item.t}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* MEMBERSHIP */}
        <section className="py-20 sm:py-28"
          style={{ backgroundImage: `linear-gradient(180deg, hsl(var(--background)), hsl(var(--primary) / 0.06))` }}>
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <motion.div {...fadeUp()} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold-dark text-[11px] font-medium tracking-[0.18em] uppercase mb-7">
              <Crown className="h-3.5 w-3.5" /> Founding Membership
            </motion.div>
            <motion.h2 {...fadeUp(0.05)} className="font-sans text-3xl sm:text-5xl font-semibold tracking-normal leading-[1.1] mb-5">
              Одна подписка. Всё внутри.
            </motion.h2>
            <motion.p {...fadeUp(0.1)} className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              TopUni AI, Discover и Academy — по цене для первых участников.
            </motion.p>
            <motion.div {...fadeUp(0.2)} className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="gold" size="lg" className="text-base px-8 py-6 gap-2" onClick={() => navigate('/pricing')}>
                Подписка <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="lg" className="text-base px-6 py-6 text-foreground hover:bg-secondary" onClick={() => navigate('/topuni-ai/ru')}>
                Попробовать TopUni AI
              </Button>
            </motion.div>
          </div>
        </section>

      </main>

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col items-center gap-6">
            <a href="https://www.instagram.com/top_uni_consulting/?g=5" target="_blank" rel="noopener noreferrer"
              className="text-gold hover:text-gold-light transition-colors p-2" aria-label="Instagram">
              <Instagram size={26} strokeWidth={1.5} />
            </a>
            <Footer language="ru" variant="dark" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexRu;
