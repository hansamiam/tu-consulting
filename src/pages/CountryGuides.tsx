import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, BookOpen, ShieldCheck } from "lucide-react";
import { countryGuides } from "@/data/countryGuides";

interface Props {
  language?: "en" | "ru";
}

const CountryGuides = ({ language = "en" }: Props) => {
  const navigate = useNavigate();
  const isRu = language === "ru";
  const [search, setSearch] = useState("");

  useEffect(() => {
    const title = isRu
      ? "Гайды по странам — Top Uni"
      : "Country Guides for Studying Abroad — Top Uni";
    const desc = isRu
      ? "Подробные, проверенные гайды для студентов из Центральной Азии: США, Великобритания, Канада, Германия, Нидерланды, Корея, Китай. Цены, визы, стипендии."
      : "In-depth, fact-checked guides for Central Asian students: US, UK, Canada, Germany, Netherlands, South Korea, China. Costs, visas, scholarships, deadlines.";
    document.title = title;
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, [isRu]);

  const filtered = useMemo(() => {
    if (!search.trim()) return countryGuides;
    const q = search.toLowerCase();
    return countryGuides.filter((g) =>
      (isRu ? g.countryRu : g.country).toLowerCase().includes(q) ||
      g.popularCities.join(" ").toLowerCase().includes(q) ||
      g.slug.includes(q)
    );
  }, [search, isRu]);

  const basePath = isRu ? "/guides/ru" : "/guides";
  const guidePath = (slug: string) => (isRu ? `/guides/${slug}/ru` : `/guides/${slug}`);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language={language} />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground border-b border-gold/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold/80 mb-3">
              <BookOpen className="w-4 h-4" />
              {isRu ? "Справочник" : "Knowledge Hub"}
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight mb-4">
              {isRu
                ? "Гайды по странам для студентов Центральной Азии"
                : "Country Guides for Central Asian Students"}
            </h1>
            <p className="text-base sm:text-lg text-primary-foreground/75 max-w-3xl mb-6">
              {isRu
                ? "Глубокие, проверенные руководства: реальные требования, расходы, сроки виз, стипендии и честная оценка плюсов и минусов. Без приукрашиваний."
                : "Deep, fact-checked references: real admission requirements, costs, visa timelines, scholarships, and honest pros & cons. No fluff, no fabricated stats."}
            </p>

            <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
              <ShieldCheck className="w-4 h-4 text-gold" />
              {isRu
                ? "Каждый гайд содержит ссылки на официальные источники (правительственные порталы, университеты, DAAD/IRCC/UCAS и т.д.)"
                : "Every guide cites official sources (government portals, universities, DAAD/IRCC/UCAS, etc.)"}
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="border-b border-border bg-card/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRu ? "Поиск страны или города..." : "Search country or city..."}
                className="pl-9"
              />
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {isRu ? "Ничего не найдено." : "No results."}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((g) => (
                <Card
                  key={g.slug}
                  onClick={() => navigate(guidePath(g.slug))}
                  className="p-5 cursor-pointer hover:border-gold/40 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{g.flag}</span>
                      <div>
                        <h2 className="font-heading text-lg font-semibold text-foreground group-hover:text-gold transition-colors">
                          {isRu ? g.countryRu : g.country}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {g.popularCities.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                    {isRu ? g.taglineRu : g.tagline}
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <Badge variant="secondary" className="font-normal">
                      {isRu ? "Обучение: " : "Tuition: "}{g.tuitionRangeUsd}
                    </Badge>
                    <Badge variant="secondary" className="font-normal">
                      {isRu ? "Жильё/жизнь: " : "Living: "}{g.livingRangeUsd}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {g.visaName}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-10 p-5 rounded-lg border border-gold/20 bg-gold/5">
            <p className="text-sm text-foreground/80">
              {isRu
                ? "Не нашли вашу страну? Мы добавляем новые гайды раз в 2-3 недели по запросу. Напишите нам, какую страну добавить следующей."
                : "Don't see your target country? We publish new guides every 2–3 weeks based on demand. Tell us which country to cover next."}{" "}
              <Link
                to={isRu ? "/offerings/ru" : "/offerings"}
                className="text-gold underline-offset-2 hover:underline"
              >
                {isRu ? "Связаться" : "Get in touch"}
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer language={language} />
    </div>
  );
};

export default CountryGuides;
