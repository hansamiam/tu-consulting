import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Star, ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import heroCampus from "@/assets/hero-campus.jpg";
import heroLibrary from "@/assets/hero-library.jpg";
import yaleCampus from "@/assets/yale-campus.jpg";

const OfferingsRu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    currentGrade: "",
    targetUniversities: "",
    intendedMajor: "",
    currentChallenges: "",
    goals: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (consultationType: string) => {
    if (!formData.name || !formData.email) {
      toast({
        title: "Необходимые поля не заполнены",
        description: "Пожалуйста, укажите ваше имя и email",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Форма отправлена!",
      description: "Мы свяжемся с вами в ближайшее время для планирования консультации.",
    });

    setFormData({
      name: "",
      email: "",
      phone: "",
      currentGrade: "",
      targetUniversities: "",
      intendedMajor: "",
      currentChallenges: "",
      goals: "",
    });
  };

  const packages = [
    {
      name: "Стартовый пакет",
      originalPrice: "$899",
      price: "$764",
      discount: "Скидка 15%",
      hours: "5 часов",
      features: [
        "5 часов комплексных консультаций",
        "Планирование сроков подачи",
        "Помощь в выборе университета",
        "Пробное рассмотрение заявки и обратная связь",
        "Поддержка с рекомендательными письмами",
        "Поддержка по email между сессиями",
      ],
      popular: false,
    },
    {
      name: "Стандартный пакет",
      originalPrice: "$1,599",
      price: "$1,199",
      discount: "Скидка 25%",
      hours: "10 часов",
      features: [
        "10 часов комплексных консультаций",
        "Полная проверка заявки",
        "Редактирование эссе",
        "Пробное рассмотрение заявки и обратная связь",
        "Поддержка с рекомендательными письмами",
        "Подготовка к интервью",
        "Приоритетная поддержка по email",
      ],
      popular: true,
    },
    {
      name: "Премиум пакет",
      badge: "Максимальная поддержка",
      originalPrice: "$2,999",
      price: "$1,949",
      discount: "Скидка 35%",
      hours: "20 часов",
      features: [
        "20 часов комплексных консультаций",
        "Полное управление заявкой",
        "Неограниченные правки эссе",
        "Пробное рассмотрение заявки и обратная связь",
        "Стратегия и проверка рекомендательных писем",
        "Пробные интервью (3 сессии)",
        "Приоритетная поддержка",
        "Персональная стратегия успеха",
        "Поддержка после подачи",
      ],
      popular: false,
    },
  ];

  const packageBackgrounds = [heroCampus, heroLibrary, yaleCampus];

  const consultations = [
    {
      name: "Быстрая консультация",
      price: "$60",
      duration: "25 минут",
      description: "Идеально для первого разговора и вопросов",
      features: [
        "Узнать о вашем опыте",
        "Обсудить ваши цели",
        "Изучить варианты пакетов",
      ],
    },
    {
      name: "Углубленная консультация",
      price: "$100",
      duration: "50 минут",
      description: "Расширенная сессия для обсуждения вашего пути",
      features: [
        "Комплексное обсуждение",
        "Первичная оценка",
        "Рекомендации по пакетам",
        "Вопросы и ответы",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="ru" />
      <header className="border-b border-border bg-card sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/ru")}
            className="flex items-center gap-2 text-foreground hover:text-accent"
          >
            <ArrowLeft size={20} />
            На главную
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-accent/10 border border-accent/20 rounded-full mb-4">
            <p className="text-accent font-semibold text-sm uppercase tracking-wide">Специальное предложение запуска</p>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Наши услуги и цены
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Выберите идеальный пакет для достижения ваших целей при поступлении в университет
          </p>
        </div>

        <section className="mb-20">
          <h2 className="font-heading text-3xl font-bold text-center mb-12 text-foreground">
            Консультационные пакеты
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {packages.map((pkg, index) => (
              <Card
                key={index}
                className={`relative ${
                  pkg.popular
                    ? "border-accent shadow-lg scale-105 bg-gradient-to-br from-accent/5 to-transparent"
                    : "border-border"
                }`}
                style={{
                  backgroundImage: `linear-gradient(hsla(var(--background)/0.9), hsla(var(--background)/0.9)), url(${packageBackgrounds[index]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {pkg.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star size={14} fill="currentColor" />
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-2xl mb-2">{pkg.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-muted-foreground line-through">
                        {pkg.originalPrice}
                      </span>
                      <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                        {pkg.discount}
                      </span>
                    </div>
                    <div className="text-4xl font-bold text-accent">{pkg.price}</div>
                  </div>
                  <CardDescription className="text-base pt-2">
                    {pkg.hours}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="text-accent flex-shrink-0 mt-0.5" size={20} />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={pkg.popular ? "gold" : "default"}
                    className="w-full"
                    onClick={() => {
                      toast({
                        title: "Скоро!",
                        description: "Бронирование пакетов скоро будет доступно.",
                      });
                    }}
                  >
                    Выбрать пакет
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold mb-4 text-foreground">
              Ещё не готовы?
            </h2>
            <p className="text-muted-foreground text-lg">
              Начните с пробной консультации, чтобы познакомиться с нашим сервисом
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {consultations.map((consultation, index) => (
              <Card key={index} className="border-border">
                <CardHeader>
                  <CardTitle className="text-xl">{consultation.name}</CardTitle>
                  <div className="flex items-baseline gap-2 pt-2">
                    <span className="text-3xl font-bold text-accent">{consultation.price}</span>
                    <span className="text-muted-foreground">/ {consultation.duration}</span>
                  </div>
                  <CardDescription className="pt-2">{consultation.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {consultation.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="text-accent flex-shrink-0 mt-0.5" size={18} />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const formSection = document.getElementById("consultation-form");
                      formSection?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Забронировать
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="consultation-form" className="max-w-3xl mx-auto">
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Максимизируйте вашу консультацию</CardTitle>
              <CardDescription className="text-base">
                Помогите нам подготовиться к вашей сессии, поделившись информацией. Чем больше деталей вы предоставите,
                тем больше пользы вы получите от консультации.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Полное имя *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Иван Иванов"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="ivan@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+7123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentGrade">Текущий класс/курс</Label>
                    <Input
                      id="currentGrade"
                      name="currentGrade"
                      value={formData.currentGrade}
                      onChange={handleInputChange}
                      placeholder="например, 11 класс"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetUniversities">Целевые университеты</Label>
                  <Textarea
                    id="targetUniversities"
                    name="targetUniversities"
                    value={formData.targetUniversities}
                    onChange={handleInputChange}
                    placeholder="Перечислите университеты, которые вас интересуют..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intendedMajor">Планируемая специальность</Label>
                  <Input
                    id="intendedMajor"
                    name="intendedMajor"
                    value={formData.intendedMajor}
                    onChange={handleInputChange}
                    placeholder="например, Компьютерные науки, Бизнес"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentChallenges">Текущие трудности</Label>
                  <Textarea
                    id="currentChallenges"
                    name="currentChallenges"
                    value={formData.currentChallenges}
                    onChange={handleInputChange}
                    placeholder="Какие основные проблемы или трудности у вас с процессом подачи документов?"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">Чего вы хотите достичь от этой консультации?</Label>
                  <Textarea
                    id="goals"
                    name="goals"
                    value={formData.goals}
                    onChange={handleInputChange}
                    placeholder="Будьте конкретны в том, что вы хотите получить от нашей сессии..."
                    rows={4}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="gold"
                    className="flex-1"
                    onClick={() => handleFormSubmit("25min")}
                  >
                    Забронировать 25-мин ($60)
                  </Button>
                  <Button
                    type="button"
                    variant="gold"
                    className="flex-1"
                    onClick={() => handleFormSubmit("50min")}
                  >
                    Забронировать 50-мин ($100)
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Cohort Intake Section */}
        <section id="cohort-section" className="mt-20">
          <Card className="border-accent/30 bg-gradient-to-br from-accent/10 via-gold/5 to-primary/5 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="inline-block mx-auto px-4 py-2 bg-accent/20 border border-accent/30 rounded-full mb-2">
                <p className="text-accent font-semibold text-sm">ПЕРВАЯ КОГОРТА - СКОРО ЗАПУСК</p>
              </div>
              <CardTitle className="text-3xl md:text-4xl bg-gradient-to-r from-gold to-primary bg-clip-text text-transparent">Присоединяйтесь к нашей первой когорте</CardTitle>
              <CardDescription className="text-base max-w-2xl mx-auto mt-4">
                Станьте частью нашей первой когорты и получите исключительное внимание на старте. 
                <span className="block mt-2 text-accent font-medium">
                  Члены первой когорты получают внимание премиум-уровня по стандартной цене.
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-foreground font-semibold text-lg mb-2">Почему присоединиться к первой когорте?</p>
                <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-lg mx-auto">
                  <li className="flex items-start gap-2">
                    <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                    <span>Скидка для первой когорты: 40%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                    <span>Дополнительное внимание, пока мы совершенствуем процесс с первыми участниками</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                    <span>Приоритетное планирование и быстрая обработка</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                    <span>Ограниченные места обеспечивают персональное руководство для вашего цикла подачи</span>
                  </li>
                </ul>
              </div>
              <Button
                variant="gold"
                size="lg"
                onClick={() => {
                  toast({
                    title: "Скоро!",
                    description: "Прием в когорту откроется в ближайшее время. Присоединяйтесь к списку ожидания на главной странице!",
                  });
                }}
              >
                Подать заявку в первую когорту
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Trust Section */}
        <section className="mt-20 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-muted-foreground">
              🎓 Все консультации проводятся консультантами из топовых университетов, включая Yale, Harvard, Cambridge и Tsinghua
            </p>
            <p className="text-muted-foreground">
              🌍 Доступно на русском и английском языках
            </p>
            <p className="text-sm text-muted-foreground">
              Вопросы? Напишите нам:{" "}
              <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">
                team@topuniconsulting.com
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OfferingsRu;
