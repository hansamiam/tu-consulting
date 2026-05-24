// Academy — members area + public landing. The CurrentCohort
// section renders dynamically: members see the live cohort + events,
// non-members see a membership CTA, and the section self-hides in
// the transition gap between cohorts.
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import AcademyResourceList from "@/components/academy/AcademyResourceList";
import CurrentCohort from "@/components/academy/CurrentCohort";

const FOUNDERS = [
  { name: "Samuel Han",          credential: "Yale",                  photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", credential: "Cambridge · Tsinghua",   photo: nurzadaPhoto },
];

interface AcademyProps { language?: "en" | "ru"; }

const Academy = ({ language = "en" }: AcademyProps) => {
  const ru = language === "ru";
  const t = (en: string, rText: string) => (ru ? rText : en);
  useEffect(() => {
    const prev = document.title;
    document.title = ru
      ? "Академия — Прямые сессии с выпускниками · TopUni"
      : "Academy — Live sessions with the team · TopUni";
    return () => { document.title = prev; };
  }, [ru]);
  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
      <Navigation language={language} variant="overlay" overlaySentinelId="academy-hero-end" />

      {/* HERO — pulled up behind the nav with -mt-16 (nav h-16 = 64px)
          so the navy band extends THROUGH the nav strip, eliminating
          the cream-nav-above-navy-hero seam. Mirror of Index.tsx's
          hero treatment. Inner padding boosted (pt-32 / sm:pt-36) so
          the eyebrow + h1 still sit comfortably below the nav region
          rather than crashing into it. */}
      <section className="relative -mt-16 bg-gradient-to-br from-primary via-primary to-primary/90 pt-32 sm:pt-36 pb-20 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.1),_transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight tracking-tight">
            TopUni <span className="text-gold">Academy</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            {t(
              "Joined by guest experts from around the world.",
              "С приглашёнными экспертами со всего мира.",
            )}
          </motion.p>
        </div>
        {/* Sentinel at the very bottom of the navy hero. Navigation
            uses this (via overlaySentinelId) to flip from transparent-
            overlay to opaque-cream the moment the navy band scrolls
            past the nav strip — adapts automatically to mobile vs
            desktop hero heights instead of relying on a fixed
            scrollY pixel threshold that misfires on one or the other. */}
        <div id="academy-hero-end" aria-hidden className="h-px w-full" />
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

      {/* /academy/live retired 2026-05-20 — was a fake video-chrome
          surface that didn't work without real Zoom/Meet embed. The
          member-access card here pointed at it; removed alongside. */}

      {/* CURRENT COHORT — Phase B4 v2. Renders the active cohort cycle
          (name, dates, next 3 events) for members; teaser CTA for
          non-members. Self-hides during transition gaps between cycles
          (no open/in_progress cohort in the next 60 days). */}
      <CurrentCohort language={language} />

      {/* RESOURCES — members-only file/link library. The list renders
          even when empty so members know the system is live; the
          actual download is gated by academy-resource-url. */}
      <section className="max-w-3xl mx-auto px-4 pt-6 pb-14">
        <div className="mb-8 text-center">
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
            {t("Resources", "Ресурсы")}
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("Templates, frameworks, deep dives.", "Шаблоны, фреймворки, разборы.")}
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            {t(
              "Members get the working files we use with private clients.",
              "Участники получают рабочие файлы, которые мы используем с частными клиентами.",
            )}
          </p>
        </div>
        <AcademyResourceList language={language} />
      </section>

      {/* Original CTA section retired here per user direction — "less is more".
          The "Doors open in June" callout + Build-strategy/Open-Discover
          buttons duplicated CTA the visitor already had via the global
          nav. The Academy hero badge ("Launching in June") communicates
          timing on its own; Discover and TopUni AI are reachable from
          every page via Navigation. */}

      {/* Bottom bookend — short gradient ramp into the navy footer.
          Pre-fix this was h-32/40 (128-160px) which felt like dead air
          between the last content section and the footer. The home
          landing page bridges into the footer via a CONTENT section
          with built-in gradient (Membership), not an empty 160px
          gradient block. Trimmed to h-12/16 so the visual ramp lands
          quickly. */}
      <div
        className="h-12 sm:h-16"
        style={{
          backgroundImage: `linear-gradient(180deg,
            transparent 0%,
            hsl(var(--primary) / 0.10) 50%,
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
