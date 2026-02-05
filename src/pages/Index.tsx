import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import Navigation from "@/components/Navigation";
import { shouldRedirectToRussian } from "@/utils/languageDetection";
import { ScrollProgress } from "@/components/ScrollProgress";
import { FloatingBadge } from "@/components/FloatingBadge";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldRedirectToRussian()) {
      navigate('/ru');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen relative">
      <ScrollProgress />
      <Navigation language="en" />
      {/* Hero Section with Background Image */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
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
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-6 sm:mb-8 space-y-4"
          >
            <FloatingBadge>
              <div className="inline-block px-6 sm:px-8 py-3 sm:py-4 border-2 border-gold/30 rounded-lg backdrop-blur-sm relative">
                <div className="absolute inset-0 bg-gold/5 animate-breathe-glow rounded-lg" />
                <h1 className="relative font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-gold leading-tight tracking-tight">
                  Now Accepting Our
                  <br />
                  First{"\u00a0"}Clients
                </h1>
              </div>
            </FloatingBadge>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-primary-foreground/90 text-lg sm:text-xl font-medium max-w-2xl mx-auto"
            >
              Don't miss out on early-launch pricing and priority support
            </motion.p>
          </motion.div>

          {/* Call to Action */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="max-w-md mx-auto mb-6 sm:mb-8 px-4"
          >
            <Button 
              variant="gold"
              size="lg"
              className="text-lg px-12 py-6 hover:scale-105 transition-transform duration-200"
              onClick={() => navigate('/offerings')}
            >
              Explore Our Services
            </Button>
          </motion.div>

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
          <Footer language="en" variant="dark" />
        </main>
      </motion.div>
    </div>
  );
};

export default Index;
