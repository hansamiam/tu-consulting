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

          {/* Courses Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mb-10 sm:mb-14 px-4"
          >
            <div className="max-w-3xl mx-auto">
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-gold mb-2">
                Our Courses
              </h2>
              <p className="text-primary-foreground/70 text-sm sm:text-base mb-8">
                Structured preparation taught by experienced instructors
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* IELTS */}
                <div className="border border-gold/20 rounded-lg p-5 sm:p-6 backdrop-blur-sm bg-primary/30 text-left">
                  <h3 className="text-gold font-heading text-lg font-semibold mb-2">IELTS Preparation</h3>
                  <p className="text-primary-foreground/80 text-sm leading-relaxed">
                    For students aiming to study abroad. Build confidence across all four sections — Listening, Reading, Writing, and Speaking.
                  </p>
                </div>
                {/* SAT */}
                <div className="border border-gold/20 rounded-lg p-5 sm:p-6 backdrop-blur-sm bg-primary/30 text-left">
                  <h3 className="text-gold font-heading text-lg font-semibold mb-2">SAT Preparation</h3>
                  <p className="text-primary-foreground/80 text-sm leading-relaxed">
                    For high school students targeting top universities. Master the math and verbal reasoning skills needed for a competitive score.
                  </p>
                </div>
                {/* General English */}
                <div className="border border-gold/20 rounded-lg p-5 sm:p-6 backdrop-blur-sm bg-primary/30 text-left">
                  <h3 className="text-gold font-heading text-lg font-semibold mb-2">General English</h3>
                  <p className="text-primary-foreground/80 text-sm leading-relaxed">
                    For learners at any level. Strengthen your grammar, vocabulary, and fluency for academic and professional success.
                  </p>
                </div>
              </div>
              <Button
                variant="gold"
                size="lg"
                className="mt-8 text-base px-10 py-5 hover:scale-105 transition-transform duration-200"
                onClick={() => navigate('/offerings')}
              >
                Book a Consultation
              </Button>
            </div>
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
