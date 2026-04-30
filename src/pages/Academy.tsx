// Academy — generic "Coming soon" placeholder. No 2026 date, no Discord, no founding lock-in copy.
import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Check, Loader2, BookOpen, Video, FileText, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PILLARS = [
  { icon: Video, title: "Live workshops", body: "Small-group sessions on essays, interviews, and scholarship strategy." },
  { icon: FileText, title: "Country playbooks", body: "Step-by-step guides per destination — deadlines, docs, common pitfalls." },
  { icon: BookOpen, title: "Tailored advising tracks", body: "Curated learning paths based on your target country and degree." },
  { icon: MessageSquare, title: "Group office hours", body: "Live Q&A with our advisors as you build your application." },
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
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl sm:text-6xl font-heading font-bold text-primary-foreground mb-5 leading-tight">
            TopUni <span className="text-gold">Academy</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/75 text-lg max-w-xl mx-auto">
            Workshops, country playbooks, and tailored advising tracks for serious applicants.
          </motion.p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-14">
        <div className="grid sm:grid-cols-2 gap-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/60">
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

      <section className="max-w-2xl mx-auto px-4 pb-20">
        <Card className="border-gold/30">
          <CardContent className="p-7">
            <h3 className="text-lg font-heading font-bold text-foreground mb-2">
              Get notified when Academy opens
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              We'll email you the moment the first cohort opens.
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

            <div className="mt-6 pt-6 border-t border-border/60 text-center">
              <p className="text-xs text-muted-foreground">
                Looking for ranked scholarships now?{" "}
                <Link to="/discover" className="underline text-foreground">Open Discover →</Link>
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
