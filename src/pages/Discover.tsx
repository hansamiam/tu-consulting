import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Database, Filter, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  DiscoverProfileGate,
  getStoredProfile,
  type DiscoverProfile,
} from "@/components/discover/DiscoverProfileGate";

interface Props { language?: "en" | "ru" }

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
});

const Discover = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const navigate = useNavigate();
  const appPath = isRu ? "/discover/ru/app" : "/discover/app";
  const [gateOpen, setGateOpen] = useState(false);

  const handleLaunch = () => {
    if (getStoredProfile()) navigate(appPath);
    else setGateOpen(true);
  };

  const handleGateComplete = (_lead: DiscoverProfile) => {
    setGateOpen(false);
    navigate(appPath);
  };

  // Editorial stat strip — kept honest, no fabricated numbers
  const stats = [
    { k: isRu ? "Стипендий" : "Scholarships", v: "120+", note: isRu ? "верифицировано" : "verified" },
    { k: isRu ? "Стран" : "Countries", v: "30+", note: isRu ? "по миру" : "worldwide" },
    { k: isRu ? "Обновлено" : "Updated", v: "2026", note: isRu ? "цикл" : "cycle" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language={language} />

      <DiscoverProfileGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        onComplete={handleGateComplete}
        language={language}
      />

      {/* HERO — Editorial. Asymmetric grid, oversized serif-feel display, mono eyebrow. */}
      <section className="relative flex-1 bg-hero-soft overflow-hidden">
        {/* faint dot grid texture */}
        <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />

        {/* gold underline accent — top right */}
        <div className="absolute top-32 right-0 hidden lg:block w-32 h-px bg-gold/60" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-32">
          <div className="grid lg:grid-cols-12 gap-12 items-end">
            {/* LEFT — primary editorial column */}
            <div className="lg:col-span-8">
              <motion.p
                {...fadeUp(0.05)}
                className="label-mono text-accent mb-8"
              >
                {isRu ? "База / 2026 цикл" : "Database / 2026 cycle"}
              </motion.p>

              <motion.h1
                {...fadeUp(0.15)}
                className="font-heading font-bold text-foreground leading-[0.95] tracking-tight text-[clamp(2.75rem,7vw,5.75rem)] mb-8"
              >
                {isRu ? (
                  <>Стипендии,<br />
                    <span className="italic font-light text-primary/70">которые </span>
                    <span className="text-accent">реальны </span>
                    <span className="italic font-light text-primary/70">для тебя.</span>
                  </>
                ) : (
                  <>Scholarships,<br />
                    <span className="italic font-light text-primary/70">ranked </span>
                    <span className="text-accent">honestly </span>
                    <span className="italic font-light text-primary/70">against you.</span>
                  </>
                )}
              </motion.h1>

              <motion.p
                {...fadeUp(0.3)}
                className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10 font-light"
              >
                {isRu
                  ? "Не каталог. Каждая стипендия проверена, ранжирована против твоего профиля и снабжена тем, что обычно скрыто: причинами отказов, точными требованиями, реальными шансами."
                  : "Not a catalog. Every scholarship verified, ranked against your profile, and annotated with what usually stays hidden — rejection patterns, real cutoffs, your actual odds."}
              </motion.p>

              <motion.div {...fadeUp(0.45)} className="flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  onClick={handleLaunch}
                  className="bg-foreground text-background hover:bg-foreground/90 h-14 px-8 text-base rounded-full gap-2 shadow-lg group"
                >
                  {isRu ? "Открыть базу" : "Open the database"}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  {isRu ? "Бесплатно в бете · 30 секунд" : "Free in beta · 30 seconds"}
                </p>
              </motion.div>
            </div>

            {/* RIGHT — vertical stat rail */}
            <motion.aside
              {...fadeUp(0.55)}
              className="lg:col-span-4 lg:border-l lg:border-border lg:pl-10 space-y-8"
            >
              {stats.map((s) => (
                <div key={s.k}>
                  <div className="label-mono text-muted-foreground mb-2">{s.k}</div>
                  <div className="font-heading text-5xl font-bold text-foreground leading-none tabular-nums">
                    {s.v}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">{s.note}</div>
                </div>
              ))}
            </motion.aside>
          </div>

          {/* BOTTOM — editorial process strip */}
          <motion.div
            {...fadeUp(0.7)}
            className="mt-24 pt-10 border-t border-border grid sm:grid-cols-3 gap-8"
          >
            {[
              {
                icon: Sparkles,
                k: "01",
                t: isRu ? "Профиль за 30с" : "30-second profile",
                d: isRu ? "Имя, гражданство — только нужное." : "Just enough to rank you.",
              },
              {
                icon: Filter,
                k: "02",
                t: isRu ? "Точное ранжирование" : "Honest ranking",
                d: isRu ? "По GPA, IELTS, гражданству, бюджету." : "By GPA, IELTS, citizenship, budget — no fluff.",
              },
              {
                icon: Database,
                k: "03",
                t: isRu ? "Что внутри" : "What's hidden inside",
                d: isRu ? "Причины отказов и реальные шансы." : "Rejection patterns + real odds.",
              },
            ].map((step) => (
              <div key={step.k} className="flex gap-4">
                <div className="label-mono text-accent pt-1">{step.k}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <step.icon className="h-4 w-4 text-foreground" />
                    <h3 className="font-heading font-semibold text-foreground">{step.t}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.d}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer language={language} />
    </div>
  );
};

export default Discover;
