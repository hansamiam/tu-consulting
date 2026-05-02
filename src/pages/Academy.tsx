// Academy — pre-launch page. No dates committed yet, but the page now
// signals what Academy will *be*: founder-led workshops, country guides,
// office hours. Reads as substance the user can opt into rather than
// a bare "Coming soon" placeholder.
import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Check, Loader2, BookOpen, Video, FileText, MessageSquare,
  Mic, Compass, Wallet, Mail, GraduationCap,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import samuelPhoto from "@/assets/samuel.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import joshPhoto from "@/assets/josh.jpg";
import aigulPhoto from "@/assets/aigul.jpeg";

const PILLARS = [
  { icon: Video, title: "Live workshops", body: "Small-group sessions on essays, interviews, and scholarship strategy. Recorded for the cohort." },
  { icon: FileText, title: "Country guides", body: "Step-by-step guides per destination — deadlines, documents, common rejections." },
  { icon: MessageSquare, title: "Office hours", body: "Weekly group Q&A with our founders as you build your application." },
  { icon: BookOpen, title: "Tailored tracks", body: "Pre-built learning paths by target country and degree level — pick one and follow it." },
];

const FACULTY = [
  { name: "Samuel Han",            credential: "Yale",                photo: samuelPhoto, brings: "Personal statement strategy, US admissions" },
  { name: "Nurzada Abdivalieva",   credential: "Cambridge · Tsinghua", photo: nurzadaPhoto, brings: "Schwarzman path, UK & China admissions" },
  { name: "Josh Hughes",           credential: "Harvard",             photo: joshPhoto,   brings: "Interview signal, scholarship interviews" },
  { name: "Aigul Abdoubaetova",    credential: "Ex-OSCE Academy",     photo: aigulPhoto,  brings: "Funding stack design, country deep-dives" },
];

const SAMPLE_WORKSHOPS = [
  { icon: FileText,        title: "Personal statement teardowns",  body: "Live read-throughs of real drafts — what readers actually mark up, what they forget." },
  { icon: Mic,             title: "Interview signal under pressure", body: "What admissions and scholarship panels remember 24 hours later, and how to plant it." },
  { icon: Wallet,          title: "Funding stack design",            body: "Combining scholarships, need-based aid, and need-blind admissions into one viable budget." },
  { icon: Mail,            title: "Reading the decision letter",     body: "Acceptance, deferral, rejection — what to do in the first 48 hours of each, including how to negotiate aid." },
  { icon: Compass,         title: "Country guide deep-dives",        body: "Live walk-throughs of UK, US, Germany, and Canada — each session covers one country end-to-end." },
  { icon: GraduationCap,   title: "Recommendation letter strategy",  body: "How to brief a recommender so they write the letter you actually need, not the generic one." },
];

const Academy = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight tracking-tight">
            TopUni <span className="text-gold">Academy</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Workshops, country guides, and office hours — taught directly by founders who went through Yale, Cambridge, and Harvard themselves.
          </motion.p>
        </div>
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

      {/* PILLARS ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="max-w-2xl mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">What's inside</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            Four formats, one strategy.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/60">
              <CardContent className="p-5 flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-gold-dark" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground tracking-tight mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* SAMPLE LINEUP ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="max-w-2xl mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">Sample lineup</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            What the first cohort actually covers.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            These six sessions anchor the curriculum. We adjust based on what each cohort needs — but every cohort gets the workshops below.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SAMPLE_WORKSHOPS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="h-4 w-4 text-gold-dark" />
              </div>
              <h3 className="font-heading font-semibold text-[15px] text-foreground tracking-tight leading-snug mb-1.5">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHAT IT ISN'T ───────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <div className="bg-card border border-border rounded-2xl p-7 sm:p-9">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">What this is not</p>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight mb-4">
            We made some choices on purpose.
          </h2>
          <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2.5"><span className="text-gold-dark mt-1">·</span><span><span className="text-foreground font-medium">Not a 500-person Zoom call.</span> Cohorts are small enough that the founders know your name and your target list.</span></li>
            <li className="flex gap-2.5"><span className="text-gold-dark mt-1">·</span><span><span className="text-foreground font-medium">Not a paid certificate.</span> No one cares about an Academy badge on your CV. The reps you put in matter.</span></li>
            <li className="flex gap-2.5"><span className="text-gold-dark mt-1">·</span><span><span className="text-foreground font-medium">Not pre-recorded clones.</span> Every workshop is live so we adjust to what your cohort actually needs.</span></li>
            <li className="flex gap-2.5"><span className="text-gold-dark mt-1">·</span><span><span className="text-foreground font-medium">Not a forever subscription.</span> Build through one application cycle, then you're done.</span></li>
          </ul>
        </div>
      </section>

      {/* WAITLIST ────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 pb-20">
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

            <div className="mt-6 pt-6 border-t border-border/60 text-center">
              <p className="text-xs text-muted-foreground">
                Looking for ranked scholarships now?{" "}
                <Link to="/discover" className="underline text-foreground hover:text-gold-dark transition-colors">Open Discover →</Link>
              </p>
            </div>
          </CardContent>
        </Card>
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
