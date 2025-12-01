import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Users, Target, Award, Heart, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-library.jpg";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const WhyTU = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.6]);

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* Parallax Background */}
      <motion.div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(30, 52, 75, 0.92), rgba(30, 52, 75, 0.88)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          y: backgroundY,
          opacity: opacity
        }}
      />
      
      {/* Animated gradient overlay */}
      <div className="fixed inset-0 z-0 bg-gradient-mesh opacity-40 animate-pulse-glow" />
      
      <div className="relative z-10">
      <Navigation language="en" />
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="border-b border-gold/20 glass-nav sticky top-16 z-40 shadow-premium"
      >
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2 text-gold hover:text-gold-light transition-all hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto space-y-8 md:space-y-16">
          {/* Hero Section */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center space-y-3 md:space-y-6"
          >
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold text-gradient px-2 animate-fade-up">
              Why Top Uni?
            </h1>
            <p className="text-sm md:text-xl text-gold-light max-w-3xl mx-auto px-4 animate-fade-in">
              Lean team. Real experience. Personal attention. No corporate markup.
            </p>
          </motion.div>

          {/* Forbes Section */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-6 md:p-10 glass-card border-gold/30 shadow-premium hover:shadow-premium-hover transition-all hover:scale-[1.02]">
              <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 text-center">
                <p className="text-base md:text-2xl lg:text-3xl text-primary-foreground leading-relaxed">
                  <a href="https://www.forbes.com/sites/christopherrim/2025/05/02/how-the-explosion-of-private-consultants-has-changed-the-college-admissions-landscape/" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors font-bold link-premium">Forbes</a> says the most critical factor in consulting success: <span className="font-bold text-gold">how well mentors understand their students.</span>
                </p>
                <div className="border-t-2 border-gold/30 pt-4 md:pt-6 mt-4 md:mt-6">
                  <p className="text-base md:text-xl lg:text-2xl text-gold font-bold mb-2 md:mb-3">
                    The TopUni Difference:
                  </p>
                  <p className="text-sm md:text-base lg:text-lg text-primary-foreground">
                    We're <span className="font-semibold text-gold-light">fresh out of the process</span>. We remember what it feels like, what works, what doesn't. We understand today's challenges—<span className="font-semibold text-gold-light">not from textbooks, from experience.</span>
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Key Differentiators */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            {[
              {
                title: "Small Team, Big Impact",
                description: "Unlike large firms where you're just a number, our small team means every consultant brings top-tier expertise. You work directly with someone who's been through it themselves—recently.",
                footer: "Every team member is hand-picked for excellence",
                delay: 0
              },
              {
                title: "Personal Attention",
                description: "Large firms charge premium but spread mentors thin. We keep client loads manageable—you get dedicated support without the markup.",
                footer: "Your success is our mission, not just another metric",
                delay: 0.1
              },
              {
                title: "Global Standards, Local Access",
                description: "We bring top-tier Western consulting methodology and resources directly to you. Full bilingual support in English and Russian means nothing gets lost in translation.",
                footer: "World-class approach, accessible and personal",
                delay: 0.2
              },
              {
                title: "Proven Results",
                description: "Secured $500K+ in scholarships with 10+ years combined experience across Yale, Harvard, Cambridge, and Tsinghua. Real successes, tested strategies.",
                footer: "Expertise proven through real outcomes",
                delay: 0.3
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: item.delay }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <Card className="p-4 md:p-8 space-y-3 md:space-y-4 glass-card border-gold/30 hover:border-gold/50 shadow-premium hover:shadow-premium-hover transition-all h-full group">
                  <h3 className="text-lg md:text-2xl font-bold text-gold group-hover:text-gold-light transition-colors">{item.title}</h3>
                  <p className="text-xs md:text-base text-primary-foreground/90">
                    {item.description}
                  </p>
                  <div className="pt-3 md:pt-4 border-t border-gold/20">
                    <p className="text-xs md:text-sm text-gold-light font-medium">{item.footer}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Our Philosophy - made smaller */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="p-8 glass-card border-gold/30 shadow-premium hover:shadow-premium-hover transition-all">
              <div className="max-w-3xl mx-auto space-y-4 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gold animate-pulse-glow">Perfect Grades Not Required</h2>
                <p className="text-base text-primary-foreground/90">
                  Top universities aren't just for "perfect" students. Our team faced learning differences, cultural barriers, financial constraints, and setbacks. We learned from those struggles—now we help you avoid the same mistakes.
                </p>
                <p className="text-base text-gold-light font-medium">
                  Lower grades? Unusual background? Unique challenges? These make compelling applications. We help students make their best shot, wherever they start.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Card className="p-12 glass-card border-gold/40 text-center space-y-6 shadow-glow hover:shadow-premium-hover transition-all">
              <h2 className="text-3xl md:text-4xl font-bold text-gold animate-shimmer">Ready to Start Your Journey?</h2>
              <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                Join students who've chosen personalized expertise over corporate consulting mills.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    className="btn-premium"
                    onClick={() => navigate("/offerings")}
                  >
                    View Our Packages
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-gold/50 text-gold hover:bg-gold/10 hover:text-gold-light"
                    onClick={() => navigate("/team")}
                  >
                    Meet Our Team
                  </Button>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default WhyTU;
