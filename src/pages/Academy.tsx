// Academy — public landing for the upcoming June launch.
// Public /academy always shows the launch landing regardless of
// auth state, so signed-in users don't see a different page.
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Award, Video, Mail, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FOUNDERS = [
  { name: "Samuel Han",          credential: "Yale",                  photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", credential: "Cambridge · Tsinghua",   photo: nurzadaPhoto },
];

interface WaitlistSectionProps {
  ru: boolean;
  t: (en: string, ru: string) => string;
}

const WaitlistSection = ({ ru, t }: WaitlistSectionProps) => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    // Light email shape check — the DB will accept anything text but
    // catching the obvious typos client-side gives faster feedback.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(t("Enter a valid email", "Введите корректный email"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("waitlist_emails")
      .insert({ email: trimmed.toLowerCase(), source: "academy_waitlist" });
    setSubmitting(false);
    if (error) {
      // Unique-violation = already on the list. Treat as success.
      if ((error as { code?: string }).code === "23505") {
        setSubmitted(true);
        return;
      }
      toast.error(t("Couldn't save your email — try again?", "Не удалось сохранить email — попробуйте ещё раз?"));
      return;
    }
    setSubmitted(true);
  };

  return (
    <section className="max-w-2xl mx-auto px-4 pb-12 sm:pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="bg-gradient-to-br from-gold/12 via-gold/4 to-transparent border border-gold/40 rounded-2xl p-6 sm:p-8 text-center"
      >
        {submitted ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-gold-dark" />
            </div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
              {t("You're on the list.", "Вы в списке.")}
            </h3>
            <p className="text-muted-foreground text-[13.5px] leading-relaxed max-w-sm">
              {t(
                "We'll email when doors open in June with workshop schedule, intros, and a member password.",
                "Мы напишем, когда двери откроются в июне — пришлём расписание, представления и пароль участника.",
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 mb-5">
              <div className="w-11 h-11 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center">
                <Mail className="h-5 w-5 text-gold-dark" />
              </div>
              <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
                {t("June 2026", "Июнь 2026")}
              </p>
              <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
                {t("Get a heads-up when doors open.", "Сообщим, когда двери откроются.")}
              </h3>
              <p className="text-muted-foreground text-[13.5px] leading-relaxed max-w-md">
                {t(
                  "Cohort size is intentionally small. Waitlist members get first invites + a member password before public launch.",
                  "Размер когорты намеренно небольшой. Участники списка получают первые приглашения и пароль до публичного запуска.",
                )}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("you@email.com", "ваш@email.com")}
                required
                disabled={submitting}
                className="flex-1 bg-card"
                aria-label={t("Email address", "Email")}
              />
              <Button
                type="submit"
                variant="gold"
                disabled={submitting || !email.trim()}
                className="shrink-0"
              >
                {submitting ? t("Saving…", "Сохраняем…") : t("Join waitlist", "В список")}
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground mt-3">
              {t("No spam, just the June kickoff note.", "Без спама — только письмо о старте в июне.")}
            </p>
          </>
        )}
      </motion.div>
    </section>
  );
};

interface AcademyProps { language?: "en" | "ru"; }

const Academy = ({ language = "en" }: AcademyProps) => {
  const ru = language === "ru";
  const t = (en: string, rText: string) => (ru ? rText : en);
  useEffect(() => {
    const prev = document.title;
    document.title = ru
      ? "Академия — Прямые сессии с выпускниками · TopUni"
      : "Academy — Live sessions with the alumni team · TopUni";
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
            <Award className="h-3.5 w-3.5" /> {t("Launching in June", "Запуск в июне")}
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

      {/* Waitlist signup — pre-launch CTA. Captures email to
          waitlist_emails (RLS allows public insert, admin-only read).
          Before this section the Academy page had nothing for a
          visitor to DO — just a "Launching in June" header. */}
      <WaitlistSection ru={ru} t={t} />

      {/* Live session entry — member-only path. The Academy page itself
          stays public-marketing; the live-session room lives at
          /academy/live behind a password gate. This card is the only
          visible pointer to it from the public landing. */}
      <section className="max-w-3xl mx-auto px-4 pb-16 sm:pb-20">
        <Link
          to={ru ? "/academy/live/ru" : "/academy/live"}
          className="group block bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-gold/60 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-11 h-11 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center">
              <Video className="h-5 w-5 text-gold-dark" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">
                {t("Member access", "Доступ для участников")}
              </p>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight">
                {t("Enter the live session", "Войти в прямую сессию")}
              </h3>
              <p className="text-muted-foreground text-[13.5px] leading-relaxed mt-1.5">
                {t(
                  "Live workshops and office hours stream through here. Members enter with the session password.",
                  "Прямые мастер-классы и office hours идут здесь. Участники входят по паролю сессии.",
                )}
              </p>
              <span className="inline-flex items-center gap-1.5 text-gold-dark text-[12.5px] font-semibold mt-3 group-hover:gap-2.5 transition-all">
                {t("Open the live room", "Открыть комнату")} →
              </span>
            </div>
          </div>
        </Link>
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
