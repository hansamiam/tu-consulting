import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { blogArticles } from "@/data/blogArticles";
import { countryGuides } from "@/data/countryGuides";

const BlogRu = () => {
  const navigate = useNavigate();
  const featured = blogArticles[0];
  const rest = blogArticles.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="ru" />

      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-20 pb-12 lg:pt-28 lg:pb-16">
          <div className="grid lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-8">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-5">
                Журнал Top Uni
              </p>
              <h1 className="font-heading text-5xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
                Полевые заметки <span className="text-accent">международных</span> абитуриентов.
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="text-base text-muted-foreground leading-relaxed">
                Гайды по странам, стратегия стипендий и то, что хотелось бы узнать раньше.
                Написано теми, кто это сделал.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-20 space-y-20 lg:space-y-24">
        {featured && (
          <section>
            <div className="flex items-baseline justify-between mb-6">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent">Главное</p>
              <button onClick={() => navigate(`/blog/${featured.id}/ru`)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Читать →
              </button>
            </div>
            <article
              onClick={() => navigate(`/blog/${featured.id}/ru`)}
              className="group cursor-pointer grid lg:grid-cols-12 gap-8 lg:gap-12 items-center border-y border-border py-10 lg:py-14"
            >
              <div className="lg:col-span-5 aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <img src={featured.image} alt={featured.titleRu} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
              </div>
              <div className="lg:col-span-7">
                <div className="flex items-center gap-3 mb-4 text-xs">
                  <span className="font-mono uppercase tracking-wider text-accent">{featured.categoryRu}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-muted-foreground">{featured.readTimeRu}</span>
                </div>
                <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-4 group-hover:text-accent transition-colors">
                  {featured.titleRu}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-5">{featured.excerptRu}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent group-hover:gap-2.5 transition-all">
                  Читать <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </article>
          </section>
        )}

        <section>
          <div className="mb-8">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-2">Гайды по странам</p>
            <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight">
              Куда подавать, сколько стоит, как выиграть.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {countryGuides.map((g) => (
              <button
                key={g.slug}
                onClick={() => navigate(`/blog/guide/${g.slug}/ru`)}
                className="bg-background text-left p-6 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{g.flag}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-heading font-semibold text-base tracking-tight mb-1 group-hover:text-accent transition-colors">
                  {g.countryRu}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{g.taglineRu}</p>
              </button>
            ))}
          </div>
        </section>

        {rest.length > 0 && (
          <section>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-8">Ещё статьи</p>
            <div className="grid md:grid-cols-2 gap-x-10 gap-y-12">
              {rest.map((article) => (
                <article key={article.id} onClick={() => navigate(`/blog/${article.id}/ru`)} className="group cursor-pointer">
                  <div className="aspect-[16/10] overflow-hidden rounded-lg bg-muted mb-5">
                    <img src={article.image} alt={article.titleRu} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  </div>
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <span className="font-mono uppercase tracking-wider text-accent">{article.categoryRu}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">{article.readTimeRu}</span>
                  </div>
                  <h3 className="font-heading text-xl lg:text-2xl font-bold tracking-tight leading-snug mb-2 group-hover:text-accent transition-colors">
                    {article.titleRu}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{article.excerptRu}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer language="ru" />
    </div>
  );
};

export default BlogRu;
