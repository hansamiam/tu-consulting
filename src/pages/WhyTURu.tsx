import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Users, Target, Award, Heart, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const WhyTURu = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Navigation language="ru" />
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ru")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад на главную
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent">
              Почему Top Uni?
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Компактная команда. Реальный опыт. Личное внимание. Без корпоративной наценки.
            </p>
          </div>

          {/* Forbes Section - Moved to top */}
          <Card className="p-10 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30 shadow-xl">
            <div className="max-w-4xl mx-auto space-y-6 text-center">
              <p className="text-2xl md:text-3xl text-foreground leading-relaxed">
                <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-bold">Forbes</a> утверждает: самый важный фактор успеха консалтинга—<span className="font-bold">насколько хорошо менторы понимают студентов.</span>
              </p>
              <div className="border-t-2 border-accent/30 pt-6 mt-6">
                <p className="text-xl md:text-2xl text-primary font-bold mb-3">
                  Разница TopUni:
                </p>
                <p className="text-lg text-foreground">
                  Мы <span className="font-semibold">только что из процесса</span>. Помним, каково это, что работает, что нет. Понимаем сегодняшние вызовы—<span className="font-semibold">не из учебников, из опыта.</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-primary">Маленькая команда, большое влияние</h3>
              <p className="text-muted-foreground">
                В отличие от крупных фирм, где вы просто номер, наша небольшая команда означает, что каждый консультант обладает опытом высшего уровня. Мы приносим первоклассную западную методологию консалтинга и ресурсы непосредственно к вам—двуязычная поддержка на английском и русском означает, что ничего не теряется в переводе.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Каждый член команды отобран за превосходство</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-primary/30 bg-gradient-to-br from-card/80 to-primary/5 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-primary">Личное внимание</h3>
              <p className="text-muted-foreground">
                Крупные фирмы берут высокие цены, но распыляют менторов. Мы держим нагрузку управляемой—вы получаете целенаправленную поддержку без наценки, с тем же высоким подходом, который используют премиальные западные консалтинговые фирмы.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Ваш успех—наша миссия, а не просто еще одна метрика</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-accent/30 bg-gradient-to-br from-card/80 to-gold/5 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-primary">Глобальный опыт</h3>
              <p className="text-muted-foreground">
                Многим местным консультантам не хватает международного охвата. Наша команда прошла приемные комиссии на континентах и понимает разные системы из первых рук с <span className="font-semibold">более чем 10-летним совокупным опытом работы с 150+ студентами</span>. Мы объединяем глобальные стандарты с местной доступностью.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Йель, Гарвард, Кембридж, Цинхуа—мы были там</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-primary">Доказанные результаты</h3>
              <p className="text-muted-foreground">
                Получено <span className="font-semibold">$500K+ стипендий</span> через строгие процессы. Наш опыт не теоретический—он доказан реальными успехами и неудачами.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Проверенные стратегии, которые действительно работают</p>
              </div>
            </Card>
          </div>

          {/* Our Philosophy - made smaller */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-gold/5 border-primary/20">
            <div className="max-w-3xl mx-auto space-y-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">Идеальные оценки не требуются</h2>
              <p className="text-base text-muted-foreground">
                Топовые университеты не только для "идеальных" студентов. Наша команда столкнулась с различиями в обучении, культурными барьерами, финансовыми ограничениями и неудачами. Мы учились на этих трудностях—теперь помогаем вам избежать тех же ошибок.
              </p>
              <p className="text-base text-foreground font-medium">
                Низкие оценки? Необычное происхождение? Уникальные трудности? Это делает заявления убедительными. Мы помогаем студентам сделать их лучший шанс, откуда бы они ни начинали.
              </p>
            </div>
          </Card>

          {/* CTA Section */}
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Готовы начать свой путь?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Присоединяйтесь к студентам, которые выбрали персонализированную экспертизу вместо корпоративных консалтинговых фабрик.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="gold"
                onClick={() => navigate("/offerings/ru")}
              >
                Посмотреть наши пакеты
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/team/ru")}
              >
                Познакомьтесь с нашей командой
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WhyTURu;
