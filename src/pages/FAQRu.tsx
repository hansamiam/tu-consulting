import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import heroImage from "@/assets/hero-campus.jpg";

const FAQRu = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Почему TopUni?",
      answer: "Мы другие. Это правда, что наши консультанты из Йеля, Гарварда, Кембриджа и Университета Цинхуа достигли больших успехов за годы—но в то же время мы столкнулись с немалой долей вызовов, неудач, ошибок и учились на них. Именно поэтому мы можем вам помочь. Мы прошли через реальные трудности процесса подачи заявок, преодолели их и знаем, как их преодолеть. Плюс, мы заполняем пробел, который другие не могут: крупные фирмы дают минимум внимания несмотря на премиальные цены, а небольшие сервисы часто не имеют глобального опыта и проверенных результатов. Мы предлагаем мировой опыт с искренним личным вниманием по доступным ценам."
    },
    {
      question: "Кто ваши консультанты?",
      answer: "Нынешние студенты и недавние выпускники ведущих университетов (Йель, Гарвард, Кембридж, Университет Цинхуа), которые преуспели в естественных науках, социальных науках и гуманитарных науках. Они лично выиграли престижные стипендии, прошли конкурентные поступления и понимают, что для этого нужно, потому что сами через это прошли. Что важнее, они помнят трудности и знают, как провести вас через ваши."
    },
    {
      question: "Для кого это?",
      answer: "Для всех, кто стремится к амбициозным образовательным и карьерным целям. Мы работаем со школьниками, поступающими на бакалавриат, абитуриентами в магистратуру (магистратура, аспирантура, MBA), специалистами ранней и средней карьеры, ищущими карьерный коучинг и профессиональное развитие, учениками средней школы, готовящимися к внеклассным занятиям и строящими прочный фундамент, студентами, подающими заявки на конкурентные летние программы и школы-интернаты, соискателями работы, нуждающимися в подготовке заявок и собеседований, и всеми, кто проходит через образовательные переходы или карьерное продвижение. Будь вам 13 или 35, если вы стремитесь к совершенству, мы здесь, чтобы помочь."
    },
    {
      question: "Нужны ли мне идеальные оценки для работы с вами?",
      answer: "Абсолютно нет. Мы специализируемся на помощи студентам из всех слоев общества и обстоятельств — будь то низкие оценки, уникальные трудности, нетрадиционные пути или просто нужна помощь, чтобы сделать все возможное. Вам не нужно быть отличником, чтобы получить пользу от экспертного консалтинга. На самом деле, мы приветствуем и поощряем вас—тем более, что гораздо более впечатляющая история ждёт быть написанной. Наша работа — помочь вам представить самую сильную заявку с любой отправной точки. Каждый студент заслуживает шанса достичь своей мечты."
    },
    {
      question: "Предлагаете ли вы бесплатные консультации?",
      answer: "Нет—мы считаем, что наши клиенты должны получать ценность с самой первой минуты. Многие фирмы предлагают \"бесплатные\" консультации, но это часто короткие вводные звонки, сосредоточенные на объяснении пакетов, а не на предоставлении практических рекомендаций. Мы применяем другой подход: каждая консультация, которую мы предлагаем, включая наши вводные сессии, предоставляет реальные идеи и подлинную экспертизу, адаптированную к вашей ситуации. Мы серьезно относимся к вашему времени и считаем, что качественный консалтинг требует подготовки и сосредоточенности. Вот почему все наши консультации платные—и именно поэтому они приносят немедленную ценность."
    },
    {
      question: "Это только для заявок в Лигу Плюща / Оксбридж?",
      answer: "Нет! Хотя наши консультанты имеют опыт Лиги Плюща и Оксбриджа, мы помогаем студентам подавать заявки в ведущие университеты по всему миру — США, Великобритания, Канада, Европа, Китай и далее. Независимо от того, стремитесь ли вы в Гарвард, Оксфорд, Макгилл или Университет Цинхуа, у нас есть опыт. Мы фокусируемся на поиске правильного варианта для ВАС, а не просто самого престижного названия."
    }
  ];

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/ru")}
            className="flex items-center gap-2 text-foreground hover:text-accent"
          >
            <ArrowLeft size={20} />
            Назад на главную
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-6 md:mb-12 animate-fade-in">
          <div className="inline-block">
            <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-2 px-2">
              Часто задаваемые вопросы
            </h1>
            <div className="h-1 w-20 md:w-32 bg-gradient-to-r from-primary to-gold mx-auto rounded-full mb-3 md:mb-4"></div>
          </div>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            О чём чаще всего спрашивают студенты и родители.
          </p>
        </div>

        {/* FAQ Accordion */}
        <Card className="border-gold/20 bg-card/50 backdrop-blur-sm shadow-xl animate-enter">
          <CardHeader className="pb-4 md:pb-6">
            <CardTitle className="text-lg md:text-2xl text-primary">Быстрые ответы</CardTitle>
            <CardDescription className="text-xs md:text-base">
              Не можете найти то, что ищете? Напишите нам на{" "}
              <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">
                team@topuniconsulting.com
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-sm md:text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs md:text-sm text-muted-foreground whitespace-pre-line">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="mt-12 p-8 bg-gradient-to-br from-primary/5 to-gold/5 border-primary/20 text-center space-y-4">
          <p className="text-lg text-foreground font-medium">Готовы попробовать?</p>
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
              className="border-primary/30"
            >
              Познакомиться с командой
            </Button>
          </div>
        </Card>
      </main>

      {/* Footer */}
      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <Footer language="ru" variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default FAQRu;
