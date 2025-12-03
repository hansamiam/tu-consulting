import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Users, Target, Award, Heart, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const WhyTU = () => {
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
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-3 md:space-y-6 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent px-2">
              Why Top Uni?
            </h1>
            <p className="text-sm md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Lean team. Real experience. Personal attention. No corporate markup.
            </p>
          </div>

          {/* Forbes Section - Moved to top */}
          <Card className="p-6 md:p-10 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30 shadow-xl animate-enter">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 text-center">
              <p className="text-base md:text-2xl lg:text-3xl text-foreground leading-relaxed">
                <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-bold">Forbes</a> says the most critical factor in consulting success: <span className="font-bold">how well mentors understand their students.</span>
              </p>
              <div className="border-t-2 border-accent/30 pt-4 md:pt-6 mt-4 md:mt-6">
                <p className="text-base md:text-xl lg:text-2xl text-primary font-bold mb-2 md:mb-3">
                  The TopUni Difference:
                </p>
                <p className="text-sm md:text-base lg:text-lg text-foreground">
                  We're <span className="font-semibold">fresh out of the process</span>. We remember what it feels like, what works, what doesn't. We understand today's challenges—<span className="font-semibold">not from textbooks, from experience.</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-8 animate-fade-in">
            <Card className="p-4 md:p-8 space-y-3 md:space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <h3 className="text-lg md:text-2xl font-bold text-primary">Small Team, Big Impact</h3>
              <p className="text-xs md:text-base text-muted-foreground">
                Unlike large firms where you're just a number, our small team means every consultant brings top-tier expertise. You work directly with someone who's been through it themselves—recently.
              </p>
              <div className="pt-3 md:pt-4 border-t border-border/50">
                <p className="text-xs md:text-sm text-foreground font-medium">Every team member is hand-picked for excellence</p>
              </div>
            </Card>

            <Card className="p-4 md:p-8 space-y-3 md:space-y-4 border-primary/30 bg-gradient-to-br from-card/80 to-primary/5 hover:shadow-xl transition-all">
              <h3 className="text-lg md:text-2xl font-bold text-primary">Personal Attention</h3>
              <p className="text-xs md:text-base text-muted-foreground">
                Large firms charge premium but spread mentors thin. We keep client loads manageable—you get dedicated support without the markup.
              </p>
              <div className="pt-3 md:pt-4 border-t border-border/50">
                <p className="text-xs md:text-sm text-foreground font-medium">Your success is our mission, not just another metric</p>
              </div>
            </Card>

            <Card className="p-4 md:p-8 space-y-3 md:space-y-4 border-accent/30 bg-gradient-to-br from-card/80 to-gold/5 hover:shadow-xl transition-all">
              <h3 className="text-lg md:text-2xl font-bold text-primary">Global Standards, Local Access</h3>
              <p className="text-xs md:text-base text-muted-foreground">
                We bring top-tier Western consulting methodology and resources directly to you. Full bilingual support in English and Russian means nothing gets lost in translation.
              </p>
              <div className="pt-3 md:pt-4 border-t border-border/50">
                <p className="text-xs md:text-sm text-foreground font-medium">World-class approach, accessible and personal</p>
              </div>
            </Card>

            <Card className="p-4 md:p-8 space-y-3 md:space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-primary">Proven Results</h3>
              <p className="text-muted-foreground">
                Secured <span className="font-semibold">$500K+ in scholarships</span> with <span className="font-semibold">10+ years combined experience</span> across Yale, Harvard, Cambridge, and Tsinghua. Real successes, tested strategies.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Expertise proven through real outcomes</p>
              </div>
            </Card>
          </div>

          {/* Our Philosophy - made smaller */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-accent/5 to-gold/5 border-primary/20">
            <div className="max-w-3xl mx-auto space-y-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-primary">Perfect Grades Not Required</h2>
              <p className="text-base text-muted-foreground">
                Top universities aren't just for "perfect" students. Our team faced learning differences, cultural barriers, financial constraints, and setbacks. We learned from those struggles—now we help you avoid the same mistakes.
              </p>
              <p className="text-base text-foreground font-medium">
                Lower grades? Unusual background? Unique challenges? These make compelling applications. We help students make their best shot, wherever they start.
              </p>
            </div>
          </Card>

          {/* CTA Section */}
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Ready to Start Your Journey?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Take the first step toward your dream university with expert guidance tailored to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="gold"
                onClick={() => navigate("/offerings")}
              >
                View Our Packages
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/team")}
              >
                Meet Our Team
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WhyTU;
