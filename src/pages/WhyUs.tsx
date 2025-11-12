import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft, Users, Target, Award, Heart, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";

const WhyUs = () => {
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
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent">
              Why TopUni Consulting?
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're not just another admissions consulting firm. We're a lean, passionate team that brings authentic experience and personalized attention to every student.
            </p>
          </div>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-accent/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Small Team, Big Impact</h3>
              <p className="text-muted-foreground">
                Unlike large corporate firms where you're just another number, our deliberately small team ensures every member brings top-tier quality and unique expertise. You work directly with experienced consultants who've been through the process themselves.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Every team member is hand-picked for excellence</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-primary/30 bg-gradient-to-br from-card/80 to-primary/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Personalized Attention</h3>
              <p className="text-muted-foreground">
                Large firms charge premium prices but spread their mentors too thin. We maintain manageable client loads so you get the dedicated, personalized support you deserve—without the corporate markup.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Your success is our mission, not just another metric</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-accent/30 bg-gradient-to-br from-card/80 to-gold/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-gold/20 flex items-center justify-center">
                <Award className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-primary">True Global Experience</h3>
              <p className="text-muted-foreground">
                Many local consultants lack comprehensive international experience. Our team has navigated admissions across multiple continents, secured significant scholarships, and understands diverse educational systems firsthand.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Yale, Harvard, Cambridge, Tsinghua—we've been there</p>
              </div>
            </Card>

            <Card className="p-8 space-y-4 border-gold/30 bg-gradient-to-br from-card/80 to-accent/5 hover:shadow-xl transition-all">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-primary/20 flex items-center justify-center">
                <Target className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-2xl font-bold text-primary">Real Track Record</h3>
              <p className="text-muted-foreground">
                We've secured over $500K in scholarships and been through rigorous admissions processes ourselves. Our expertise isn't theoretical—it's proven through our own successes and setbacks.
              </p>
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-foreground font-medium">Tested strategies that actually work</p>
              </div>
            </Card>
          </div>

          {/* Our Philosophy */}
          <Card className="p-12 bg-gradient-to-br from-primary/5 via-accent/5 to-gold/5 border-primary/20">
            <div className="max-w-4xl mx-auto space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gold/30 to-primary/30 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-gold" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">You Don't Need Perfect Grades to Work With Us</h2>
              <p className="text-lg text-muted-foreground">
                Top universities aren't just for "perfect" students. Our team has faced challenges—learning differences, cultural barriers, financial constraints, academic setbacks. We learned valuable lessons through those struggles, and we're here to ensure you don't repeat the same mistakes.
              </p>
              <p className="text-lg text-foreground font-medium">
                Your unique circumstances—whether you're dealing with lower grades, unusual backgrounds, or specific challenges—are exactly what can make your application compelling. We specialize in helping students take the best shot they can, regardless of where they're starting from.
              </p>
            </div>
          </Card>

          {/* Comparison Infographic */}
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
              How We Compare
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Large Corporate Firms */}
              <Card className="p-6 space-y-4 bg-destructive/5 border-destructive/20">
                <h3 className="text-xl font-bold text-foreground text-center">Large Corporate Firms</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">High prices, limited mentor time</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Mentors often underpaid and overworked</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Cookie-cutter approach at scale</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-destructive font-bold">✗</span>
                    <p className="text-muted-foreground">Difficult to get personalized attention</p>
                  </div>
                </div>
              </Card>

              {/* Us */}
              <Card className="p-6 space-y-4 bg-gradient-to-br from-gold/10 to-primary/10 border-gold/40 shadow-xl scale-105">
                <h3 className="text-xl font-bold text-primary text-center">TopUni Consulting</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Competitive pricing, dedicated time</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Every team member is highly invested</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Personalized strategies for your story</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Direct access to experienced consultants</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gold font-bold">✓</span>
                    <p className="text-foreground font-medium">Proven track record: $500K+ scholarships</p>
                  </div>
                </div>
              </Card>

              {/* Small Local Consultants */}
              <Card className="p-6 space-y-4 bg-muted/30 border-muted">
                <h3 className="text-xl font-bold text-foreground text-center">Small Local Consultants</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">Often lack global experience</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">May not have been through top processes</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">Limited scholarship success track record</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-bold">~</span>
                    <p className="text-muted-foreground">Quality can vary significantly</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Team Specializations Infographic */}
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
              Each Team Member Brings Unique Expertise
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-3 border-gold/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Samuel Han</h3>
                <p className="text-sm text-gold font-medium">Co-Founder</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Learning strategies & ADHD support</p>
                  <p>• Immigrants & third-culture kids</p>
                  <p>• Natural sciences specialization</p>
                  <p>• Cultural adaptation expertise</p>
                </div>
              </Card>

              <Card className="p-6 space-y-3 border-primary/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Nurzada Abdivalieva</h3>
                <p className="text-sm text-gold font-medium">Co-Founder</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Scholarships & funding strategies</p>
                  <p>• Self-funded education pathways</p>
                  <p>• Compelling storytelling</p>
                  <p>• Social sciences focus</p>
                </div>
              </Card>

              <Card className="p-6 space-y-3 border-accent/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Josh Hughes</h3>
                <p className="text-sm text-gold font-medium">Lead Consultant</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Graduate program applications</p>
                  <p>• Test-taking strategies</p>
                  <p>• Academic research & essay refinement</p>
                  <p>• Languages & humanities expertise</p>
                </div>
              </Card>

              <Card className="p-6 space-y-3 border-gold/30 hover:shadow-lg transition-all">
                <h3 className="text-xl font-bold text-primary">Aigul Abdoubaetova</h3>
                <p className="text-sm text-gold font-medium">Senior Advisor</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Recommendation letter expertise</p>
                  <p>• Early-to-mid career professionals</p>
                  <p>• Institutional advising & negotiation</p>
                  <p>• International networking</p>
                </div>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-gold/10 border-primary/30 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Ready to Start Your Journey?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join students who've chosen personalized expertise over corporate consulting mills.
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

export default WhyUs;
