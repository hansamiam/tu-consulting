// Academy — members area + public landing. The CurrentCohort
// section renders dynamically: members see the live cohort + events,
// non-members see a membership CTA, and the section self-hides in
// the transition gap between cohorts. Two access cards at the bottom
// route members to the deeper resources library (/academy/resources)
// and non-members to the public lead-magnet primer (/lesson).
import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Award, Lock, FileText, ArrowRight } from "lucide-react";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import CurrentCohort from "@/components/academy/CurrentCohort";
import PastWorkshops from "@/components/academy/PastWorkshops";

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
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-6">
            <Award className="h-3.5 w-3.5" /> {t("Starting in June", "Старт в июне")}
          </motion.div>
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

      {/* PAST WORKSHOPS — recordings archive. Queries published rows
          from public.academy_workshops where recording_url is set and
          scheduled_for is in the past. Section self-hides when empty
          (the resources block below already covers "coming soon"). */}
      <PastWorkshops language={language} />

      {/* ACCESS CARDS — two doors out of /academy:
          (1) Members area → /academy/resources (gated file/link library;
              the public landing no longer renders the resource list inline
              so non-members don't see the "Resources are landing soon"
              empty-state copy that read as half-built).
          (2) Free primer → /lesson (lead-magnet 30-slide deck + video,
              the Instagram funnel destination — same surface non-members
              already hit from IG bio links).
          Members-area card uses lock framing so the value of membership
          is visible without the resource list itself being on display. */}
      <section className="max-w-3xl mx-auto px-4 pt-6 pb-14">
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to={ru ? "/academy/resources/ru" : "/academy/resources"}
            className="group block rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.08] to-transparent hover:from-gold/[0.14] p-6 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-gold-dark" />
              <p className="text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
                {t("Members area", "Зона участников")}
              </p>
            </div>
            <h3 className="font-heading font-semibold text-foreground text-lg tracking-tight leading-snug mb-1.5">
              {t("Templates, frameworks, deep dives.", "Шаблоны, фреймворки, разборы.")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "The working files we use with private clients.",
                "Рабочие файлы, которые мы используем с частными клиентами.",
              )}
            </p>
            <p className="mt-3 text-sm text-gold-dark font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              {t("Open resources", "Открыть ресурсы")} <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </Link>

          <Link
            to={ru ? "/lesson/ru" : "/lesson"}
            className="group block rounded-2xl border border-border bg-card hover:bg-muted/40 p-6 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
                {t("Free primer", "Бесплатный материал")}
              </p>
            </div>
            <h3 className="font-heading font-semibold text-foreground text-lg tracking-tight leading-snug mb-1.5">
              {t("How to get in — the 30-slide playbook.", "Как поступить — 30 слайдов.")}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "The deck we hand out on Instagram.",
                "Гид с нашего Instagram.",
              )}
            </p>
            <p className="mt-3 text-sm text-foreground font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              {t("Read the primer", "Открыть материал")} <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </Link>
        </div>
      </section>

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
