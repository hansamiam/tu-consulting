import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram, GraduationCap, Brain, Search, Users, ArrowRight, Sparkles, BookOpen, Globe, Trophy, Target } from "lucide-react";
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
          <motion.div {...fadeUp(0.1)} className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Discover · Prep · Succeed
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.2)}
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-6"
          >
            Find your best-fit universities and{" "}
            <span className="text-gold">admissions strategy</span> in minutes.
          </motion.h1>

          <motion.p
            {...fadeUp(0.35)}
            className="text-primary-foreground/85 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto mb-3 font-light leading-relaxed"
          >
            Personalized scholarship matches, university shortlists, and a clear next step — built by consultants from Yale, Harvard, Cambridge & Tsinghua.
          </motion.p>

          <motion.p
            {...fadeUp(0.45)}
            className="text-primary-foreground/50 text-xs sm:text-sm tracking-widest uppercase mb-10"
          >
            Free to start · No credit card · EN & RU
          </motion.p>

          <motion.div {...fadeUp(0.55)} className="flex justify-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform duration-200 gap-2"
              onClick={() => navigate('/discover')}
            >
              <Search className="h-5 w-5" /> Get your admissions plan
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

      {/* ── PLATFORM PILLARS ── */}
      <section className="py-20 sm:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              One Platform. <span className="text-accent">Every Advantage.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From finding your dream university to acing your exams and securing admission — we've built every tool you need.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Discover */}
            <motion.div
              {...fadeUp(0.1)}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-accent/40 hover:shadow-[var(--shadow-premium)] transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/discover')}
            >
              <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Globe className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-3">Discover</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Search 200+ universities worldwide. Compare tuition, rankings, visa info, and scholarships — all in one smart database.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> "Can I Get In?" match scoring</li>
                <li className="flex items-center gap-2"><Search className="h-4 w-4 text-accent" /> Side-by-side comparisons</li>
                <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /> Real cost calculator</li>
              </ul>
              <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                Explore Universities <ArrowRight className="h-4 w-4" />
              </span>
            </motion.div>

            {/* Prep */}
            <motion.div
              {...fadeUp(0.2)}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-accent/40 hover:shadow-[var(--shadow-premium)] transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/prep')}
            >
              <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <BookOpen className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-3">Prep</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Adaptive IELTS & SAT preparation with AI tutoring, full mock exams, and a gamified learning engine that keeps you going.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><Brain className="h-4 w-4 text-accent" /> AI-powered adaptive practice</li>
                <li className="flex items-center gap-2"><Trophy className="h-4 w-4 text-accent" /> Timed mock exams with scoring</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI essay feedback & band scores</li>
              </ul>
              <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                Start Practicing <ArrowRight className="h-4 w-4" />
              </span>
            </motion.div>

            {/* Consulting */}
            <motion.div
              {...fadeUp(0.3)}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-accent/40 hover:shadow-[var(--shadow-premium)] transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/offerings')}
            >
              <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Users className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-3">Consulting</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Personalized admission strategy from mentors who've been there. Essays, interviews, applications — handled with care.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /> Ivy League & Oxbridge mentors</li>
                <li className="flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Essay & interview coaching</li>
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Full application management</li>
              </ul>
              <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                View Packages <ArrowRight className="h-4 w-4" />
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── AI SECTION ── */}
      <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase mb-6">
              <Brain className="h-3.5 w-3.5" /> Powered by AI
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              TopUni <span className="text-gold">AI</span>
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">
              Start your journey with our AI — explore universities, get matched, and build your shortlist. When you're ready for the full strategy, our expert consultants take it from there.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-12">
            {[
              { num: "200+", label: "Universities" },
              { num: "24/7", label: "AI Counselor" },
              { num: "2 min", label: "Full Strategy" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-3xl sm:text-4xl font-bold text-gold mb-1">{stat.num}</div>
                <div className="text-primary-foreground/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp(0.3)} className="text-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/topuni-ai')}
            >
              <Brain className="h-5 w-5" /> Try TopUni AI
            </Button>
          </motion.div>
        </div>
      </section>

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
