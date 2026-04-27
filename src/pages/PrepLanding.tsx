import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, BookOpen, Target, Globe, Brain, ArrowRight, Sparkles, Trophy, BarChart3, Zap } from "lucide-react";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { Footer } from "@/components/Footer";
import heroImage from "@/assets/hero-campus.jpg";
import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

const PrepLanding = () => {
  const navigate = useNavigate();

  const courses = [
    {
      tag: "Test Prep",
      tagRu: "Тесты",
      title: "Test Preparation",
      titleRu: "Подготовка к экзаменам",
      desc: "Master IELTS and SAT with an adaptive curriculum. Build confidence across all IELTS sections (Listening, Reading, Writing, Speaking) targeting band 6.5–8.0, and conquer Digital SAT math and verbal sections aiming for 1400+.",
      features: ["Full-length IELTS & SAT mock exams with scoring", "AI essay correction & speaking drills", "Adaptive difficulty that grows with you"],
      icon: Target,
    },
    {
      tag: "Foundations",
      tagRu: "Основы",
      title: "General English",
      titleRu: "Общий английский",
      desc: "Build a rock-solid English foundation — grammar, vocabulary, reading comprehension, and speaking fluency for students preparing for academic life abroad. Structured from A2 to C1, perfect for those who need to strengthen their base before tackling test prep.",
      features: ["Adaptive curriculum (A2–C1)", "Grammar mastery & vocabulary expansion", "Academic writing & speaking practice"],
      icon: BookOpen,
    },
    {
      tag: "Career",
      tagRu: "Карьера",
      title: "Professional English",
      titleRu: "Профессиональный английский",
      desc: "Sharpen your English for the global workplace. Whether you're prepping for interviews at international companies, leading meetings, giving presentations, or negotiating deals — this program gives you the confidence and vocabulary to perform at your best.",
      features: ["Interview prep & business communication", "Presentation & negotiation skills", "Industry-specific vocabulary & case studies"],
      icon: Globe,
    },
  ];

  const platformFeatures = [
    { icon: Brain, title: "AI-Powered Adaptive Practice", desc: "Questions adjust to your skill level in real-time" },
    { icon: Trophy, title: "Full Mock Exams", desc: "Timed IELTS & SAT simulations with instant scoring" },
    { icon: Sparkles, title: "AI Essay Feedback", desc: "Get band scores and detailed writing analysis in seconds" },
    { icon: BarChart3, title: "Analytics Dashboard", desc: "Track your progress across every skill area" },
    { icon: Zap, title: "Gamified Learning", desc: "XP, streaks, levels, and achievements keep you motivated" },
    { icon: Target, title: "110+ Practice Questions", desc: "Across vocabulary, reading, grammar, math, and more" },
  ];

  return (
    <div className="min-h-screen relative bg-background">
      <Navigation language="en" />
      <BetaBanner />

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-20 sm:py-28 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,35,66,0.88) 0%, rgba(10,35,66,0.65) 100%), url(${heroImage})`,
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeUp(0.1)} className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase">
              <BookOpen className="h-3.5 w-3.5" /> Courses + AI Platform
            </span>
          </motion.div>
          <motion.h1
            {...fadeUp(0.2)}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-6"
          >
            Test Prep & <span className="text-gold">Language Courses</span>
          </motion.h1>
          <motion.p
            {...fadeUp(0.35)}
            className="text-primary-foreground/85 text-lg sm:text-xl max-w-3xl mx-auto mb-10 font-light leading-relaxed"
          >
            Instructor-led IELTS, SAT, and English courses paired with our AI-powered practice platform — everything you need to hit your target score.
          </motion.p>
          <motion.div {...fadeUp(0.5)} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-10 py-6 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/prep/dashboard')}
            >
              <Zap className="h-5 w-5" /> Launch Prep Platform
            </Button>
            <Button
              size="lg"
              className="text-lg px-10 py-6 border-2 border-gold/40 bg-transparent text-gold hover:bg-gold/10 transition-all gap-2"
              onClick={() => {
                document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Courses <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Platform Section — moved to top: this is the hero product */}
      <section className="py-20 sm:py-28 bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs sm:text-sm font-medium tracking-wide uppercase mb-6">
              <Zap className="h-3.5 w-3.5" /> AI-Powered
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              TopUni <span className="text-gold">Prep Platform</span>
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto">
              Self-study meets AI. Practice adaptively, take mock exams, get instant essay feedback, and track your progress — all for free during our beta.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {platformFeatures.map((f, i) => (
              <motion.div key={f.title} {...fadeUp(0.1 * (i + 1))}>
                <div className="rounded-xl border border-gold/20 bg-primary-foreground/5 p-6 hover:bg-primary-foreground/10 transition-colors">
                  <f.icon className="h-7 w-7 text-gold mb-3" />
                  <h3 className="font-semibold text-primary-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-primary-foreground/60">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.4)} className="text-center">
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-12 py-6 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/prep/dashboard')}
            >
              <ArrowRight className="h-5 w-5" /> Enter Prep Platform
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Courses Section — secondary, below the platform */}
      <section id="courses" className="py-20 sm:py-28 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Live <span className="text-accent">Courses</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Instructor-led IELTS, SAT, and English — for students who want guidance alongside the platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {courses.map((course, i) => (
              <motion.div key={course.title} {...fadeUp(0.1 * (i + 1))}>
                <Card className="h-full border-border hover:border-accent/30 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="inline-block px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full mb-2 w-fit">
                      <span className="text-primary font-semibold text-xs uppercase tracking-wide">{course.tag}</span>
                    </div>
                    <CardTitle className="text-lg md:text-xl">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{course.desc}</p>
                    <ul className="space-y-1.5">
                      {course.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="text-accent flex-shrink-0 mt-0.5" size={14} />
                          <span className="text-xs md:text-sm text-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.4)} className="text-center mt-10">
            <p className="text-muted-foreground text-sm mb-4">Interested in enrolling? Get in touch with our team.</p>
            <Button
              variant="gold"
              size="lg"
              className="text-base px-10 py-5 hover:scale-105 transition-transform"
              onClick={() => window.location.href = "mailto:team@topuniconsulting.com?subject=Course%20Inquiry"}
            >
              Contact Us About Courses
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6">
            <Footer language="en" variant="dark" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrepLanding;