import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram, GraduationCap, Brain, Search, Users, ArrowRight, Sparkles, BookOpen, Globe, Trophy, Target } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
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

const IndexRu = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative bg-background">
      <ScrollProgress />
      <Navigation language="ru" />

      {/* ── HERO ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative min-h-[92vh] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,35,66,0.88) 0%, rgba(10,35,66,0.65) 100%), url(${heroImage})`,
        }}
      >
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <motion.div {...fadeUp(0.1)} className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Discover · Prep · Succeed
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.2)}
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-6"
          >
            Ваше будущее.{" "}
            <span className="text-gold">Наша миссия.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.35)}
            className="text-primary-foreground/85 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto mb-3 font-light leading-relaxed"
          >
            AI-поиск университетов, адаптивная подготовка к экзаменам и экспертный консалтинг — всё в одном месте.
          </motion.p>

          <motion.p
            {...fadeUp(0.45)}
            className="text-primary-foreground/50 text-xs sm:text-sm tracking-widest uppercase mb-10"
          >
            Консультанты из Йеля, Гарварда, Кембриджа и Цинхуа · Доступно на русском и английском
          </motion.p>

          <motion.div {...fadeUp(0.55)} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform duration-200 gap-2"
              onClick={() => navigate('/discover/ru')}
            >
              <Search className="h-5 w-5" /> Найти университет
            </Button>
            <Button
              size="lg"
              className="text-lg px-10 py-6 border-2 border-gold/40 bg-transparent text-gold hover:bg-gold/10 transition-all duration-200 gap-2"
              onClick={() => navigate('/offerings/ru')}
            >
              Наши услуги <ArrowRight className="h-5 w-5" />
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

      {/* ── PLATFORM PILLARS ── */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Одна платформа. <span className="text-accent">Все преимущества.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              От поиска университета мечты до сдачи экзаменов и зачисления — все инструменты в одном месте.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <motion.div
              {...fadeUp(0.1)}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-accent/40 hover:shadow-[var(--shadow-premium)] transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/discover/ru')}
            >
              <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Globe className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-3">Discover</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Поиск по 500+ университетам мира. Сравнение стоимости, рейтингов, виз и стипендий — в одной базе данных.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Шанс поступления</li>
                <li className="flex items-center gap-2"><Search className="h-4 w-4 text-accent" /> Сравнение бок о бок</li>
                <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /> Калькулятор расходов</li>
              </ul>
              <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                Найти университет <ArrowRight className="h-4 w-4" />
              </span>
            </motion.div>

            <motion.div
              {...fadeUp(0.2)}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-accent/40 hover:shadow-[var(--shadow-premium)] transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/prep')}
            >
              <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <BookOpen className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-3">Prep</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Адаптивная подготовка к IELTS и SAT с AI‑репетитором, полными пробными экзаменами и геймификацией.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><Brain className="h-4 w-4 text-accent" /> AI-адаптивная практика</li>
                <li className="flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" /> Пробные экзамены с оценкой</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI-проверка эссе</li>
              </ul>
              <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                Начать подготовку <ArrowRight className="h-4 w-4" />
              </span>
            </motion.div>

            <motion.div
              {...fadeUp(0.3)}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-accent/40 hover:shadow-[var(--shadow-premium)] transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/offerings/ru')}
            >
              <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Users className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-3">Consulting</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Персональная стратегия поступления от менторов, которые прошли этот путь. Эссе, собеседования, документы.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /> Менторы из Ivy League и Oxbridge</li>
                <li className="flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Коучинг по эссе и интервью</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Полное ведение заявок</li>
              </ul>
              <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                Пакеты услуг <ArrowRight className="h-4 w-4" />
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── AI SECTION ── */}
      <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase mb-6">
              <Brain className="h-3.5 w-3.5" /> На базе AI
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              TopUni <span className="text-gold">AI</span>
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">
              Начните с AI — исследуйте университеты, получите подбор и сформируйте шорт-лист. Когда будете готовы к полной стратегии — наши эксперты возьмут дело в свои руки.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12">
            {[
              { num: "500+", label: "Университетов" },
              { num: "24/7", label: "AI-консультант" },
              { num: "95%", label: "Точность подбора" },
              { num: "2 мин", label: "Полная стратегия" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-3xl sm:text-4xl font-bold text-gold mb-1">{stat.num}</div>
                <div className="text-primary-foreground/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="text-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/topuni-ai/ru')}
            >
              <Brain className="h-5 w-5" /> Попробовать TopUni AI
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── COURSES ── */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Курсы и <span className="text-accent">подготовка</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Структурированная подготовка с опытными преподавателями — онлайн и офлайн.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "Подготовка к IELTS",
                desc: "Уверенная подготовка по всем разделам — Listening, Reading, Writing и Speaking. Адаптивная практика с AI-оценкой эссе.",
                icon: BookOpen,
              },
              {
                title: "Подготовка к SAT",
                desc: "Освойте математику и вербальное мышление для конкурентного результата. Полные пробные экзамены с таймером.",
                icon: Target,
              },
              {
                title: "Общий английский",
                desc: "Грамматика, словарный запас и беглость для академического и профессионального роста — для любого уровня.",
                icon: Globe,
              },
            ].map((course, i) => (
              <motion.div
                key={course.title}
                {...fadeUp(0.1 * (i + 1))}
                className="rounded-2xl border border-border bg-card p-6 sm:p-8 hover:border-accent/30 hover:shadow-[var(--shadow-premium)] transition-all duration-300"
              >
                <course.icon className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">{course.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{course.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.4)} className="text-center mt-10">
            <Button
              variant="gold"
              size="lg"
              className="text-base px-10 py-5 hover:scale-105 transition-transform"
              onClick={() => navigate('/offerings/ru')}
            >
              Все программы
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 sm:py-20 bg-accent/5 border-y border-accent/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeUp()}>
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Готовы начать свой путь?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Бесплатная 20-минутная консультация. Без обязательств — только ясность.
            </p>
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-12 py-6 hover:scale-105 transition-transform"
              onClick={() => navigate('/offerings/ru')}
            >
              Записаться на консультацию
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-primary text-primary-foreground py-12">
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
