// Academy — public landing for the upcoming June launch.
// Public /academy always shows the launch landing regardless of
// auth state, so signed-in users don't see a different page.
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CampusBackdrop } from "@/components/CampusBackdrop";
import { Button } from "@/components/ui/button";
import { Award, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";

const FOUNDERS = [
  { name: "Samuel Han",          credential: "Yale",                  photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", credential: "Cambridge · Tsinghua",   photo: nurzadaPhoto },
];

interface AcademyProps { language?: "en" | "ru"; }

const Academy = ({ language = "en" }: AcademyProps) => {
  const ru = language === "ru";
  const t = (en: string, rText: string) => (ru ? rText : en);
  return (
    <div className="min-h-screen relative bg-background">
      <CampusBackdrop />
      <div className="relative z-10">
      <Navigation language={language} />

      {/* HERO ───────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.1),_transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-6">
            <Award className="h-3.5 w-3.5" /> {t("Launching in June", "Запуск в июне")}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight tracking-tight">
            TopUni <span className="text-gold">Academy</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t(
              "Workshops and office hours, joined by guest experts from across the world.",
              "Воркшопы и office-hours с приглашёнными экспертами со всего мира.",
            )}
          </motion.p>
        </div>
      </section>

      {/* FOUNDERS ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-16 sm:pt-20 pb-10">
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {FOUNDERS.map((f) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-border rounded-2xl p-6 text-center"
            >
              <img
                src={f.photo}
                alt={f.name}
                className="h-20 w-20 rounded-full object-cover mx-auto mb-4 ring-1 ring-border"
              />
              <h3 className="font-heading font-semibold text-lg text-foreground tracking-tight leading-tight">
                {f.name}
              </h3>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold mt-2">
                {f.credential}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-gold/30 bg-card p-7 text-center">
          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-2 tracking-tight">
            {t("Doors open in June.", "Двери откроются в июне.")}
          </h3>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed max-w-md mx-auto">
            {t(
              "Until then, the rest of TopUni — your personalized strategy from TopUni AI and the scholarship Discover database — is live and free during beta.",
              "А пока остальной TopUni — ваша персональная стратегия от TopUni AI и база стипендий Discover — доступен бесплатно во время беты.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-center">
            <Button asChild variant="gold" className="gap-1.5">
              <Link to={ru ? "/topuni-ai/ru" : "/topuni-ai"}>
                {t("Build my strategy", "Построить стратегию")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to={ru ? "/discover/ru" : "/discover"}>
                {t("Open Discover", "Открыть Discover")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bottom bookend — gradient ramp into the navy footer */}
      <div
        className="h-32 sm:h-40"
        style={{
          backgroundImage: `linear-gradient(180deg,
            transparent 0%,
            hsl(var(--primary) / 0.06) 40%,
            hsl(var(--primary) / 0.30) 75%,
            hsl(var(--primary)) 100%)`,
        }}
        aria-hidden="true"
      />

      <Footer language={language} />
      </div>
    </div>
  );
};

export default Academy;
