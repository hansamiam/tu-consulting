import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, BookOpen, Target, Globe, Brain, ArrowRight, Sparkles, Trophy, BarChart3, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { Footer } from "@/components/Footer";
import heroImage from "@/assets/hero-campus.jpg";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

const PrepLandingRu = () => {
  const navigate = useNavigate();

  const courses = [
    {
      tag: "Тесты",
      title: "Подготовка к экзаменам",
      desc: "Освойте IELTS и SAT с адаптивной программой. Развивайте уверенность во всех разделах IELTS (Listening, Reading, Writing, Speaking) с целью 6.5–8.0, и покорите Digital SAT — математику и вербальную часть с целью 1400+.",
      features: ["Полные пробные IELTS и SAT с оценкой", "AI-коррекция эссе и устные тренировки", "Адаптивная сложность, растущая вместе с вами"],
      icon: Target,
    },
    {
      tag: "Основы",
      title: "Общий английский",
      desc: "Постройте прочную базу английского — грамматика, словарный запас, чтение и разговорная речь для студентов, готовящихся к учёбе за рубежом. Структурировано от A2 до C1.",
      features: ["Адаптивная программа (A2–C1)", "Грамматика и расширение словаря", "Академическое письмо и разговорная практика"],
      icon: BookOpen,
    },
    {
      tag: "Карьера",
      title: "Профессиональный английский",
      desc: "Отточите английский для глобального рынка труда. Подготовка к собеседованиям, проведение встреч, презентации и переговоры — эта программа даст вам уверенность и словарный запас.",
      features: ["Подготовка к собеседованиям и деловое общение", "Навыки презентаций и переговоров", "Отраслевая лексика и кейсы"],
      icon: Globe,
    },
  ];

  const platformFeatures = [
    { icon: Brain, title: "AI-адаптивная практика", desc: "Вопросы подстраиваются под ваш уровень в реальном времени" },
    { icon: Trophy, title: "Полные пробные экзамены", desc: "IELTS и SAT симуляции с мгновенной оценкой" },
    { icon: Sparkles, title: "AI-обратная связь по эссе", desc: "Баллы и детальный анализ письма за секунды" },
    { icon: BarChart3, title: "Панель аналитики", desc: "Отслеживайте прогресс по каждому навыку" },
    { icon: Zap, title: "Геймификация", desc: "XP, серии, уровни и достижения мотивируют вас" },
    { icon: Target, title: "110+ практических вопросов", desc: "Словарь, чтение, грамматика, математика и многое другое" },
  ];

  return (
    <div className="min-h-screen relative bg-background">
      <Navigation language="ru" />
      <BetaBanner />

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-20 sm:py-28 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,35,66,0.88) 0%, rgba(10,35,66,0.65) 100%), url(${heroImage})`,
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeUp(0.1)} className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase">
              <BookOpen className="h-3.5 w-3.5" /> Курсы + AI Платформа
            </span>
          </motion.div>
          <motion.h1
            {...fadeUp(0.2)}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-6"
          >
            Подготовка к экзаменам и <span className="text-gold">языковые курсы</span>
          </motion.h1>
          <motion.p
            {...fadeUp(0.35)}
            className="text-primary-foreground/85 text-lg sm:text-xl max-w-3xl mx-auto mb-10 font-light leading-relaxed"
          >
            Курсы IELTS, SAT и английского с AI-платформой для практики — всё, что нужно для достижения целевого балла.
          </motion.p>
          <motion.div {...fadeUp(0.5)} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/prep/dashboard')}
            >
              <Zap className="h-5 w-5" /> Открыть платформу
            </Button>
            <Button
              size="lg"
              className="text-lg px-10 py-6 border-2 border-gold/40 bg-transparent text-gold hover:bg-gold/10 transition-all gap-2"
              onClick={() => {
                document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Смотреть курсы <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Courses Section */}
      <section id="courses" className="py-20 sm:py-28 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Наши <span className="text-accent">курсы</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Результативная подготовка с опытными преподавателями — онлайн и очно.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {courses.map((course, i) => (
              <motion.div key={course.title} {...fadeUp(0.1 * (i + 1))}>
                <Card className="h-full border-border hover:border-accent/30 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="inline-block px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full mb-2 w-fit">
                      <span className="text-primary font-semibold text-xs uppercase tracking-wide">{course.tag}</span>
                    </div>
                    <CardTitle className="text-lg md:text-xl">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{course.desc}</p>
                    <ul className="space-y-1.5">
                      {course.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="text-accent flex-shrink-0 mt-0.5" size={14} />
                          <span className="text-xs md:text-sm text-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.4)} className="text-center mt-10">
            <p className="text-muted-foreground text-sm mb-4">Хотите записаться? Свяжитесь с нашей командой.</p>
            <Button
              variant="gold"
              size="lg"
              className="text-base px-10 py-5 hover:scale-105 transition-transform"
              onClick={() => window.location.href = "mailto:team@topuniconsulting.com?subject=Запрос%20о%20курсах"}
            >
              Связаться по курсам
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase mb-6">
              <Zap className="h-3.5 w-3.5" /> AI-платформа
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              TopUni <span className="text-gold">Prep Платформа</span>
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">
              Самоподготовка с AI. Адаптивная практика, пробные экзамены, мгновенная обратная связь по эссе и отслеживание прогресса — бесплатно в период бета-тестирования.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {platformFeatures.map((f, i) => (
              <motion.div key={f.title} {...fadeUp(0.1 * (i + 1))}>
                <div className="rounded-xl border border-gold/20 bg-primary-foreground/5 p-6 hover:bg-primary-foreground/10 transition-colors">
                  <f.icon className="h-7 w-7 text-gold mb-3" />
                  <h3 className="font-semibold text-primary-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-primary-foreground/60">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.4)} className="text-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-12 py-6 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/prep/dashboard')}
            >
              <ArrowRight className="h-5 w-5" /> Войти в платформу
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6">
            <Footer language="ru" variant="dark" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrepLandingRu;
