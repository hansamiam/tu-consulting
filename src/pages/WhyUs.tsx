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

          {/* Forbes Article & Insight */}
          <Card className="p-8 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
            <div className="max-w-4xl mx-auto space-y-4">
              <p className="text-lg text-muted-foreground italic">
                According to <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">Forbes</a>, the most critical factor in admissions consulting success is how well mentors truly understand their students.
              </p>
              <p className="text-base text-foreground font-medium">
                We're young and fresh out of the process ourselves—we remember exactly what it feels like, what works, and what doesn't. Our proximity to the experience means we genuinely understand today's challenges and can relate to your struggles in ways that distant consultants simply can't.
              </p>
            </div>
          </Card>

          {/* Comparison Table */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
              The TopUni Difference
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium w-2/5"></th>
                    <th className="text-center p-4 text-muted-foreground font-medium">Large Firms</th>
                    <th className="text-center p-4 bg-gold/5 border-x-2 border-gold/20">
                      <span className="text-gold font-bold">TopUni</span>
                    </th>
                    <th className="text-center p-4 text-muted-foreground font-medium">Small Local</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-4 font-medium text-foreground">Global Experience</td>
                    <td className="text-center p-4">
                      <span className="text-lg">✓</span>
                    </td>
                    <td className="text-center p-4 bg-gold/5 border-x-2 border-gold/20">
                      <span className="text-gold text-lg font-bold">✓</span>
                    </td>
                    <td className="text-center p-4">
                      <span className="text-muted-foreground text-lg">✗</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 font-medium text-foreground">Personalized Attention</td>
                    <td className="text-center p-4">
                      <span className="text-destructive text-lg">✗</span>
                    </td>
                    <td className="text-center p-4 bg-gold/5 border-x-2 border-gold/20">
                      <span className="text-gold text-lg font-bold">✓</span>
                    </td>
                    <td className="text-center p-4">
                      <span className="text-lg">✓</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 font-medium text-foreground">Affordable Pricing</td>
                    <td className="text-center p-4">
                      <span className="text-destructive text-lg">✗</span>
                    </td>
                    <td className="text-center p-4 bg-gold/5 border-x-2 border-gold/20">
                      <span className="text-gold text-lg font-bold">✓</span>
                    </td>
                    <td className="text-center p-4">
                      <span className="text-lg">✓</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 font-medium text-foreground">Proven Track Record</td>
                    <td className="text-center p-4">
                      <span className="text-lg">✓</span>
                    </td>
                    <td className="text-center p-4 bg-gold/5 border-x-2 border-gold/20">
                      <span className="text-gold text-lg font-bold">✓</span>
                    </td>
                    <td className="text-center p-4">
                      <span className="text-muted-foreground text-lg">✗</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 font-medium text-foreground">Recent Personal Experience</td>
                    <td className="text-center p-4">
                      <span className="text-destructive text-lg">✗</span>
                    </td>
                    <td className="text-center p-4 bg-gold/5 border-x-2 border-gold/20">
                      <span className="text-gold text-lg font-bold">✓</span>
                    </td>
                    <td className="text-center p-4">
                      <span className="text-muted-foreground text-lg">✗</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium text-foreground">Transparent Statistics</td>
                    <td className="text-center p-4">
                      <span className="text-destructive text-lg">✗</span>
                      <p className="text-xs text-muted-foreground mt-1">Inflated stats</p>
                    </td>
                    <td className="text-center p-4 bg-gold/5 border-x-2 border-gold/20">
                      <span className="text-gold text-lg font-bold">✓</span>
                      <p className="text-xs text-gold/80 mt-1 font-medium">Honest approach</p>
                    </td>
                    <td className="text-center p-4">
                      <span className="text-lg">✓</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p className="text-center text-sm text-muted-foreground italic max-w-2xl mx-auto">
              Our team brings diverse expertise—from scholarship strategies and learning differences to graduate applications and career coaching—all tailored to your unique needs.
            </p>
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
