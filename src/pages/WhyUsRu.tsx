import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft, Users, Target, Award, Heart, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const WhyUsRu = () => {
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
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ru")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад на главную
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent">
              Почему TopUni Consulting?
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Мы не просто еще одна консалтинговая компания. Мы небольшая, увлеченная команда, которая привносит реальный опыт и персонализированное внимание к каждому студенту.
            </p>
          </div>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-accent/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Маленькая команда, большое влияние</h3>
              <p className="text-muted-foreground">
                В отличие от крупных корпоративных фирм, где вы просто еще один номер, наша намеренно небольшая команда гарантирует, что каждый участник привносит качество высшего уровня и уникальный опыт. Вы работаете напрямую с опытными консультантами, которые сами прошли через этот процесс.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Каждый член команды отобран за превосходство</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-primary/30 bg-gradient-to-br from-card/80 to-primary/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Персонализированное внимание</h3>
              <p className="text-muted-foreground">
                Крупные фирмы берут высокие цены, но распыляют своих менторов слишком тонко. Мы поддерживаем управляемое количество клиентов, чтобы вы получали целенаправленную, персонализированную поддержку, которую заслуживаете—без корпоративной наценки.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Ваш успех—наша миссия, а не просто еще одна метрика</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-accent/30 bg-gradient-to-br from-card/80 to-gold/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-gold/20 flex items-center justify-center">
                <Award className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Настоящий глобальный опыт</h3>
              <p className="text-muted-foreground">
                Многим местным консультантам не хватает всестороннего международного опыта. Наша команда прошла через приемные комиссии на нескольких континентах, получила значительные стипендии и понимает разнообразные образовательные системы из первых рук.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Йель, Гарвард, Кембридж, Цинхуа—мы были там</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-primary/20 flex items-center justify-center">
                <Target className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Реальный послужной список</h3>
              <p className="text-muted-foreground">
                Мы обеспечили более $500K стипендий и сами прошли через строгие процессы приема. Наш опыт не теоретический—он доказан нашими собственными успехами и неудачами.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Проверенные стратегии, которые действительно работают</p>
              </div>
            </Card>
          </div>

          {/* Our Philosophy */}
          <Card className="p-12 bg-gradient-to-br from-primary/5 via-accent/5 to-gold/5 border-primary/20">
            <div className="max-w-4xl mx-auto space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gold/30 to-primary/30 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-gold" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Вам не нужны идеальные оценки, чтобы работать с нами</h2>
              <p className="text-lg text-muted-foreground">
                Топовые университеты не только для "идеальных" студентов. Наша команда столкнулась с трудностями—различия в обучении, культурные барьеры, финансовые ограничения, академические неудачи. Мы извлекли ценные уроки из этих трудностей, и мы здесь, чтобы вы не повторили те же ошибки.
              </p>
              <p className="text-lg text-foreground font-medium">
                Ваши уникальные обстоятельства—будь то более низкие оценки, необычное происхождение или специфические трудности—это именно то, что может сделать ваше заявление убедительным. Мы специализируемся на том, чтобы помочь студентам сделать лучший возможный шанс, независимо от того, с чего они начинают.
              </p>
            </div>
          </Card>

          {/* Forbes Article Quote */}
          <Card className="p-8 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
            <div className="max-w-4xl mx-auto space-y-4">
              <p className="text-lg text-muted-foreground italic">
                По данным <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">Forbes</a>, самый критический фактор успеха консалтинга по приему — это насколько хорошо менторы действительно понимают своих студентов.
              </p>
              <p className="text-base text-foreground font-medium">
                Мы молоды и только что вышли из процесса сами—мы помним точно, каково это, что работает и что нет. Наша близость к опыту означает, что мы искренне понимаем сегодняшние вызовы и можем относиться к вашим трудностям так, как отдаленные консультанты просто не могут.
              </p>
            </div>
          </Card>

          {/* Comparison Infographic */}
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
              Как мы сравниваем
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Large Corporate Firms */}
              <Card className="p-6 space-y-4 bg-destructive/5 border-destructive/20">
                <h3 className="text-xl font-bold text-foreground text-center">Крупные корпоративные фирмы</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Высокие цены, ограниченное время ментора</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Менторы часто недоплачены и перегружены</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Шаблонный подход в масштабе</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Завышенная статистика успеха—позволяют подавать только туда, где у вас уже высокие шансы</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Трудно получить персонализированное внимание</p>
                  </div>
                </div>
              </Card>

              {/* Us */}
              <Card className="p-6 space-y-4 bg-gradient-to-br from-gold/10 to-primary/10 border-gold/40 shadow-xl scale-105">
                <h3 className="text-xl font-bold text-primary text-center">TopUni Consulting</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Конкурентные цены, выделенное время</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Каждый член команды сильно вовлечен</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Персонализированные стратегии для вашей истории</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Прямой доступ к опытным консультантам</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Проверенный послужной список: $500K+ стипендий</p>
                  </div>
                </div>
              </Card>

              {/* Small Local Consultants */}
              <Card className="p-6 space-y-4 bg-muted/30 border-muted">
                <h3 className="text-xl font-bold text-foreground text-center">Маленькие местные консультанты</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">Часто не хватает глобального опыта</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">Возможно, не прошли через топовые процессы</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">Ограниченный послужной список стипендий</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">Качество может значительно варьироваться</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Team Specializations Infographic */}
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
              Каждый член команды привносит уникальный опыт
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-3 border-gold/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Самуэль Хан</h3>
                <p className="text-sm text-gold font-medium">Со-основатель</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Стратегии обучения и поддержка СДВГ</p>
                  <p>• Иммигранты и студенты третьей культуры</p>
                  <p>• Специализация в естественных науках</p>
                  <p>• Экспертиза культурной адаптации</p>
                </div>
              </Card>

              <Card className="p-6 space-y-3 border-primary/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Нурзада Абдивалиева</h3>
                <p className="text-sm text-gold font-medium">Со-основатель</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Стипендии и стратегии финансирования</p>
                  <p>• Пути самофинансирования образования</p>
                  <p>• Убедительное повествование</p>
                  <p>• Фокус на социальных науках</p>
                </div>
              </Card>

              <Card className="p-6 space-y-3 border-accent/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Джош Хьюз</h3>
                <p className="text-sm text-gold font-medium">Ведущий консультант</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Заявки в магистратуру</p>
                  <p>• Стратегии сдачи тестов</p>
                  <p>• Академические исследования и доработка эссе</p>
                  <p>• Экспертиза в языках и гуманитарных науках</p>
                </div>
              </Card>

              <Card className="p-6 space-y-3 border-gold/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Айгуль Абдубаетова</h3>
                <p className="text-sm text-gold font-medium">Старший советник</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Экспертиза рекомендательных писем</p>
                  <p>• Карьерный коучинг и профессиональное развитие</p>
                  <p>• Профессионалы ранней и средней карьеры</p>
                  <p>• Институциональное консультирование и переговоры</p>
                  <p>• Международный нетворкинг</p>
                </div>
              </Card>
            </div>
          </div>

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

export default WhyUsRu;
