import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { shouldRedirectToRussian } from "@/utils/languageDetection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (shouldRedirectToRussian()) {
      navigate('/ru');
    }
  }, [navigate]);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('waitlist_emails')
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already registered!",
            description: "This email is already on our waitlist. We'll notify you when we launch!",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Successfully joined! 🎉",
          description: "Thank you for your interest! We'll keep you updated on our launch.",
        });
        setEmail("");
      }
    } catch (error) {
      console.error('Error submitting to waitlist:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Hero Section with Background Image */}
      <div 
        className="min-h-screen relative flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 35, 66, 0.75), rgba(10, 35, 66, 0.75)), url(${heroImage})`,
        }}
      >
        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          {/* Language Switcher */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <LanguageSwitcher />
          </div>
          
          {/* Logo/Brand Name */}
          <div className="mb-8 sm:mb-12 animate-fade-in">
            <h2 className="text-primary-foreground font-heading text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide mb-2">
              Top Uni Consulting
            </h2>
            <div className="w-20 sm:w-24 h-1 bg-gold mx-auto rounded-full" />
          </div>
          {/* Main Headline - First Cohort */}
          <div className="mb-6 sm:mb-8 space-y-4">
            <div className="inline-block px-6 sm:px-8 py-3 sm:py-4 border-2 border-gold/30 rounded-lg">
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-gold leading-tight tracking-tight">
                First Cohort Launching
              </h1>
            </div>
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-primary-foreground/90 font-medium mb-2">Be part of something special</p>
              <p className="text-primary-foreground/70 text-sm">
                Join our inaugural cohort and receive premium-level attention with founding member discounts up to 37% off
              </p>
            </div>
          </div>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/90 mb-3 max-w-2xl mx-auto font-light leading-relaxed px-4">
            Guiding Ambitious Students to Top Universities
          </p>
          <p className="text-sm text-gold/80 mb-6 sm:mb-8 italic">
            Limited spots • Steepest discounts we'll ever offer • Extra attention for founding members
          </p>
          
          {/* Navigation Links */}
          <div className="mb-6 sm:mb-8 px-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              onClick={() => navigate("/offerings")}
              variant="gold"
              className="w-auto px-8 sm:w-auto sm:px-12"
            >
              View Services & Pricing
            </Button>
            <Button
              onClick={() => navigate("/team")}
              variant="outline"
              className="border-gold/50 bg-gold/10 text-primary-foreground hover:bg-gold/20 hover:border-gold w-auto px-8 sm:w-auto sm:px-12"
            >
              Meet Our Team
            </Button>
            <Button
              onClick={() => navigate("/faq")}
              variant="ghost"
              className="border-gold/30 text-primary-foreground hover:bg-gold/10 hover:border-gold w-auto px-8 sm:w-auto sm:px-12"
            >
              FAQ
            </Button>
          </div>

          {/* Waitlist Form */}
          <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto mb-4 px-4">
            <p className="text-primary-foreground/80 text-sm mb-3">Join our waitlist to get notified when applications open</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:flex-1 px-4 py-3 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:border-gold focus:bg-primary-foreground/15 transition-all text-base"
                required
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                variant="gold"
                className="self-center px-8 py-3 sm:w-auto whitespace-nowrap"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Joining..." : "Get Early Access"}
              </Button>
            </div>
          </form>

          <p className="text-primary-foreground/60 text-xs mb-6 sm:mb-8 italic">
            First cohort members receive exclusive benefits
          </p>

          {/* Social Links */}
          <div className="flex gap-6 justify-center mb-6 sm:mb-8">
            <a
              href="https://www.instagram.com/top_uni_consulting/?g=5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-light transition-all duration-200 p-2"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
            </a>
          </div>

          {/* Footer */}
          <footer className="text-primary-foreground/50 text-xs sm:text-sm space-y-3 px-4">
            <p>
              <a 
                href="mailto:team@topuniconsulting.com" 
                className="text-gold hover:text-gold-light transition-colors duration-300 break-all"
              >
                team@topuniconsulting.com
              </a>
            </p>
            <div className="border-t border-gold/20 pt-3 space-y-2">
              <p className="text-primary-foreground/60 text-xs sm:text-sm">Central Asia's leading admissions consulting firm</p>
              <p className="text-primary-foreground/50 text-xs">© 2025 Top Uni Consulting | All Rights Reserved</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
