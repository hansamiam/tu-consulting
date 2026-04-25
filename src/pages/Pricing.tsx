// Pricing page — Free / Pro / Founding tiers
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
import { Check, Crown, Sparkles, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Plan = "monthly" | "yearly";

const FEATURES_FREE = [
  "Browse Discover (10 universities/day)",
  "Prep basics + 1 mock exam/month",
  "Academy intro library",
  "AI tools (limited daily uses)",
];

const FEATURES_PRO = [
  "Unlimited Discover Pro filters & saved lists",
  "Full Academy library + new content weekly",
  "Hyper Reports unlocked (university deep-dives)",
  "Prep Premium: essay grader, unlimited mocks, SRS",
  "Application Vault — real accepted essays & SOPs",
  "Monthly group office hours with consultants",
  "Priority email support",
  "$200 off any consulting package",
];

const Pricing = () => {
  const { user, subscription, refreshSubscription } = useAuth();
  const [plan, setPlan] = useState<Plan>("yearly");
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
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

  const startCheckout = async (tier: "pro" | "founding") => {
    if (!user) {
      sessionStorage.setItem("post_auth_redirect", "/pricing");
      setAuthOpen(true);
      return;
    }
    setLoadingTier(tier);
    const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
      body: { tier, interval: plan === "yearly" ? "year" : "month" },
    });
    setLoadingTier(null);
    if (error || !data?.url) {
      toast.error(data?.error || "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

  const proPriceMonthly = plan === "yearly" ? 24 : 29; // $290/yr ≈ $24/mo equiv
  const proPriceTotal = plan === "yearly" ? 290 : 29;
  const foundingPriceTotal = plan === "yearly" ? 190 : 19;

  const isCurrentTier = (t: "free" | "pro" | "founding") => subscription.tier === t;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <Badge className="mb-4 bg-gold/15 text-gold border-gold/30">Membership</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Build your application,<br />
            <span className="text-gold">on your own terms.</span>
          </h1>
          <p className="text-muted-foreground mt-4">
            One membership unlocks every TopUni tool — Discover Pro, Academy, Prep Premium, and Hyper Reports.
            Built for self-driven students, with consulting available when you need it.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-muted p-1 rounded-full">
            <button
              onClick={() => setPlan("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                plan === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPlan("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                plan === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Yearly
              <Badge className="bg-green-500/15 text-green-600 border-0 text-[10px]">Save 17%</Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* FREE */}
          <Card className="p-6 flex flex-col">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="text-sm text-muted-foreground">For exploring TopUni</p>
            </div>
            <div className="mt-5 mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground"> forever</span>
            </div>
            <ul className="space-y-2.5 text-sm flex-1">
              {FEATURES_FREE.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-6 w-full"
              disabled={isCurrentTier("free")}
              onClick={() => navigate("/")}
            >
              {isCurrentTier("free") ? "Current plan" : "Get started"}
            </Button>
          </Card>

          {/* PRO */}
          <Card className="p-6 flex flex-col border-primary/40 ring-1 ring-primary/20 shadow-lg relative">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
              Most popular
            </Badge>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Pro
              </h3>
              <p className="text-sm text-muted-foreground">For serious applicants</p>
            </div>
            <div className="mt-5 mb-6">
              <span className="text-4xl font-bold">${proPriceMonthly}</span>
              <span className="text-muted-foreground">/mo</span>
              {plan === "yearly" && (
                <p className="text-xs text-muted-foreground mt-1">
                  ${proPriceTotal} billed yearly
                </p>
              )}
            </div>
            <ul className="space-y-2.5 text-sm flex-1">
              {FEATURES_PRO.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full gap-2"
              disabled={loadingTier === "pro" || isCurrentTier("pro")}
              onClick={() => startCheckout("pro")}
            >
              {loadingTier === "pro" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCurrentTier("pro") ? (
                "Current plan"
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Start Pro
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              7-day money-back guarantee
            </p>
          </Card>

          {/* FOUNDING */}
          <Card className="p-6 flex flex-col bg-gradient-to-br from-background via-background to-gold/5 border-gold/30 relative">
            {foundingLeft !== null && foundingLeft > 0 && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary border-0">
                {foundingLeft} of 100 spots left
              </Badge>
            )}
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-4 h-4 text-gold" /> Founding Member
              </h3>
              <p className="text-sm text-muted-foreground">Locked-in price, forever</p>
            </div>
            <div className="mt-5 mb-6">
              <span className="text-4xl font-bold">${plan === "yearly" ? 16 : 19}</span>
              <span className="text-muted-foreground">/mo</span>
              {plan === "yearly" && (
                <p className="text-xs text-muted-foreground mt-1">
                  ${foundingPriceTotal} billed yearly
                </p>
              )}
            </div>
            <ul className="space-y-2.5 text-sm flex-1">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <span className="font-medium">Everything in Pro</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <span>Founding Member badge on your profile</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <span>Price locked forever — never goes up</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <span>Direct line to the founders for product input</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <span>Name listed in our credits</span>
              </li>
            </ul>
            <Button
              variant="gold"
              className="mt-6 w-full gap-2"
              disabled={loadingTier === "founding" || foundingLeft === 0 || isCurrentTier("founding")}
              onClick={() => startCheckout("founding")}
            >
              {loadingTier === "founding" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : foundingLeft === 0 ? (
                "Sold out"
              ) : isCurrentTier("founding") ? (
                "Current plan"
              ) : (
                <>
                  <Crown className="w-4 h-4" /> Claim founding spot
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Limited to first 100 members
            </p>
          </Card>
        </div>

        {/* Comparison note */}
        <div className="text-center mt-12 max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">
            Need 1:1 consulting? Members get <strong>$200 off</strong> any package and priority booking.{" "}
            <button onClick={() => navigate("/offerings")} className="underline">
              See packages →
            </button>
          </p>
        </div>
      </main>
      <Footer language="en" />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Create your account"
        description="Sign in to start your membership. Magic link or Google — no password needed."
      />
    </div>
  );
};

export default Pricing;
