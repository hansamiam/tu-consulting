import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language={language} />

      <DiscoverProfileGate open={gateOpen} onOpenChange={setGateOpen} onComplete={handleGateComplete} language={language} />

      {/* Hero — TopUni AI style: centered, full-bleed background */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative flex-1 flex items-center justify-center bg-cover bg-center min-h-[80vh]"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,35,66,0.92) 0%, rgba(10,35,66,0.72) 100%), url(${heroImage})`,
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center py-20">
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
            BETA
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

      <Footer language={language} />
    </div>
  );
};

export default Discover;
