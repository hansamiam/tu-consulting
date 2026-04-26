import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { Compass, Brain, Globe2, Sparkles, Target, BookOpen, Users } from "lucide-react";

const WhyTURu = () => {
  const navigate = useNavigate();

  const differences = [
    {
      icon: Compass,
      title: "Стратегия до поиска",
      body: "Мы не просто показываем варианты. Мы помогаем понять, какие университеты и стипендии подходят под твои оценки, бюджет, цели, страну, сроки и силу профиля.",
    },
    {
      icon: Brain,
      title: "AI-инструменты с экспертной логикой",
      body: "Наши инструменты ускоряют работу, но логика — от реального опыта поступления. Мы соединяем структурированные данные, персональные рекомендации и экспертную проверку, когда это нужно.",
    },
    {
      icon: Globe2,
      title: "Создано для международных студентов",
      body: "Большинство платформ построены под США или Великобританию. Top Uni спроектирован для тех, кто поступает через границы — особенно из Центральной Азии и других регионов с ограниченным доступом.",
    },
    {
      icon: Sparkles,
      title: "Премиум-помощь без корпоративной наценки",
      body: "Большие фирмы дороги и обезличены. Мы держим модель компактной: сначала полезные инструменты, экспертная поддержка — там, где это важно, и никаких лишних слоёв.",
    },
  ];

  const productCards = [
    {
      icon: Target,
      title: "Реалистичные стипендии",
      body: "Получи ранжированный список стипендий по критериям: подходишь ли, размер финансирования, срочность дедлайна, усилия и фит.",
    },
    {
      icon: BookOpen,
      title: "Построй план поступления",
      body: "Пойми, какие университеты — амбиция, цель, и страховка, и что нужно усилить до подачи.",
    },
    {
      icon: Users,
      title: "Экспертная помощь, когда нужно",
      body: "Записывайся на консультации по эссе, выбору школ, стратегии стипендий, интервью и финальным решениям.",
    },
  ];

  const faqs = [
    {
      question: "Почему Top Uni?",
      answer: "Потому что мы соединяем три вещи, которые студентам обычно приходится искать раздельно: структурированные данные о стипендиях, AI-планирование поступления и экспертные советы от тех, кто сам прошёл топовые университеты.",
    },
    {
      question: "Для кого это?",
      answer: "Школьники, студенты бакалавриата, магистры, аспиранты и профессионалы, которые подают на университеты, стипендии, летние программы или международные возможности.",
    },
    {
      question: "Нужны ли идеальные оценки?",
      answer: "Нет. Сильные оценки помогают, но это не единственный фактор. Мы помогаем понять, где ты конкурентен, где тянешься, и как честно и стратегически представить свой профиль.",
    },
    {
      question: "Это только для Лиги Плюща и Оксбриджа?",
      answer: "Нет. Мы помогаем подавать в университеты и на стипендии в США, Великобритании, Канаде, Европе, Азии и других регионах. Цель — фит, финансирование и долгосрочные возможности, а не только престиж.",
    },
    {
      question: "Есть ли бесплатные консультации?",
      answer: "Мы делаем платные консультации, потому что они дают реальную, персонализированную пользу с первой встречи, а не работают как продажа. До бронирования можно изучать инструменты и материалы.",
    },
    {
      question: "Top Uni — это AI-инструмент или консалтинг?",
      answer: "И то, и другое. Платформа помогает двигаться быстрее со структурированными рекомендациями, а консалтинг доступен для решений, которым нужна экспертная оценка.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="ru" />

      <section className="bg-primary py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 tracking-tight">
            Почему <span className="text-gold">Top Uni</span>?
          </h1>
          <p className="text-base sm:text-lg text-primary-foreground/75 max-w-2xl mx-auto leading-relaxed">
            Большинству студентов не нужны очередные списки университетов. Им нужна понятная стратегия:
            куда подавать, какие стипендии реальны и как усилить свой профиль.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")}>
              Получить план поступления
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/discover/ru")}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Смотреть стипендии
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-5 tracking-tight">
            Проблема не в амбициях. Проблема — в отсутствии чёткой стратегии.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-4">
            Многие студенты способны, но теряют месяцы, потому что не знают:
          </p>
          <ul className="space-y-2 text-foreground/85 text-base">
            <li>— какие университеты реалистичны</li>
            <li>— какие стипендии стоят подачи</li>
            <li>— как позиционировать свой бэкграунд</li>
            <li>— когда целиться выше, а когда быть стратегом</li>
            <li>— как не потратить месяцы на неподходящие варианты</li>
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-10 tracking-tight">
            В чём отличие Top Uni
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {differences.map((d) => {
              const Icon = d.icon;
              return (
                <Card key={d.title} className="p-6 sm:p-7 hover:border-accent/40 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-6 tracking-tight">
            Реальный опыт, а не пересказанные советы
          </h2>
          <ul className="space-y-3 text-foreground/85 text-base">
            <li className="flex gap-3"><span className="text-gold">·</span><span>Команда с опытом в Yale, Harvard, Cambridge, Tsinghua и других ведущих университетах.</span></li>
            <li className="flex gap-3"><span className="text-gold">·</span><span>Более $500K стипендий выиграно нашими студентами.</span></li>
            <li className="flex gap-3"><span className="text-gold">·</span><span>Опыт по бакалавриату, магистратуре, стипендиям, летним программам и международным заявкам.</span></li>
            <li className="flex gap-3"><span className="text-gold">·</span><span>Поддержка на английском и русском.</span></li>
          </ul>
          <p className="text-xs text-muted-foreground mt-6 italic">
            Мы не гарантируем поступление. Мы помогаем построить максимально сильную и реалистичную заявку для подходящих целей.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-muted/30 border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-5 tracking-tight">
            Идеальные оценки не нужны для сильной заявки.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-6">
            Топовые университеты и стипендии конкурентны, но они не только для отличников.
            Сильные заявки часто приходят от студентов с неровными оценками, финансовыми ограничениями,
            необычным бэкграундом, особенностями обучения или нелинейной историей.
            Главное — выбрать правильные цели и понятно объяснить свой путь.
          </p>
          <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")}>
            Найти подходящие варианты
          </Button>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-10 tracking-tight">
            Что можно сделать с Top Uni
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {productCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.title} className="p-6 sm:p-7 hover:border-accent/40 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-8 tracking-tight">
            Частые вопросы
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 flex flex-wrap gap-3">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")}>
              Получить план поступления
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/offerings/ru")}>
              Смотреть консалтинг
            </Button>
          </div>
        </div>
      </section>

      <Footer language="ru" />
    </div>
  );
};

export default WhyTURu;
