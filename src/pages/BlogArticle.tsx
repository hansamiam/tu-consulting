import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Clock } from "lucide-react";
import { blogArticles } from "@/data/blogArticles";

interface Props {
  language: "en" | "ru";
}

const BlogArticle = ({ language }: Props) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = blogArticles.find((a) => a.id === id);

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {language === "ru" ? "Статья не найдена" : "Article not found"}
          </h1>
          <Button onClick={() => navigate(language === "ru" ? "/blog/ru" : "/blog")}>
            {language === "ru" ? "Вернуться к блогу" : "Back to Blog"}
          </Button>
        </div>
      </div>
    );
  }

  const title = language === "ru" ? article.titleRu : article.title;
  const category = language === "ru" ? article.categoryRu : article.category;
  const readTime = language === "ru" ? article.readTimeRu : article.readTime;
  const content = language === "ru" ? article.contentRu : article.content;

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(language === "ru" ? "/blog/ru" : "/blog")} className="gap-2 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {language === "ru" ? "Назад к блогу" : "Back to Blog"}
          </Button>
        </div>
      </header>

      {/* Hero image */}
      <div className="w-full h-64 md:h-96 overflow-hidden">
        <img src={article.image} alt={title} className="w-full h-full object-cover" />
      </div>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <article className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">{category}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {readTime}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-8 leading-tight">{title}</h1>

          <div className="space-y-6 text-base md:text-lg leading-relaxed text-muted-foreground">
            {content.map((paragraph, i) => {
              const parts = paragraph.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={i}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <strong key={j} className="text-foreground font-semibold">{part}</strong>
                    ) : (
                      <span key={j}>{part.split("\n").map((line, k, arr) => (
                        <span key={k}>{line}{k < arr.length - 1 && <br />}</span>
                      ))}</span>
                    )
                  )}
                </p>
              );
            })}
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <Button variant="gold" onClick={() => navigate(language === "ru" ? "/blog/ru" : "/blog")}>
              {language === "ru" ? "← Все статьи" : "← All Articles"}
            </Button>
          </div>
        </article>
      </main>

      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <Footer language={language} variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default BlogArticle;
