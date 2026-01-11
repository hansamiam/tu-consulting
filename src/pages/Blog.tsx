import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, BookOpen, Calendar, Clock, PenLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

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

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
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
              Blog
            </h1>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Educational insights, university application tips, and guidance for aspiring students.
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
                Articles Coming Soon
              </h2>
              <p className="text-base md:text-lg text-muted-foreground">
                We're preparing educational content to help you navigate your university application journey. 
                Our blog will feature in-depth articles on admissions strategies, essay writing, scholarship opportunities, and more.
              </p>
              <p className="text-sm text-muted-foreground/70 italic">
                Check back soon for valuable insights from our experienced consultants.
              </p>
            </div>
          </Card>

          {/* Preview of Blog Post Structure */}
          <div className="space-y-6">
            <h2 className="text-lg md:text-xl font-semibold text-primary text-center">
              What to Expect
            </h2>
            
            <div className="grid gap-4 md:gap-6">
              {/* Sample Article Card 1 */}
              <Card className="p-6 border-border/50 bg-card/50 hover:shadow-md transition-shadow opacity-60">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Coming Soon
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      5 min read
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    How to Write a Compelling Personal Statement
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Learn the key elements that make personal statements stand out to admissions committees at top universities.
                  </p>
                </div>
              </Card>

              {/* Sample Article Card 2 */}
              <Card className="p-6 border-border/50 bg-card/50 hover:shadow-md transition-shadow opacity-60">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Coming Soon
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      8 min read
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Understanding Scholarship Opportunities for International Students
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A comprehensive guide to finding and applying for scholarships at universities in the US, UK, and beyond.
                  </p>
                </div>
              </Card>

              {/* Sample Article Card 3 */}
              <Card className="p-6 border-border/50 bg-card/50 hover:shadow-md transition-shadow opacity-60">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Coming Soon
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      6 min read
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Preparing for University Interviews: Tips from Ivy League Graduates
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Practical advice on how to prepare for and succeed in university admission interviews.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">
              Need Personalized Guidance?
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              While our blog is being prepared, our consultants are ready to help you with your university applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="gold" onClick={() => navigate("/offerings")}>
                Explore Our Services
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/team")}>
                Meet Our Team
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <Footer language="en" variant="light" />
        </div>
      </footer>
    </div>
  );
};

export default Blog;
