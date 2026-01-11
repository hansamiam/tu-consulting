import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, BookOpen, Calendar, Clock, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const BlogRu = () => {
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
      <Navigation language="ru" />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ru")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4 md:space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <BookOpen className="h-8 w-8 md:h-12 md:w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent px-2">
              Блог
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Образовательные материалы, советы по поступлению и рекомендации для будущих студентов.
            </p>
          </div>

          {/* Coming Soon Section */}
          <Card className="p-8 md:p-12 bg-gradient-to-br from-muted/30 to-muted/10 border-border/50">
            <div className="max-w-2xl mx-auto space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-accent/10 border border-accent/20">
                  <PenLine className="h-6 w-6 text-accent" />
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-primary">
                Статьи скоро появятся
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                Мы готовим образовательный контент, который поможет вам в процессе поступления в университет. 
                В нашем блоге будут публиковаться подробные статьи о стратегиях поступления, написании эссе, стипендиальных возможностях и многом другом.
              </p>
              <p className="text-sm text-muted-foreground/70 italic">
                Скоро здесь появятся ценные материалы от наших опытных консультантов.
              </p>
            </div>
          </Card>

          {/* CTA Section */}
          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">
              Нужна персональная консультация?
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Пока мы готовим блог, наши консультанты готовы помочь вам с поступлением в университет.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate("/offerings/ru")}>
                Наши услуги
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/team/ru")}>
                Наша команда
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <Footer language="ru" variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default BlogRu;
