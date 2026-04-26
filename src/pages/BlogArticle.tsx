import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { blogArticles } from "@/data/blogArticles";

interface Props {
  language: "en" | "ru";
}

const BlogArticle = ({ language }: Props) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = blogArticles.find((a) => a.id === id);
  const isRu = language === "ru";
  const blogPath = isRu ? "/blog/ru" : "/blog";

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="font-heading text-3xl font-bold mb-4">
            {isRu ? "Статья не найдена" : "Article not found"}
          </h1>
          <Button onClick={() => navigate(blogPath)}>{isRu ? "Назад к блогу" : "Back to journal"}</Button>
        </div>
      </div>
    );
  }

  const title = isRu ? article.titleRu : article.title;
  const category = isRu ? article.categoryRu : article.category;
  const readTime = isRu ? article.readTimeRu : article.readTime;
  const content = isRu ? article.contentRu : article.content;

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      <main className="max-w-3xl mx-auto px-6 lg:px-8 pt-12 lg:pt-16 pb-24">
        <button
          onClick={() => navigate(blogPath)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-12 font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="h-3 w-3" /> {isRu ? "Журнал" : "Journal"}
        </button>

        <article>
          {/* Editorial header */}
          <header className="mb-10 pb-10 border-b border-border">
            <div className="flex items-center gap-3 mb-6 text-xs">
              <span className="font-mono uppercase tracking-wider text-accent">{category}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{readTime}</span>
            </div>
            <h1 className="font-heading text-4xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              {title}
            </h1>
          </header>

          {/* Body */}
          <div className="space-y-7 text-[17px] lg:text-lg leading-[1.7] text-foreground/85">
            {content.map((paragraph, i) => {
              const parts = paragraph.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={i}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={j} className="block font-heading text-foreground font-bold text-xl lg:text-2xl tracking-tight mt-10 mb-3">
                        {part}
                      </strong>
                    ) : (
                      <span key={j}>
                        {part.split("\n").map((line, k, arr) => (
                          <span key={k}>
                            {line}
                            {k < arr.length - 1 && <br />}
                          </span>
                        ))}
                      </span>
                    )
                  )}
                </p>
              );
            })}
          </div>

          {/* Editorial footer */}
          <footer className="mt-16 pt-10 border-t border-border">
            <div className="bg-muted/30 border border-border rounded-lg p-7 lg:p-9">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-accent mb-3">
                {isRu ? "Что дальше" : "Next"}
              </p>
              <h2 className="font-heading text-2xl font-bold tracking-tight mb-3">
                {isRu ? "Применить это к своему профилю." : "Apply this to your own profile."}
              </h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {isRu
                  ? "Получи ранжированный шорт-лист университетов и стипендий за пару минут."
                  : "Get a ranked university and scholarship shortlist tailored to you in minutes."}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="gold" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")} className="gap-2">
                  {isRu ? "Открыть Discover" : "Open Discover"} <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => navigate(blogPath)}>
                  {isRu ? "Все статьи" : "More essays"}
                </Button>
              </div>
            </div>
          </footer>
        </article>
      </main>

      <Footer language={language} />
    </div>
  );
};

export default BlogArticle;
