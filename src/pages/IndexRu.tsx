import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Instagram, Brain, Compass, BookOpen, ArrowRight, Sparkles, Crown,
} from "lucide-react";
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
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

const STEPS = [
  {
    n: "1",
    icon: Brain,
    title: "TopUni AI",
    body: "Анкета на 2 минуты — и ваша стратегия поступления готова: список целей, дедлайны, шаги.",
    cta: "Создать стратегию",
    path: "/topuni-ai/ru",
  },
  {
    n: "2",
    icon: Compass,
    title: "Discover",
    body: "Подбор стипендий под ваш профиль — с проверенными требованиями по GPA, баллам и дедлайнам.",
    cta: "Мои совпадения",
    path: "/discover/ru",
  },
  {
    n: "3",
    icon: BookOpen,
    title: "Academy",
    body: "Воркшопы, гайды по странам, разборы реальных эссе. Новые материалы каждую неделю с 10 мая.",
    cta: "Открыть Academy",
    path: "/academy",
  },
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
    <div className="min-h-screen relative bg-background">
      <ScrollProgress />
      <Navigation language="ru" />

      {/* HERO */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative min-h-[88vh] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,35,66,0.88) 0%, rgba(10,35,66,0.65) 100%), url(${heroImage})`,
        }}
      >
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <motion.h1
            {...fadeUp(0.2)}
            className="font-heading text-[2.4rem] sm:text-5xl md:text-[3.6rem] lg:text-[4rem] font-bold text-primary-foreground leading-[1.05] tracking-tight mb-6"
          >
            Ваша <span className="text-gold">стратегия поступления</span>
            <br className="hidden sm:block" /> за минуты.
          </motion.h1>

          <motion.p
            {...fadeUp(0.35)}
            className="text-primary-foreground/85 text-lg sm:text-xl max-w-2xl mx-auto mb-4 font-light leading-relaxed"
          >
            Анкета на 2 минуты строит ваш план. Дальше — стипендии и плейбук от консультантов.
          </motion.p>

          <motion.p
            {...fadeUp(0.45)}
            className="text-primary-foreground/55 text-xs sm:text-sm tracking-widest uppercase mb-10"
          >
            ИНСАЙТЫ ОТ ВЫПУСКНИКОВ ЙЕЛЬ, ГАРВАРД, КЕМБРИДЖ И ЦИНХУА · НА РУССКОМ И АНГЛИЙСКОМ
          </motion.p>

          <motion.div {...fadeUp(0.55)} className="flex justify-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform duration-200 gap-2"
              onClick={() => navigate('/topuni-ai/ru')}
            >
              <Sparkles className="h-5 w-5" /> Получить план поступления
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-gold/40 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-gold"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* 3-STEP FUNNEL */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Три шага. <span className="text-accent">Один план.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              От профиля до финансируемого шорт-листа, готового к действиям уже на этой неделе.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                {...fadeUp(0.1 * i)}
                className="group relative rounded-2xl border border-border bg-card p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(step.path)}
              >
                <div className="absolute -top-3 left-6 h-7 w-7 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center">
                  {step.n}
                </div>
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mt-2">
                  <step.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.body}</p>
                <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                  {step.cta} <ArrowRight className="h-4 w-4" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-20 sm:py-24 bg-canvas-soft border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-3">Команда</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Консультанты, прошедшие этот путь.
            </h2>
            <p className="text-muted-foreground">
              Йель, Гарвард, Кембридж, Цинхуа, Schwarzman. Не отдел продаж — те же люди, которые работают с вашей заявкой.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {TEAM.map((m, i) => (
              <motion.button
                key={m.name}
                {...fadeUp(0.06 * i)}
                onClick={() => navigate('/team/ru')}
                className="group rounded-2xl bg-card border border-border p-5 text-center hover:border-accent/40 hover:shadow-md transition-all"
              >
                <img
                  src={m.photo}
                  alt={m.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-border group-hover:ring-accent/40 transition-all"
                />
                <p className="font-semibold text-sm text-foreground leading-tight">{m.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.title}</p>
                <p className="text-[11px] text-accent mt-1.5 font-medium">{m.school}</p>
              </motion.button>
            ))}
          </div>

          <motion.div {...fadeUp(0.3)} className="text-center">
            <Button variant="outline" size="lg" onClick={() => navigate('/team/ru')} className="gap-2">
              Вся команда <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ACADEMY PREVIEW */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-3">Academy · запуск 10 мая</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Плейбук <span className="text-accent">без купюр.</span>
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Воркшопы, гайды по странам, реальные эссе победителей и тактики, которые действительно используют наши консультанты. Новые материалы каждую неделю.
              </p>
              <Button onClick={() => navigate('/academy')} variant="gold" className="gap-2">
                Открыть Academy <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
              {[
                "Эссе для Yale — 3 примера принятых, с разбором",
                "Schwarzman: разбор успешной заявки от первого лица",
                "Live-воркшоп · 17 мая — как составить activities list",
                "Гайд по США: need-blind стипендии для иностранцев",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2.5 text-sm text-foreground/85">
                  <div className="h-1.5 w-1.5 rounded-full bg-gold mt-2 shrink-0" />
                  <span className="leading-relaxed">{t}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* MEMBERSHIP */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeUp()} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-medium tracking-wide uppercase mb-5">
            <Crown className="h-3.5 w-3.5" /> Founding Membership
          </motion.div>
          <motion.h2 {...fadeUp(0.05)} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            Одно <span className="text-gold">членство.</span> Всё внутри.
          </motion.h2>
          <motion.p {...fadeUp(0.1)} className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            TopUni AI, Discover и Academy — по цене основателей, навсегда.
          </motion.p>
          <motion.div {...fadeUp(0.2)}>
            <Button
              variant="gold"
              size="lg"
              className="text-base px-8 py-5 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/pricing')}
            >
              Подробнее <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground py-12 border-t border-gold/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-6">
              <a
                href="https://www.instagram.com/top_uni_consulting/?g=5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors p-2"
                aria-label="Мы в Instagram"
              >
                <Instagram size={28} strokeWidth={1.5} />
              </a>
            </div>
            <Footer language="ru" variant="dark" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexRu;
