import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { shouldRedirectToRussian } from "@/utils/languageDetection";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldRedirectToRussian()) {
      navigate('/ru');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen relative">
      {/* Hero Section with Background Image */}
      <div 
        className="min-h-screen relative flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 35, 66, 0.75), rgba(10, 35, 66, 0.75)), url(${heroImage})`,
        }}
      >
        <main className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
          {/* Language Switcher */}
          <div className="absolute top-6 right-6">
            <LanguageSwitcher />
          </div>
          
          {/* Logo/Brand Name */}
          <div className="mb-12 animate-fade-in">
            <h2 className="text-primary-foreground font-heading text-2xl md:text-3xl font-semibold tracking-wide mb-2">
              Top Uni Consulting
            </h2>
            <div className="w-24 h-1 bg-gold mx-auto rounded-full" />
          </div>
          {/* Main Headline - Coming Soon */}
          <div className="mb-8 inline-block px-8 py-4 border-2 border-gold/30 rounded-lg">
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-semibold text-gold leading-tight tracking-tight">
              Coming Soon
            </h1>
          </div>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-4 max-w-2xl mx-auto font-light leading-relaxed">
            Guiding Ambitious Students to Top Universities
          </p>
          
          {/* Tagline */}
          <div className="text-sm md:text-base text-primary-foreground/70 mb-16 max-w-xl mx-auto">
            <p className="text-xs md:text-sm">Now serving students worldwide</p>
          </div>

          {/* Team Link */}
          <div className="mb-8">
            <Button
              onClick={() => navigate("/team")}
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-gold"
            >
              Meet Our Team
            </Button>
          </div>

          {/* Social Links */}
          <div className="flex gap-6 justify-center mb-8">
            <a
              href="https://www.instagram.com/top_uni_consulting/?g=5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-foreground/60 hover:text-gold transition-all duration-200 p-2"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={32} strokeWidth={1.5} className="opacity-80" />
            </a>
          </div>

          {/* Footer */}
          <footer className="text-primary-foreground/50 text-sm space-y-2">
            <p>
              <a 
                href="mailto:team@topuniconsulting.com" 
                className="text-primary-foreground/60 hover:text-gold transition-colors duration-300"
              >
                team@topuniconsulting.com
              </a>
            </p>
            <p>Central Asia's leading admissions consulting firm</p>
            <p>© 2025 Top Uni Consulting | All Rights Reserved</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Index;
