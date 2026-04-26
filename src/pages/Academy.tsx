import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, BookOpen, Users, Video, FileText, MessageSquare, Sparkles, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PILLARS = [
  { icon: Video, title: "Live workshops", body: "Monthly small-group sessions on essays, interviews, and scholarship strategy." },
  { icon: FileText, title: "Application Vault", body: "Real accepted essays, personal statements, and CVs from admitted students." },
  { icon: BookOpen, title: "Step-by-step playbooks", body: "Country-specific application playbooks: deadlines, docs, common pitfalls." },
  { icon: MessageSquare, title: "Founding-only Discord", body: "Direct access to mentors and a private community of serious applicants." },
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

      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.1),_transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Coming early 2026
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight">
            The TopUni <span className="text-gold">Academy</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/75 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
            Workshops, accepted-essay vaults, country playbooks and a private community —
            for students serious about elite admissions.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Button asChild size="lg" variant="gold" className="font-semibold">
              <Link to="/pricing">
                <Crown className="h-4 w-4 mr-2" />
                Lock in Founding · $9/mo
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
              <Link to="/offerings">Book a free call</Link>
            </Button>
          </motion.div>

          <p className="text-primary-foreground/50 text-xs mt-5">
            Founding members get Academy free for life when it launches. Capped at 100 spots.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">What's inside Academy</h2>
          <p className="text-muted-foreground">Built around what actually moves the needle on elite admissions.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/60 hover:border-gold/40 transition-colors">
              <CardContent className="p-5 flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-20">
        <Card className="border-gold/30 bg-gradient-to-br from-card to-card/60">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-gold" />
              <span className="text-xs font-semibold uppercase tracking-wide text-gold">Free waitlist</span>
            </div>
            <h3 className="text-xl font-heading font-bold text-foreground mb-2">
              Get notified when Academy opens
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Or skip the wait — Founding Members get Academy <strong className="text-foreground">free for life</strong> at $9/mo, locked in forever.
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
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify me"}
                </Button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Or skip the wait →</p>
                <p className="text-xs text-muted-foreground">Founding Member · price locked forever</p>
              </div>
              <Button asChild variant="gold" className="font-semibold">
                <Link to="/pricing">Become a Founding Member</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Footer language="en" />
    </div>
  );
};

export default Academy;
