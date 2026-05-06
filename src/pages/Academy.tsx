// Academy — public sees the waitlist landing; founder sees the actual
// Academy hub (workshops + office hours + guides). When Academy ships
// publicly, the founder allowlist will be replaced with a "subscribed"
// check via the subscriptions table.
import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { isFounder } from "@/lib/founder";
import { AcademyFounderHub } from "@/components/academy/AcademyFounderHub";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import joshPhoto from "@/assets/josh.jpg";
import aigulPhoto from "@/assets/aigul.jpeg";

// PILLARS / SAMPLE_WORKSHOPS retired round 10 alongside their sections.
const FACULTY = [
  { name: "Samuel Han",            credential: "Yale",                photo: samuelPhoto, brings: "Personal statement strategy, US admissions" },
  { name: "Nurzada Abdivalieva",   credential: "Cambridge · Tsinghua", photo: nurzadaPhoto, brings: "Schwarzman path, UK & China admissions" },
  { name: "Josh Hughes",           credential: "Harvard",             photo: joshPhoto,   brings: "Interview signal, scholarship interviews" },
  { name: "Aigul Abdoubaetova",    credential: "Ex-OSCE Academy",     photo: aigulPhoto,  brings: "Funding stack design, country deep-dives" },
];

const Academy = () => {
  const { user } = useAuth();
  const founder = isFounder(user?.email);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Founder sees the actual Academy hub behind the public waitlist wall;
  // public still gets the waitlist landing below.
  if (founder) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <AcademyFounderHub />
        <Footer language="en" />
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("waitlist_emails").insert({ email: email.trim().toLowerCase() });
    setSubmitting(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error("Couldn't save your email. Try again?");
      return;
    }
    setDone(true);
    toast.success("You're on the list. We'll email when Academy opens.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO ───────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.1),_transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          {/* Coming-soon pill — was leading with a Sparkles icon (AI-magic
              connotation, doesn't fit a "we're not open yet" status).
              Plain typography reads cleaner and matches the rest of
              the editorial pill treatments on the page. */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-[11px] font-semibold uppercase tracking-[0.18em] mb-6">
            Coming soon
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight tracking-tight">
            TopUni <span className="text-gold">Academy</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Workshops, country guides, and office hours — taught directly by founders who went through Yale, Cambridge, and Harvard themselves.
          </motion.p>
        </div>
      </section>

      {/* WAITLIST — promoted up to right under the hero. Was at the
          bottom of the page; visitors who skimmed the hero and scrolled
          off lost the conversion surface. Putting it here turns the
          page into a clear single-task: read why → join the list. */}
      <section className="max-w-2xl mx-auto px-4 pt-10 sm:pt-12 pb-4">
        <Card className="border-gold/30">
          <CardContent className="p-7">
            <h3 className="font-heading text-lg font-bold text-foreground mb-2 tracking-tight">
              Get notified when Academy opens
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Waitlist members get the first cohort spots before public signup. We'll email you the moment doors open — no other emails until then.
            </p>

            {done ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                <Check className="h-4 w-4" /> You're on the list — we'll be in touch.
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="gold" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify me"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      {/* TAUGHT BY FOUNDERS ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-16 sm:pt-20 pb-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">Taught by founders</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            The people who've been through it teach the cohort.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Not TAs, not pre-recorded talking heads, not freelancers. The four people listed below run every cohort personally.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FACULTY.map((f) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-border rounded-xl p-5 text-center"
            >
              <img
                src={f.photo}
                alt={f.name}
                className="h-16 w-16 rounded-full object-cover mx-auto mb-3 ring-1 ring-border"
              />
              <h3 className="font-heading font-semibold text-base text-foreground tracking-tight leading-tight">
                {f.name}
              </h3>
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold mt-1.5">
                {f.credential}
              </p>
              <p className="text-xs text-muted-foreground leading-snug mt-3">
                {f.brings}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Round-10 simplification: PILLARS / SAMPLE LINEUP / WHAT IT
          ISN'T sections retired. Earlier the page over-explained Academy
          before it had even shipped — three editorial blocks about
          formats / sample sessions / negative-space positioning. The
          waitlist below is the only thing the page needs to do at this
          stage. */}

      {/* Bottom escape hatch — small line pointing visitors to Discover
          since the waitlist (above) is the only conversion on this
          page. The full waitlist Card moved up to right under the hero. */}
      <section className="max-w-2xl mx-auto px-4 pb-16 text-center">
        <p className="text-xs text-muted-foreground">
          Looking for ranked scholarships now?{" "}
          <Link to="/discover" className="underline text-foreground hover:text-gold-dark transition-colors">Open Discover →</Link>
        </p>
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
