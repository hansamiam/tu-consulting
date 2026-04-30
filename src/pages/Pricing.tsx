// Pricing — single Founding Pro tier ($19/mo). No yearly toggle for now.
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

const BENEFITS = [
  "Full Discover — every ranked scholarship match, full strategy notes & rejection insights",
  "Academy access at launch — early courses, country playbooks, vault content",
  "Priority access to new TopUni AI tools as they ship",
  "Lifetime price lock at $19/mo — even after public launch raises the price",
  "Founding Member badge + direct line to founders for product input",
];

const Pricing = () => {
  const { user, subscription } = useAuth();
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
      body: { tier: "founding", interval: "month" },
    });
    setLoading(false);
    if (error || !data?.url) {
      toast.error(data?.error || "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

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
          <Badge className="mb-4 bg-gold/15 text-gold border-gold/30">Membership</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            One membership. <span className="text-gold">Every tool.</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-base">
            Discover and Academy as they ship — at the founding price.
          </p>
        </motion.div>

        <Card className="max-w-xl mx-auto p-8 sm:p-10 bg-gradient-to-br from-background via-background to-gold/5 border-gold/40 shadow-xl relative">
          {foundingLeft !== null && foundingLeft > 0 && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary border-0">
              {foundingLeft} of 100 spots left
            </Badge>
          )}

          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-gold" />
            <h2 className="text-xl font-semibold">Founding Pro</h2>
          </div>

          <div className="flex items-baseline gap-2 mt-4 mb-1">
            <span className="text-5xl font-bold">$19</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">Billed monthly · cancel anytime · price locked for life</p>

          <ul className="space-y-3 mb-8">
            {BENEFITS.map((b) => (
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

        <div className="text-center mt-12 max-w-2xl mx-auto space-y-2">
          <p className="text-sm text-muted-foreground">
            Not ready? <strong className="text-foreground">Free</strong> still gets you Discover (top 3 ranked matches),
            the Diagnostic test, and Essay Grader.
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
