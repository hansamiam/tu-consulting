import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Target, Brain, Sparkles, BookOpen } from "lucide-react";
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

const TOOLS = [
  {
    icon: Target,
    title: "Diagnostic Test",
    desc: "Timed IELTS & SAT practice test. Pinpoints your weak areas in one sitting.",
    path: "/prep/diagnostic",
  },
  {
    icon: Brain,
    title: "Adaptive Practice",
    desc: "Questions adjust to your level in real-time across reading, writing, grammar, and math.",
    path: "/prep/practice",
  },
  {
    icon: Sparkles,
    title: "AI Essay Grader",
    desc: "Paste your essay, get an IELTS band score and detailed feedback in seconds.",
    path: "/prep/essay-grader",
  },
  {
    icon: BookOpen,
    title: "Study Plan",
    desc: "AI-generated weekly schedule based on your diagnostic results and target score.",
    path: "/prep/study-plan",
  },
];

const PrepLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative bg-background">
      <Navigation language="en" />
      <BetaBanner />

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-24 sm:py-32 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,35,66,0.92) 0%, rgba(10,35,66,0.72) 100%), url(${heroImage})`,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.h1
            {...fadeUp(0.1)}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground leading-[1.1] tracking-tight mb-5"
          >
            TopUni <span className="text-gold">Prep</span>
          </motion.h1>
          <motion.p
            {...fadeUp(0.25)}
            className="text-primary-foreground/80 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed"
          >
            Diagnostic test, practice questions, essay feedback, and a study plan tailored to your weak areas — free during beta.
          </motion.p>
          <motion.div {...fadeUp(0.4)}>
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-12 py-6 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/prep/dashboard')}
            >
              <Zap className="h-5 w-5" /> Launch Prep Platform
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Tools Grid */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp()} className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
              What's inside
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Four tools, one platform. Start with the diagnostic to know where you stand.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {TOOLS.map((tool, i) => (
              <motion.div
                key={tool.title}
                {...fadeUp(0.08 * i)}
                className="group rounded-2xl border border-border bg-card p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(tool.path)}
              >
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <tool.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">{tool.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{tool.desc}</p>
                <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                  Open <ArrowRight className="h-4 w-4" />
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.3)} className="text-center mt-12">
            <Button
              variant="gold"
              size="lg"
              className="text-base px-10 py-5 hover:scale-105 transition-transform gap-2"
              onClick={() => navigate('/prep/dashboard')}
            >
              <ArrowRight className="h-5 w-5" /> Go to Dashboard
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-6">
          <Footer language="en" variant="dark" />
        </div>
      </footer>
    </div>
  );
};

export default PrepLanding;
