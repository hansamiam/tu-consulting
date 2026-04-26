import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const WhyTURu = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="ru" />

      <section className="relative border-b border-border overflow-hidden bg-hero-soft">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            <div className="lg:col-span-8">
              <p className="label-mono text-accent mb-6">
                Почему Top Uni
              </p>
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight">
                Большинству нужны не <span className="text-muted-foreground/50">списки.</span>
                <br />
                А <span className="text-accent">стратегия.</span>
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                Куда подавать, какие стипендии реальны, и как усилить профиль.
                Вот настоящий вопрос.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")} className="gap-2">
                  Получить план <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate("/discover/ru")}>
                  Смотреть стипендии
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-14">
            <div className="lg:col-span-5">
              <p className="label-mono text-accent mb-4">
                01 — В чём отличие
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Не каталог. Не чат-бот. Решающий движок с экспертами.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-10">
              <p className="text-base text-muted-foreground leading-relaxed">
                Базы дают всё подряд. Универсальный AI — что угодно. Top Uni даёт четыре вещи,
                которые реально работают: ранжированный шорт-лист, реалистичный план по стипендиям,
                последовательность шагов и эксперта, когда ставки высоки.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              { n: "01", t: "Стратегия до поиска", b: "Ранжирование по твоим оценкам, бюджету, стране и срокам — а не по алфавиту." },
              { n: "02", t: "AI-инструменты, экспертная логика", b: "Структурированные данные и рекомендации, плюс эксперт там, где это важно." },
              { n: "03", t: "Создано для международников", b: "Учитывает реалии Центральной Азии и других регионов, а не только США." },
              { n: "04", t: "Премиум без наценки", b: "Сначала полезные инструменты, поддержка по запросу, без лишних слоёв." },
            ].map((d) => (
              <div key={d.n} className="bg-background p-7 lg:p-9 hover:bg-muted/30 transition-colors">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-mono text-xs text-accent">{d.n}</span>
                  <h3 className="font-heading font-semibold text-lg tracking-tight">{d.t}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="label-mono text-accent mb-4">
                02 — Доверие
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Реальный опыт. Не пересказанные советы.
              </h2>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                Мы не обещаем поступление. Мы помогаем построить максимально сильный
                и реалистичный профиль для подходящих целей.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { k: "$500K+", v: "Стипендий, выигранных нашими студентами" },
                { k: "Yale · Harvard · Cambridge · Tsinghua", v: "Где училась и выпустилась наша команда" },
                { k: "EN · RU", v: "Двуязычная поддержка" },
                { k: "UG · Магистр · Лето · Стипендии", v: "Типы заявок, с которыми мы работали" },
              ].map((s) => (
                <div key={s.v} className="border-l-2 border-accent/40 pl-5">
                  <div className="font-heading font-bold text-xl lg:text-2xl tracking-tight leading-tight">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 lg:px-10">
          <p className="label-mono text-accent mb-6">
            03 — Для тех, кто не идеален на бумаге
          </p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-6">
            Сильные заявки рождаются из <span className="text-accent">нелинейных историй.</span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-10">
            Топовые университеты и стипендии конкурентны — но не зарезервированы для
            идеальных аттестатов. Неровные оценки, финансовые ограничения, необычный бэкграунд,
            особенности обучения, gap year. Главное — выбрать правильные цели и рассказать свою
            историю без извинений.
          </p>
          <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")} className="gap-2">
            Найти подходящие варианты <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-primary py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-primary-foreground tracking-tight mb-4">
            Хватит гадать.
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Построй свой шорт-лист за минуты. Добавляй экспертную поддержку только когда нужно.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")} className="gap-2">
              Получить план <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/offerings/ru")}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
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
