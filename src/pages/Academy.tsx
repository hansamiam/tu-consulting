// Academy — public landing for the upcoming June launch.
// The AcademyFounderHub (workshops + office hours + guides) is now an
// admin-only surface at /admin/academy; the public /academy route
// always shows the launch landing regardless of auth state, so signed-in
// users don't get a different page than anon users.
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";

// Round-29: pruned the founder grid from 4 → 2 (Samuel + Nurzada). The
// rest of the cohort experience comes through rotating guest experts —
// emphasised below the founder pair so the page reads as
// "two founders + a global expert network" rather than a static cohort.
const FOUNDERS = [
  { name: "Samuel Han",          credential: "Yale",                  photo: samuelPhoto },
  { name: "Nurzada Abdivalieva", credential: "Cambridge · Tsinghua",   photo: nurzadaPhoto },
];

const Academy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO ───────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.1),_transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Launching in June
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight tracking-tight">
            TopUni <span className="text-gold">Academy</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Workshops, country guides, and office hours from founders who went through Yale and Cambridge themselves — joined by guest experts from across the world.
          </motion.p>
        </div>
      </section>

      {/* FOUNDERS ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-16 sm:pt-20 pb-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">From the founders</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            Built and run by the founders.
          </h2>
        </div>
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

        {/* Guest network — kept intentionally vague at this stage so we
            don't over-promise specifics (admissions officers, essay
            editors, etc) before they're locked in. */}
        <div className="mt-12 sm:mt-14">
          <div className="relative rounded-2xl border border-border bg-gradient-to-br from-primary/[0.04] via-card to-gold/[0.05] p-7 sm:p-9 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--gold)/0.07),_transparent_55%)] pointer-events-none" />
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
                <Globe className="h-3 w-3" />
                Plus a global guest network
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight mb-3">
                Guest experts joining throughout the year.
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Each cohort brings in additional voices to round out the workshops. Details closer to launch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-gold/30 bg-card p-7 text-center">
          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-2 tracking-tight">
            Doors open in June.
          </h3>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed max-w-md mx-auto">
            Until then, the rest of TopUni — your personalized strategy from TopUni AI and the scholarship Discover database — is live and free during beta.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-center">
            <Button asChild variant="gold" className="gap-1.5">
              <Link to="/topuni-ai">
                Build my strategy <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1.5">
              <Link to="/discover">
                Open Discover
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

      <Footer language="en" />
    </div>
  );
};

export default Academy;
