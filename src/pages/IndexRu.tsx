import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
import { WaitlistSection } from "@/components/WaitlistSection";

const IndexRu = () => {
  const navigate = useNavigate();


  return (
    <div className="min-h-screen relative">
      <Navigation language="ru" />
      {/* Hero Section with Background Image */}
      <div 
        className="min-h-screen relative flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 35, 66, 0.75), rgba(10, 35, 66, 0.75)), url(${heroImage})`,
        }}
      >
        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          {/* Language Switcher */}
          
          {/* Logo/Brand Name */}
          <div className="mb-8 sm:mb-12 animate-fade-in">
            <h2 className="text-primary-foreground font-heading text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide mb-2">
              Top Uni Consulting
            </h2>
            <div className="w-20 sm:w-24 h-1 bg-gold mx-auto rounded-full" />
          </div>
          {/* Main Headline */}
          <div className="mb-6 sm:mb-8 space-y-4">
            <div className="inline-block px-6 sm:px-8 py-3 sm:py-4 border-2 border-gold/30 rounded-lg backdrop-blur-sm">
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-gold leading-tight tracking-tight">
                Принимаем клиентов
              </h1>
            </div>
            <p className="text-primary-foreground/90 text-lg sm:text-xl font-medium max-w-2xl mx-auto">
              Не упустите цены раннего запуска и приоритетную поддержку
            </p>
          </div>

          {/* Call to Action */}
          <div className="max-w-md mx-auto mb-6 sm:mb-8 px-4">
            <Button 
              variant="gold"
              size="lg"
              className="text-lg px-12 py-6"
              onClick={() => navigate('/offerings-ru')}
            >
              Изучить наши услуги
            </Button>
          </div>

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

          {/* Waitlist Section */}
          <div className="mb-8 sm:mb-12 px-4">
            <WaitlistSection language="ru" />
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
              <p className="text-primary-foreground/60 text-xs sm:text-sm">Ведущая консалтинговая компания Центральной Азии по поступлению</p>
              <p className="text-primary-foreground/50 text-xs">© 2025 Top Uni Consulting | Все права защищены</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default IndexRu;
