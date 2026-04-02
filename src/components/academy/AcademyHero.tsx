import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, BookOpen, Users, Trophy, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface AcademyHeroProps {
  onExplore: () => void;
}

export const AcademyHero = ({ onExplore }: AcademyHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-primary min-h-[70vh] flex items-center">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,hsl(var(--gold)/0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,hsl(var(--gold)/0.08),transparent_50%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-6"
          >
            <Badge className="bg-gold/15 text-gold border-gold/30 text-xs font-medium">
              <Sparkles className="w-3 h-3 mr-1" /> TopUni Academy
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
              Learn from those who{" "}
              <span className="text-gold">actually got in.</span>
            </h1>

            <p className="text-lg text-primary-foreground/70 max-w-lg">
              Not another course platform. A living archive of real accepted applications, 
              recorded workshops from admissions insiders, and a community of students 
              who share what actually works.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="gold" size="lg" onClick={onExplore} className="group">
                Explore Free Content
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="border-gold/30 text-gold hover:bg-gold/10">
                <Play className="w-4 h-4 mr-2" /> Watch Intro
              </Button>
            </div>

            {/* Stats row */}
            <div className="flex gap-8 pt-4">
              {[
                { icon: BookOpen, value: "40+", label: "Resources" },
                { icon: Users, value: "850+", label: "Students" },
                { icon: Trophy, value: "94%", label: "Satisfaction" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="w-5 h-5 text-gold mx-auto mb-1" />
                  <div className="text-xl font-bold text-primary-foreground">{stat.value}</div>
                  <div className="text-[11px] text-primary-foreground/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Floating cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: "SOP That Got Into UCL", type: "Case Study", free: true },
                  { title: "IELTS 8.0 Strategy Workshop", type: "Recording", free: false },
                  { title: "Scholarship Essay Template", type: "Template", free: true },
                  { title: "How I Got Full Ride at NYU", type: "Masterclass", free: false },
                ].map((card, i) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="bg-primary-foreground/5 backdrop-blur-sm border border-gold/20 rounded-lg p-4 hover:border-gold/40 transition-all"
                  >
                    <Badge className="text-[10px] bg-gold/15 text-gold mb-2">{card.type}</Badge>
                    <p className="text-sm font-medium text-primary-foreground/90">{card.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {card.free ? (
                        <span className="text-[10px] text-green-400 font-medium">FREE</span>
                      ) : (
                        <span className="text-[10px] text-gold/60 font-medium">PRO</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Glow */}
              <div className="absolute -inset-4 bg-gold/5 rounded-2xl blur-3xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
