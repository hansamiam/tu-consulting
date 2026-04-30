import { useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, ArrowRight, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    toast.success("You're on the list.");
  };

  return (
    <div className="min-h-screen bg-canvas-soft relative overflow-hidden">
      {/* Subtle warm ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] rounded-full blur-[160px] opacity-[0.08] pointer-events-none"
           style={{ background: "radial-gradient(circle, hsl(42 70% 50%) 0%, transparent 70%)" }} />

      <div className="relative">
        <Navigation />

        <main className="max-w-2xl mx-auto px-6 lg:px-10 pt-20 lg:pt-32 pb-24">
          {/* Meta strip */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-[11px] font-mono uppercase tracking-[0.28em] text-gold-dark mb-14 text-center"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-gold-dark" />
              Academy · Opening 2026
              <span className="h-1 w-1 rounded-full bg-gold-dark" />
            </span>
          </motion.p>

          {/* Title — consistent with Journal masthead */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="border-y border-foreground/15 py-10 lg:py-14"
          >
            <h1 className="font-heading text-[clamp(3rem,10vw,6rem)] font-bold leading-[0.95] tracking-[-0.04em] text-center">
              <span className="text-primary">TopUni </span>
              <span className="italic font-light text-gold-dark">Academy</span>
            </h1>
          </motion.div>

          {/* Lede */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-center text-lg sm:text-xl leading-[1.55] text-foreground/75 max-w-xl mx-auto mt-12 mb-4 font-light"
          >
            Recordings of every monthly workshop and office hour, with our founders.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-center text-sm leading-[1.7] text-muted-foreground max-w-md mx-auto mb-14"
          >
            Personal statement clinics, scholarship strategy, country deep-dives, application post-mortems. Watch on your schedule. Members only.
          </motion.p>

          {/* Email card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="bg-card border border-border rounded-2xl p-7 sm:p-8 shadow-sm"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Play className="h-4 w-4 text-gold-dark fill-gold-dark/20" />
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-gold-dark">First access</p>
            </div>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground tracking-tight mb-2">
              Be there for the first session.
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-[1.65]">
              Founding members get early access and locked-in pricing.
            </p>

            {done ? (
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <Check className="h-4 w-4" /> You're on the list.
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-12 bg-background text-base"
                />
                <Button type="submit" variant="gold" disabled={submitting} className="h-12 px-6 gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Notify me <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            )}
          </motion.div>
        </main>

        <Footer language="en" />
      </div>
    </div>
  );
};

export default Academy;
