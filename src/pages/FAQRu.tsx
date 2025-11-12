import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const FAQRu = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Почему TopUni Consulting?",
      answer: "Мы другие. Наши консультанты из Йеля, Гарварда, Кембриджа и Университета Цинхуа не имели идеальных путей — мы сталкивались с неудачами, совершали ошибки и учились на них. Именно поэтому мы можем вам помочь. Мы прошли через реальные трудности процесса подачи заявок и знаем, как их преодолеть. Плюс, мы заполняем пробел, который другие не могут: крупные фирмы дают минимум внимания несмотря на премиальные цены, а небольшие сервисы часто не имеют глобального опыта и проверенных результатов. Мы предлагаем мировой опыт с искренним личным вниманием по доступным ценам."
    },
    {
      question: "Кто ваши консультанты?",
      answer: "Нынешние студенты и недавние выпускники ведущих университетов (Йель, Гарвард, Кембридж, Университет Цинхуа), которые преуспели в различных дисциплинах — STEM, гуманитарные науки, бизнес и искусство. Они лично выиграли престижные стипендии, прошли конкурентные поступления и понимают, что для этого нужно, потому что сами через это прошли. Что важнее, они помнят трудности и знают, как провести вас через ваши."
    },
    {
      question: "Нужны ли мне идеальные оценки для работы с вами?",
      answer: "Абсолютно нет. Мы специализируемся на помощи студентам из всех слоев общества и обстоятельств — будь то низкие оценки, уникальные трудности, нетрадиционные пути или просто нужна помощь, чтобы сделать все возможное. Вам не нужно быть отличником, чтобы получить пользу от экспертного консалтинга. Наша работа — помочь вам представить самую сильную заявку с любой отправной точки. Каждый студент заслуживает шанса достичь своей мечты."
    },
    {
      question: "Это только для заявок в Лигу Плюща?",
      answer: "Нет! Хотя наши консультанты имеют опыт Лиги Плюща, мы помогаем студентам подавать заявки в ведущие университеты по всему миру — США, Великобритания, Канада, Европа, Китай и далее. Независимо от того, стремитесь ли вы в Гарвард, Оксфорд, Макгилл или Университет Цинхуа, у нас есть опыт. Мы фокусируемся на поиске правильного варианта для ВАС, а не просто самого престижного названия."
    },
    {
      question: "Как начать?",
      answer: "Забронируйте пробную консультацию (25 или 50 минут) на нашей странице Услуги и цены. Эта сессия с низкими обязательствами позволит вам познакомиться с нами, обсудить вашу ситуацию и понять, подходим ли мы друг другу. Без давления — просто разговор о ваших целях и о том, как мы можем помочь вам их достичь."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-foreground hover:text-accent"
          >
            <ArrowLeft size={20} />
            Назад на главную
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
            Часто задаваемые вопросы
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Всё, что вам нужно знать о TopUni Consulting и наших услугах
          </p>
        </div>

        {/* FAQ Accordion */}
        <Card>
          <CardHeader>
            <CardTitle>Общие вопросы</CardTitle>
            <CardDescription>
              Не можете найти то, что ищете? Напишите нам на team@topuniconsulting.com
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-muted-foreground">Готовы начать?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gold"
              size="lg"
              onClick={() => navigate("/offerings/ru")}
            >
              Просмотреть услуги и цены
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/team/ru")}
            >
              Познакомиться с командой
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAQRu;
