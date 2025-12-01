import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Users, Target, Award, Heart, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const WhyTURu = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.6]);

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* Parallax Background */}
      <motion.div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(30, 52, 75, 0.92), rgba(30, 52, 75, 0.88)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          y: backgroundY,
          opacity: opacity
        }}
      />
      
      {/* Animated gradient overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-mesh opacity-40 animate-pulse-glow" />
      
      <div className="relative z-10">
      <Navigation language="ru" />
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="border-b border-gold/20 glass-nav sticky top-16 z-40 shadow-premium"
      >
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ru")}
            className="gap-2 text-gold hover:text-gold-light transition-all hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад на главную
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16">
          {/* Hero Section */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center space-y-3 md:space-y-6"
          >
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold text-gradient px-2 animate-fade-up">
              Почему Top Uni?
            </h1>
            <p className="text-sm md:text-xl text-gold-light max-w-3xl mx-auto px-4 animate-fade-in">
              Компактная команда. Реальный опыт. Личное внимание. Без корпоративной наценки.
            </p>
          </motion.div>

          {/* Forbes Section */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-6 md:p-10 glass-card border-gold/30 shadow-premium hover:shadow-premium-hover transition-all hover:scale-[1.02]">
              <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 text-center">
                <p className="text-base md:text-2xl lg:text-3xl text-primary-foreground leading-relaxed">
                  <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors font-bold link-premium">Forbes</a> утверждает: самый важный фактор успеха консалтинга—<span className="font-bold text-gold">насколько хорошо менторы понимают студентов.</span>
                </p>
                <div className="border-t-2 border-gold/30 pt-4 md:pt-6 mt-4 md:mt-6">
                  <p className="text-base md:text-xl lg:text-2xl text-gold font-bold mb-2 md:mb-3">
                    Разница TopUni:
                  </p>
                  <p className="text-sm md:text-base lg:text-lg text-primary-foreground">
                    Мы <span className="font-semibold text-gold-light">только что из процесса</span>. Помним, каково это, что работает, что нет. Понимаем сегодняшние вызовы—<span className="font-semibold text-gold-light">не из учебников, из опыта.</span>
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            {[
              {
                title: "Маленькая команда, большое влияние",
                description: "В отличие от крупных фирм, где вы просто номер, наша небольшая команда означает, что каждый консультант обладает опытом высшего уровня. Вы работаете напрямую с тем, кто сам через это прошел—недавно.",
                footer: "Каждый член команды отобран за превосходство",
                delay: 0
              },
              {
                title: "Личное внимание",
                description: "Крупные фирмы берут высокие цены, но распыляют менторов. Мы держим нагрузку управляемой—вы получаете целенаправленную поддержку без наценки.",
                footer: "Ваш успех—наша миссия, а не просто еще одна метрика",
                delay: 0.1
              },
              {
                title: "Глобальные стандарты, местный доступ",
                description: "Мы приносим первоклассную западную методологию консалтинга и ресурсы непосредственно к вам. Полная двуязычная поддержка на английском и русском означает, что ничего не теряется в переводе.",
                footer: "Мировой подход, доступный и личный",
                delay: 0.2
              },
              {
                title: "Доказанные результаты",
                description: "Получено $500K+ стипендий с более чем 10-летним совокупным опытом в Йеле, Гарварде, Кембридже и Цинхуа. Реальные успехи, проверенные стратегии.",
                footer: "Опыт подтвержден реальными результатами",
                delay: 0.3
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: item.delay }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <Card className="p-4 md:p-8 space-y-3 md:space-y-4 glass-card border-gold/30 hover:border-gold/50 shadow-premium hover:shadow-premium-hover transition-all h-full group">
                  <h3 className="text-lg md:text-2xl font-bold text-gold group-hover:text-gold-light transition-colors">{item.title}</h3>
                  <p className="text-xs md:text-base text-primary-foreground/90">
                    {item.description}
                  </p>
                  <div className="pt-3 md:pt-4 border-t border-gold/20">
                    <p className="text-xs md:text-sm text-gold-light font-medium">{item.footer}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Our Philosophy - made smaller */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 glass-card border-gold/30 shadow-premium hover:shadow-premium-hover transition-all">
              <div className="max-w-3xl mx-auto space-y-4 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gold animate-pulse-glow">Идеальные оценки не требуются</h2>
                <p className="text-base text-primary-foreground/90">
                  Топовые университеты не только для "идеальных" студентов. Наша команда столкнулась с различиями в обучении, культурными барьерами, финансовыми ограничениями и неудачами. Мы учились на этих трудностях—теперь помогаем вам избежать тех же ошибок.
                </p>
                <p className="text-base text-gold-light font-medium">
                  Низкие оценки? Необычное происхождение? Уникальные трудности? Это делает заявления убедительными. Мы помогаем студентам сделать их лучший шанс, откуда бы они ни начинали.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Card className="p-12 glass-card border-gold/40 text-center space-y-6 shadow-glow hover:shadow-premium-hover transition-all">
              <h2 className="text-3xl md:text-4xl font-bold text-gold animate-shimmer">Готовы начать свой путь?</h2>
              <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                Присоединяйтесь к студентам, которые выбрали персонализированную экспертизу вместо корпоративных консалтинговых фабрик.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    className="btn-premium"
                    onClick={() => navigate("/offerings/ru")}
                  >
                    Посмотреть наши пакеты
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-gold/50 text-gold hover:bg-gold/10 hover:text-gold-light"
                    onClick={() => navigate("/team/ru")}
                  >
                    Познакомьтесь с нашей командой
                  </Button>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default WhyTURu;
