import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, BookOpen, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";
import { blogArticles } from "@/data/blogArticles";

const Blog = () => {
  const navigate = useNavigate();

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
      <Navigation language="en" />

      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
          <div className="text-center space-y-4 md:space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <BookOpen className="h-8 w-8 md:h-12 md:w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent px-2">
              Blog
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Guides, strategies, and real talk for students applying to universities abroad.
            </p>
          </div>

          <div className="grid gap-6 md:gap-8">
            {blogArticles.map((article) => (
              <Card
                key={article.id}
                className="overflow-hidden border-border/50 hover:border-accent/30 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/blog/${article.id}`)}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-64 md:w-80 h-48 sm:h-auto shrink-0 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                        {article.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {article.readTime}
                      </span>
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{article.excerpt}</p>
                    <span className="inline-flex items-center gap-1 text-accent text-sm font-medium group-hover:gap-2 transition-all">
                      Read article <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Need Personalized Guidance?</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Our expert consultants can help you with applications, test prep, and scholarship strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate("/offerings")}>Explore Consulting</Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/prep")}>Try Prep Platform</Button>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <Footer language="en" variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default Blog;
