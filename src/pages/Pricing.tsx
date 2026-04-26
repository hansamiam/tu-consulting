// Pricing page — single Founding Membership offer ($9/mo or $90/yr, capped at 100).
// Honest framing: price-lock is the offer; we're early; group office hours included.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Plan = "monthly" | "yearly";

const FOUNDING_BENEFITS = [
  "Full Scholarship Finder (free tier limited to 10 results / filter)",
  "Academy access at launch — first to receive every new course, vault essay, and country guide",
  "All Prep Premium tools as they ship — for free, forever",
  "Monthly 60-minute group office hours with founders Nurzada & Samuel",
  "Lifetime price lock — even after public launch raises to $29/mo",
  "Founding Member badge + name in our credits",
  "Direct line to founders for product input",
];

const Pricing = () => {
  const { user, subscription } = useAuth();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundingLeft, setFoundingLeft] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("founding_member_counter")
      .select("claimed_count, cap")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFoundingLeft(Math.max(0, data.cap - data.claimed_count));
      });
  }, []);

  const startCheckout = async () => {
    if (!user) {
      sessionStorage.setItem("post_auth_redirect", "/pricing");
      setAuthOpen(true);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
      body: { tier: "founding", interval: plan === "yearly" ? "year" : "month" },
    });
    setLoading(false);
    if (error || !data?.url) {
      toast.error(data?.error || "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

  const monthlyEquiv = plan === "yearly" ? "$7.50" : "$9";
  const totalLine = plan === "yearly" ? "$90 billed yearly · save 17%" : "Billed monthly";
  const isFounding = subscription.tier === "founding";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <Badge className="mb-4 bg-gold/15 text-gold border-gold/30">Founding Membership · 100 spots</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Get in early.<br />
            <span className="text-gold">Pay $9 forever.</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-base">
            We're building TopUni in public. The first 100 members lock in <strong>$9/mo for life</strong> —
            even after we raise to $29 at public launch. You shape what we build next.
          </p>
        </motion.div>

        {/* Honesty note */}
        <div className="max-w-2xl mx-auto mb-10 p-4 rounded-xl bg-muted/40 border border-border text-sm text-muted-foreground text-center">
          <strong className="text-foreground">Real talk:</strong> we're shipping fast. Some tools are live (Scholarship Finder, Diagnostic, Essay Grader),
          others are <em>coming soon</em>. As a founding member you get everything as it lands — and your price never moves.
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-muted p-1 rounded-full">
            <button
              onClick={() => setPlan("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                plan === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPlan("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                plan === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Yearly
              <Badge className="bg-green-500/15 text-green-600 border-0 text-[10px]">Save 17%</Badge>
            </button>
          </div>
        </div>

        {/* Single founding card */}
        <Card className="max-w-xl mx-auto p-8 sm:p-10 bg-gradient-to-br from-background via-background to-gold/5 border-gold/40 shadow-xl relative">
          {foundingLeft !== null && foundingLeft > 0 && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary border-0">
              {foundingLeft} of 100 spots left
            </Badge>
          )}

          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-gold" />
            <h2 className="text-xl font-semibold">Founding Member</h2>
          </div>

          <div className="flex items-baseline gap-2 mt-4 mb-1">
            <span className="text-5xl font-bold">{monthlyEquiv}</span>
            <span className="text-muted-foreground">/month</span>
            <span className="ml-2 text-sm text-muted-foreground line-through">$29</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">{totalLine} · cancel anytime</p>

          <ul className="space-y-3 mb-8">
            {FOUNDING_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm">
                <Check className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <Button
            variant="gold"
            size="lg"
            className="w-full gap-2 text-base"
            disabled={loading || foundingLeft === 0 || isFounding}
            onClick={startCheckout}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFounding ? (
              <>
                <Crown className="w-4 h-4" /> You're a Founding Member
              </>
            ) : foundingLeft === 0 ? (
              "Sold out — join waitlist"
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Claim my founding spot
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            7-day money-back guarantee · Stripe secure checkout
          </p>
        </Card>

        {/* Free tier blurb */}
        <div className="text-center mt-12 max-w-2xl mx-auto space-y-2">
          <p className="text-sm text-muted-foreground">
            Not ready? <strong className="text-foreground">Free</strong> still gets you the Scholarship Finder (top 10 results),
            Diagnostic test, and TopUni AI chat.
          </p>
          <p className="text-sm text-muted-foreground">
            Need 1:1 help instead?{" "}
            <button onClick={() => navigate("/offerings")} className="underline text-foreground">
              See consulting →
            </button>
          </p>
        </div>
      </main>
      <Footer language="en" />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Create your account"
        description="One-tap sign in. We'll redirect you to checkout."
      />
    </div>
  );
};

export default Pricing;
