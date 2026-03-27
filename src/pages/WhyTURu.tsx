import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const WhyTURu = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "Почему TopUni?",
      answer: "Мы другие. Наши консультанты из Йеля, Гарварда, Кембриджа и Цинхуа достигли больших успехов — но в то же время мы столкнулись с вызовами, неудачами, ошибками и учились на них. Именно поэтому мы можем вам помочь. Мы прошли через реальные трудности процесса подачи заявок, преодолели их и знаем, как их навигировать. Мы предлагаем мировой опыт с искренним личным вниманием по доступным ценам."
    },
    {
      question: "Кто ваши консультанты?",
      answer: "Нынешние студенты и недавние выпускники ведущих университетов (Йель, Гарвард, Кембридж, Цинхуа), которые преуспели в естественных науках, социальных науках и гуманитарных науках. Они лично выиграли престижные стипендии, прошли конкурентные поступления и понимают, что для этого нужно, потому что сами через это прошли."
    },
    {
      question: "Для кого это?",
      answer: "Для всех, кто стремится к амбициозным образовательным и карьерным целям. Мы работаем со школьниками, поступающими на бакалавриат, абитуриентами в магистратуру, специалистами, ищущими карьерный коучинг, учениками средней школы и всеми, кто проходит через образовательные переходы. Будь вам 13 или 35, если вы стремитесь к совершенству — мы здесь, чтобы помочь."
    },
    {
      question: "Нужны ли мне идеальные оценки?",
      answer: "Абсолютно нет. Мы специализируемся на помощи студентам из всех слоев общества — будь то низкие оценки, уникальные трудности или нетрадиционные пути. Мы приветствуем и поощряем вас — тем более впечатляющая история ждёт быть написанной."
    },
    {
      question: "Предлагаете ли вы бесплатные консультации?",
      answer: "Нет — мы считаем, что наши клиенты должны получать ценность с самой первой минуты. Многие фирмы предлагают \"бесплатные\" консультации, но это часто короткие вводные звонки. Мы применяем другой подход: каждая консультация предоставляет реальные идеи и подлинную экспертизу, адаптированную к вашей ситуации."
    },
    {
      question: "Это только для Лиги Плюща / Оксбриджа?",
      answer: "Нет! Хотя наши консультанты имеют опыт Лиги Плюща и Оксбриджа, мы помогаем студентам подавать заявки в ведущие университеты по всему миру — США, Великобритания, Канада, Европа, Китай и далее. Мы фокусируемся на поиске правильного варианта для ВАС."
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
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ru")} className="gap-2 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Назад на главную
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16">
          <div className="text-center space-y-3 md:space-y-6 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent px-2">
              Почему Top Uni?
            </h1>
            <p className="text-sm md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Компактная команда. Реальный опыт. Личное внимание. Без корпоративной наценки.
            </p>
          </div>

          <Card className="p-6 md:p-10 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30 shadow-xl animate-enter">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 text-center">
              <p className="text-base md:text-2xl lg:text-3xl text-foreground leading-relaxed">
                <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-bold">Forbes</a> утверждает: самый важный фактор успеха консалтинга — <span className="font-bold">насколько хорошо менторы понимают студентов.</span>
              </p>
              <div className="border-t-2 border-accent/30 pt-4 md:pt-6 mt-4 md:mt-6">
                <p className="text-base md:text-xl lg:text-2xl text-primary font-bold mb-2 md:mb-3">Разница TopUni:</p>
                <p className="text-sm md:text-base lg:text-lg text-foreground">
                  Мы <span className="font-semibold">только что из процесса</span>. Помним, каково это, что работает, что нет. Понимаем сегодняшние вызовы — <span className="font-semibold">не из учебников, из опыта.</span>
                </p>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 animate-fade-in">
            {[
              { title: "Маленькая команда, большое влияние", text: "В отличие от крупных фирм, где вы просто номер, наша небольшая команда означает, что каждый консультант обладает опытом высшего уровня. Вы работаете напрямую с тем, кто сам через это прошел — недавно.", note: "Каждый член команды отобран за превосходство" },
              { title: "Личное внимание", text: "Крупные фирмы берут высокие цены, но распыляют менторов. Мы держим нагрузку управляемой — вы получаете целенаправленную поддержку без наценки.", note: "Ваш успех — наша миссия, а не просто еще одна метрика" },
              { title: "Глобальные стандарты, местный доступ", text: "Мы приносим первоклассную западную методологию консалтинга непосредственно к вам. Полная двуязычная поддержка на английском и русском.", note: "Мировой подход, доступный и личный" },
              { title: "Доказанные результаты", text: "Получено $500K+ стипендий с более чем 10-летним совокупным опытом в Йеле, Гарварде, Кембридже и Цинхуа. Реальные успехи, проверенные стратегии.", note: "Опыт подтвержден реальными результатами" },
            ].map((item) => (
              <Card key={item.title} className="p-4 md:p-8 space-y-3 md:space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
                <h3 className="text-lg md:text-2xl font-bold text-primary">{item.title}</h3>
                <p className="text-xs md:text-base text-muted-foreground">{item.text}</p>
                <div className="pt-3 md:pt-4 border-t border-border/50">
                  <p className="text-xs md:text-sm text-foreground font-medium">{item.note}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-gold/5 border-primary/20">
            <div className="max-w-3xl mx-auto space-y-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">Идеальные оценки не требуются</h2>
              <p className="text-base text-muted-foreground">
                Топовые университеты не только для «идеальных» студентов. Наша команда столкнулась с различиями в обучении, культурными барьерами, финансовыми ограничениями и неудачами.
              </p>
              <p className="text-base text-foreground font-medium">
                Низкие оценки? Необычное происхождение? Уникальные трудности? Это делает заявления убедительными.
              </p>
            </div>
          </Card>

          {/* FAQ Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-2">
                Часто задаваемые вопросы
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Не нашли ответ? Напишите нам на{" "}
                <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">team@topuniconsulting.com</a>
              </p>
            </div>
            <Card className="border-gold/20 bg-card/50 backdrop-blur-sm shadow-xl">
              <div className="p-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-sm md:text-base">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-xs md:text-sm text-muted-foreground whitespace-pre-line">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Card>
          </div>

          <Card className="p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Готовы начать свой путь?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Сделайте первый шаг к университету вашей мечты с экспертным сопровождением.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate("/offerings/ru")}>Посмотреть наши пакеты</Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/team/ru")}>Познакомьтесь с командой</Button>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <Footer language="ru" variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default WhyTURu;