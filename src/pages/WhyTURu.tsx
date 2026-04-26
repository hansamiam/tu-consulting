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
                Шорт-лист, план и эксперт —
                <br />
                <span className="text-accent">когда он реально нужен.</span>
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                Создано консультантами из Йеля, Гарварда, Кембриджа и Цинхуа.
                Для студентов из Центральной Азии и не только.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")} className="gap-2">
                  Смотреть стипендии <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate("/offerings/ru")}>
                  Консалтинг
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
                01 — Что мы делаем
              </p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Движок по стипендиям плюс консалтинг — когда ставки растут.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-10">
              <p className="text-base text-muted-foreground leading-relaxed">
                Self-serve инструменты для поиска, фит-скоринга и подготовки.
                Поддержка 1:1 — для эссе, интервью и финальных решений.
                Платишь только за то, чем пользуешься.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              { n: "01", t: "Ранжирование, а не каталог", b: "Стипендии оцениваются по твоим оценкам, бюджету, стране и срокам." },
              { n: "02", t: "Жёсткие пороги — сразу", b: "IELTS, GPA, SAT — видны до подачи, чтобы не тратить цикл впустую." },
              { n: "03", t: "Кросс-бордер по умолчанию", b: "Учитывает реалии Центральной Азии и развивающихся рынков, а не только США." },
              { n: "04", t: "Эксперты по запросу", b: "Консультанты из Йеля, Гарварда, Кембриджа, Цинхуа — поштучно, без пакетов." },
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
              <p className="label-mono text-accent mb-4">02 — Track record</p>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                Цифры, а не прилагательные.
              </h2>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                Мы не обещаем поступление. Помогаем выбрать школы, где твоя заявка реально конкурентна.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 gap-x-8 gap-y-10">
              {[
                { k: "$500K+", v: "Стипендий, выигранных нашими студентами" },
                { k: "Yale · Harvard · Cambridge · Tsinghua", v: "Где училась команда" },
                { k: "EN · RU", v: "Двуязычная поддержка" },
                { k: "UG · Магистр · Стипендии · Лето", v: "Типы заявок" },
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
          <p className="label-mono text-accent mb-6">03 — Если профиль не идеален</p>
          <h2 className="font-heading text-3xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-6">
            Топовые стипендии не зарезервированы за <span className="text-accent">идеальными аттестатами.</span>
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-10">
            Неровные оценки, ограниченный бюджет, gap year, нестандартный бэкграунд — всё это
            часто встречается у победителей. Главное — выбрать правильные цели и чётко сформулировать историю.
          </p>
          <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")} className="gap-2">
            Смотреть матчи <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-primary py-20 lg:py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-primary-foreground tracking-tight mb-4">
            Начни с шорт-листа.
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Бесплатно. Поддержка 1:1 — только если нужна.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="gold" size="lg" onClick={() => navigate("/discover/ru")} className="gap-2">
              Смотреть стипендии <ArrowRight className="h-4 w-4" />
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
