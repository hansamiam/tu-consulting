import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram, Brain, Search, ArrowRight, Sparkles, BookOpen, Globe } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import Navigation from "@/components/Navigation";
import { shouldRedirectToRussian } from "@/utils/languageDetection";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Footer } from "@/components/Footer";
import { StickyCTA } from "@/components/StickyCTA";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldRedirectToRussian()) {
      navigate('/ru');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen relative bg-background">
      <ScrollProgress />
      <Navigation language="en" />
      <StickyCTA language="en" />

      {/* ── HERO ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative min-h-[92vh] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,35,66,0.88) 0%, rgba(10,35,66,0.65) 100%), url(${heroImage})`,
        }}
      >
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <motion.h1
            {...fadeUp(0.2)}
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.05] tracking-tight mb-6"
          >
            Scholarships you can
            <br className="hidden sm:block" />
            <span className="text-gold"> actually win.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.35)}
            className="text-primary-foreground/80 text-lg sm:text-xl max-w-xl mx-auto mb-10 font-light leading-relaxed"
          >
            Ranked against your profile. Real cutoffs, real deadlines, real shot.
          </motion.p>

          <motion.div {...fadeUp(0.55)} className="flex justify-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform duration-200 gap-2"
              onClick={() => navigate('/discover')}
            >
              <Search className="h-5 w-5" /> Find my scholarships
            </Button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-gold/40 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-gold"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* ── 3-STEP FUNNEL ── */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
              How it <span className="text-accent">works</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three steps. From your profile to a ranked plan you can actually act on.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                n: "1",
                icon: Brain,
                title: "TopUni AI",
                body: "2-min intake — grades, country, budget, target. Builds your applicant profile.",
                cta: "Start",
                path: "/topuni-ai",
              },
              {
                n: "2",
                icon: Globe,
                title: "Discover",
                body: "Ranked scholarship matches with hard cutoffs (IELTS, GPA, SAT) and your fit score.",
                cta: "See matches",
                path: "/discover",
              },
              {
                n: "3",
                icon: BookOpen,
                title: "Prep",
                body: "Hit the test scores those scholarships actually require. Diagnostic + adaptive practice.",
                cta: "Open Prep",
                path: "/prep",
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                {...fadeUp(0.1 * i)}
                className="group relative rounded-2xl border border-border bg-card p-6 hover:border-accent/40 transition-all cursor-pointer"
                onClick={() => navigate(step.path)}
              >
                <div className="absolute -top-3 left-6 h-7 w-7 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center">
                  {step.n}
                </div>
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mt-2">
                  <step.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.body}</p>
                <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                  {step.cta} <ArrowRight className="h-4 w-4" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership CTA — hidden until ready */}
      {false && (
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.h2 {...fadeUp()} className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            One <span className="text-gold">membership.</span> Every tool.
          </motion.h2>
          <motion.p {...fadeUp(0.1)} className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Discover, Prep, and Academy — locked at the founding price.
          </motion.p>
          <motion.div {...fadeUp(0.2)}>
            <Button
              variant="gold"
              size="lg"
              className="text-base px-8 py-5 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/pricing')}
            >
              See Membership
            </Button>
          </motion.div>
        </div>
      </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-6">
              <a
                href="https://www.instagram.com/top_uni_consulting/?g=5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors p-2"
                aria-label="Follow us on Instagram"
              >
                <Instagram size={28} strokeWidth={1.5} />
              </a>
            </div>
            <Footer language="en" variant="dark" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
