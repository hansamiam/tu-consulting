import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Target, AlertTriangle, Calendar, Lightbulb, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { DiscoverProfileGate, getStoredProfile, type DiscoverProfile } from "@/components/discover/DiscoverProfileGate";
import heroImage from "@/assets/hero-campus.jpg";

interface Props { language?: "en" | "ru" }

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

const Discover = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const navigate = useNavigate();
  const appPath = isRu ? "/discover/ru/app" : "/discover/app";
  const [gateOpen, setGateOpen] = useState(false);

  const handleLaunch = () => {
    if (getStoredProfile()) {
      navigate(appPath);
    } else {
      setGateOpen(true);
    }
  };

  const handleGateComplete = (_lead: DiscoverProfile) => {
    setGateOpen(false);
    navigate(appPath);
  };

  const tools = [
    {
      icon: Target,
      title: isRu ? "Фит-скор" : "Fit Score",
      desc: isRu
        ? "Каждая стипендия отранжирована под твой ГПА, баллы, гражданство и специальность."
        : "Every scholarship ranked against your GPA, test scores, citizenship, and field.",
    },
    {
      icon: AlertTriangle,
      title: isRu ? "Жёсткие пороги" : "Hard Cutoffs",
      desc: isRu
        ? "IELTS, GPA, SAT — пороги видны сразу, не тратишь цикл впустую."
        : "IELTS, GPA, SAT thresholds shown upfront — never waste a cycle.",
    },
    {
      icon: Calendar,
      title: isRu ? "Реальные дедлайны" : "Live Deadlines",
      desc: isRu
        ? "Верифицированные даты с обратным отсчётом и приоритетом по срочности."
        : "Verified deadlines with countdowns and urgency priority.",
    },
    {
      icon: Lightbulb,
      title: isRu ? "Стратегия победы" : "How to Win",
      desc: isRu
        ? "Идеальный профиль, частые причины отказа и что готовить первым."
        : "Ideal candidate profile, common rejection reasons, what to prep first.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      <DiscoverProfileGate open={gateOpen} onOpenChange={setGateOpen} onComplete={handleGateComplete} language={language} />

      {/* Hero — Prep-style campus backdrop */}
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
            Top Uni <span className="text-gold">Discover</span>
          </motion.h1>
          <motion.p
            {...fadeUp(0.25)}
            className="text-primary-foreground/80 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed"
          >
            {isRu
              ? "Стипендии, отранжированные под твой профиль. Реальные пороги, реальные дедлайны, реальный шанс."
              : "Scholarships ranked against your profile. Real cutoffs, real deadlines, real shot."}
          </motion.p>
          <motion.div {...fadeUp(0.4)}>
            <Button
              variant="gold"
              size="lg"
              className="text-lg px-12 py-6 hover:scale-105 transition-transform gap-2"
              onClick={handleLaunch}
            >
              <Sparkles className="h-5 w-5" /> {isRu ? "Открыть базу стипендий" : "Launch Discover database"}
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* What's inside */}
      <section className="py-20 sm:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {isRu ? "Что внутри" : "What's inside"}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {isRu
                ? "Четыре инструмента, одна база. Заполни профиль — увидишь матчи."
                : "Four tools, one database. Fill your profile to see your matches."}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * i, duration: 0.5 }}
                className="group rounded-2xl border border-border bg-card p-6 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer"
                onClick={handleLaunch}
              >
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <tool.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">{tool.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{tool.desc}</p>
                <span className="inline-flex items-center gap-1 text-accent font-medium text-sm group-hover:gap-2 transition-all">
                  {isRu ? "Открыть" : "Unlock"} <ArrowRight className="h-4 w-4" />
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center mt-12"
          >
            <Button
              variant="gold"
              size="lg"
              className="text-base px-10 py-5 hover:scale-105 transition-transform gap-2"
              onClick={handleLaunch}
            >
              <ArrowRight className="h-5 w-5" /> {isRu ? "Открыть базу стипендий" : "Launch Discover database"}
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer language={language} />
    </div>
  );
};

export default Discover;
