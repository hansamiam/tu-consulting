import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Instagram, Linkedin } from "lucide-react";
import heroImage from "@/assets/hero-library.jpg";

const Index = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    setIsSubmitted(true);
    setEmail("");
    
    toast({
      title: "Welcome aboard! 🎓",
      description: "Thanks for joining! We'll let you know when we launch.",
    });
  };

  return (
    <div className="min-h-screen relative">
      {/* Hero Section with Background Image */}
      <div 
        className="min-h-screen relative flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 35, 66, 0.85), rgba(10, 35, 66, 0.75)), url(${heroImage})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/80 to-primary/90" />
        
        <main className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
          {/* Logo/Brand Name */}
          <div className="mb-12 animate-fade-in">
            <h2 className="text-gold font-heading text-2xl md:text-3xl font-semibold tracking-wide mb-2">
              Top Uni Consulting
            </h2>
            <div className="w-24 h-1 bg-gold mx-auto rounded-full" />
          </div>

          {/* Main Headline - Coming Soon */}
          <div className="mb-8 inline-block px-8 py-4 border-2 border-gold/30 rounded-lg">
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold text-gold leading-tight tracking-tight">
              Coming Soon
            </h1>
          </div>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Guiding Ambitious Students to Top Universities Worldwide
          </p>

          {/* Email Capture Form or Success Message */}
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-16">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-12 bg-background/95 backdrop-blur-sm border-border text-foreground placeholder:text-muted-foreground focus:ring-gold focus:border-gold"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  variant="gold" 
                  size="lg"
                  className="h-12 px-8"
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Waitlist"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="max-w-md mx-auto mb-16 p-6 bg-background/95 backdrop-blur-sm rounded-lg border border-gold/30">
              <p className="text-gold font-semibold text-lg mb-2">
                ✓ Thank you for joining!
              </p>
              <p className="text-foreground/80">
                We'll let you know when we launch.
              </p>
            </div>
          )}

          {/* Social Links */}
          <div className="flex gap-8 justify-center mb-8">
            <a
              href="https://instagram.com/topuniconsulting"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/70 hover:text-gold transition-colors duration-200"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={24} strokeWidth={1.5} />
            </a>
            <a
              href="https://linkedin.com/company/topuniconsulting"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/70 hover:text-gold transition-colors duration-200"
              aria-label="Connect on LinkedIn"
            >
              <Linkedin size={24} strokeWidth={1.5} />
            </a>
          </div>

          {/* Footer */}
          <footer className="text-primary-foreground/60 text-sm space-y-2">
            <p>
              <a 
                href="mailto:team@topuniconsulting.com" 
                className="text-gold hover:text-gold-light transition-colors duration-300"
              >
                team@topuniconsulting.com
              </a>
            </p>
            <p>© 2025 Top Uni Consulting | All Rights Reserved</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
