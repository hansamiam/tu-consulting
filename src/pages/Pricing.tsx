// Pricing — Hormozi-style stacked-value offer page.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, Crown, Loader2, Sparkles, Shield,
  ArrowRight, Lock, Zap, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* Each line in the value stack carries an explicit retail value so
   the math at the bottom of the card lands. */
const VALUE_STACK = [
  {
    title: "Personalized strategy report (TopUni AI)",
    body: "Tailored shortlist, funding pathway, 90-day action plan. Downloadable PDF you can share with parents and counselors.",
    value: "$99",
  },
  {
    title: "Full Discover database with strategy notes",
    body: "Every ranked scholarship match with how-to-win strategy notes, ideal-candidate profiles, and common rejection patterns.",
    value: "$199",
  },
  {
    title: "Live monthly workshops with our founders",
    body: "Yale · Schwarzman / Cambridge · Harvard. Essay clinics, scholarship strategy, country deep-dives. They've done it. Now they coach you.",
    value: "$200/mo",
  },
  {
    title: "Recordings library — every workshop forever",
    body: "Miss one? Catch up on your schedule. The library compounds every month.",
    value: "$99",
  },
  {
    title: "Direct line to the founders",
    body: "Submit questions, get product input rights, vote on workshop topics. Your influence shapes the platform.",
    value: "Priceless",
  },
];

const VALUE_TOTAL_LABEL = "$597+/mo";

const COMPARISON = [
  { row: "Personalized strategy report",                 us: "Included",                     consultant: "$500–$2,000",                  diy: "Hours of research, no real plan" },
  { row: "Verified scholarship database",                us: "Full access, ranked",          consultant: "Sometimes",                    diy: "Scattered across Google and ChatGPT (with high possibility of outdated or incorrect information)" },
  { row: "Live workshops with admitted founders",        us: "Monthly, included",            consultant: "Per session, $300+",           diy: "—" },
  { row: "Recorded library (compounds every month)",     us: "Included forever",             consultant: "—",                            diy: "—" },
  { row: "Strategy notes (how-to-win, rejection patterns)", us: "Included",                  consultant: "Maybe",                        diy: "Guesswork" },
  { row: "Total cost (one application year)",            us: "$228",                         consultant: "$5,000 – $15,000",             diy: "Hidden cost: missed deadlines" },
];

const FAQ = [
  {
    q: "Why is it $19/mo when other consultants charge thousands?",
    a: "We're early. The founding price is intentionally low to onboard our first 100 members and turn them into our case studies. Public price after the cohort fills will be $39/mo. Founding members lock in $19/mo for life — that locked rate alone is worth more than the first year of membership.",
  },
  {
    q: "What if I'm not applying yet — I'm in 9th or 10th grade?",
    a: "That's actually the highest-leverage time to start. Strategy now means stronger essays, better course choices, and more scholarship-ready credentials by senior year. The 90-day action plan in your strategy report adapts to your grade level.",
  },
  {
    q: "What if I'm already working with a private consultant?",
    a: "Founding Pro complements outside advisors. Most consultants charge per session — bring your TopUni strategy doc into those sessions and you'll spend their hourly rate on actual writing instead of background research.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel any time from your account. We don't lock you in. The 30-day money-back guarantee covers your first month — full refund, no questions asked. After that, you stop billing whenever you want.",
  },
  {
    q: "Is the founding price really locked for life?",
    a: "Yes. As long as your subscription stays active, $19/mo is your price for as long as we run the platform. Even when public price moves to $39, $59, or $99/mo, you stay at $19.",
  },
  {
    q: "What if I get into my dream school in month 2 — do I just cancel?",
    a: "You can. But most members keep the subscription through senior year because the workshops keep going (gap year planning, freshman prep, scholarship renewals) and the recordings library keeps compounding. Up to you.",
  },
];

const Pricing = () => {
  const { user, subscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundingLeft, setFoundingLeft] = useState<number | null>(null);
  const [foundingCap, setFoundingCap] = useState<number>(100);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("founding_member_counter")
      .select("claimed_count, cap")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFoundingLeft(Math.max(0, data.cap - data.claimed_count));
          setFoundingCap(data.cap);
        }
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
      toast.error((data && (data as { error?: string }).error) || "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

  const isFounding = subscription.tier === "founding";
  const claimed = foundingLeft != null ? foundingCap - foundingLeft : 0;
  const claimedPct = foundingLeft != null ? Math.round((claimed / foundingCap) * 100) : 0;

  const ctaLabel = loading ? <Loader2 className="w-4 h-4 animate-spin" />
    : isFounding ? <><Crown className="w-4 h-4" /> You're a Founding Member</>
    : foundingLeft === 0 ? "Sold out — join waitlist"
    : <><Sparkles className="w-4 h-4" /> Claim my founding spot</>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main>

        {/* ─── HERO ─────────────────────────────────────────────── */}
        <section className="relative py-20 sm:py-24 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-72 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(180deg, hsl(var(--primary) / 0.10) 0%, transparent 100%)" }} />
          <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center relative">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="mb-5 bg-gold/15 text-gold-dark border-gold/35 px-3 py-1">
                <Crown className="w-3 h-3 mr-1.5" /> Founding membership · capped at {foundingCap}
              </Badge>
              <h1 className="font-heading text-[clamp(2.25rem,5.5vw,4rem)] font-bold tracking-[-0.025em] leading-[1.05]">
                Apply to top universities with the team that
                <span className="text-gold-dark"> already got in.</span>
              </h1>
              <p className="text-foreground/65 text-lg sm:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">
                Yale, Schwarzman/Cambridge, and Harvard alumni teach you the exact strategy that works — every month, live, with the recordings yours forever.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ─── VALUE STACK CARD ──────────────────────────────────── */}
        <section className="px-5 sm:px-8 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative bg-card border-2 border-gold/40 rounded-3xl p-7 sm:p-10 shadow-xl">
              {/* Spots-left ribbon */}
              {foundingLeft != null && foundingLeft > 0 && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-primary text-xs font-bold tracking-wide uppercase px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Only {foundingLeft} of {foundingCap} spots left
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between gap-4 mb-7">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1.5">Founding Pro</p>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Everything, locked for life.</h2>
                </div>
                <Crown className="w-8 h-8 text-gold-dark shrink-0 hidden sm:block" />
              </div>

              {/* Itemized value stack */}
              <div className="space-y-3 mb-7">
                {VALUE_STACK.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="grid grid-cols-[auto,1fr,auto] gap-3 sm:gap-4 items-start py-3 border-b border-border/60 last:border-0"
                  >
                    <Check className="w-4 h-4 mt-1 text-gold-dark shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm sm:text-base leading-snug">{item.title}</p>
                      <p className="text-muted-foreground text-xs sm:text-[13px] leading-relaxed mt-0.5">{item.body}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap pt-1">value <strong className="text-foreground/80">{item.value}</strong></span>
                  </motion.div>
                ))}
              </div>

              {/* The math */}
              <div className="bg-gold/5 border border-gold/20 rounded-2xl px-5 py-4 mb-6">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">Total value if bought separately</span>
                  <span className="font-bold tabular-nums line-through text-muted-foreground">{VALUE_TOTAL_LABEL}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark mb-1">Your founding price</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">$19</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <p className="text-xs text-gold-dark font-semibold tabular-nums">
                    You save 96%
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Public price after the founding cohort fills: <span className="line-through">$39/mo</span>. Yours stays at $19/mo for as long as you remain a member.
                </p>
              </div>

              {/* Capacity bar */}
              {foundingLeft != null && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-muted-foreground tabular-nums">{claimed} / {foundingCap} claimed</span>
                    <span className="text-gold-dark font-semibold tabular-nums">{foundingLeft} left</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all" style={{ width: `${claimedPct}%` }} />
                  </div>
                </div>
              )}

              <Button
                variant="gold"
                size="lg"
                className="w-full gap-2 text-base h-12 shadow-md"
                disabled={loading || foundingLeft === 0 || isFounding}
                onClick={startCheckout}
              >
                {ctaLabel}
                {!isFounding && foundingLeft !== 0 && !loading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>

              {/* Risk reversal */}
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-success" />
                <span><strong className="text-foreground">30-day money-back guarantee.</strong> Full refund, no questions asked. Cancel anytime after.</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 text-center mt-1.5">
                Stripe secure checkout · billed monthly · price locked for life
              </p>
            </div>
          </motion.div>
        </section>

        {/* ─── COMPARISON TABLE ──────────────────────────────────── */}
        <section className="px-5 sm:px-8 py-16 bg-canvas-soft border-y border-border">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark text-center mb-3">The math</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3 leading-tight">
              The same outcome — at <span className="text-gold-dark">a fraction</span> of the cost.
            </h2>
            <p className="text-center text-muted-foreground text-base mb-10 max-w-2xl mx-auto">
              How Founding Pro stacks up against your other options.
            </p>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1.4fr,1fr,1fr,1fr] text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground border-b border-border bg-muted/30">
                <div className="px-3 sm:px-5 py-3"></div>
                <div className="px-2 sm:px-5 py-3 text-center bg-gold/8 text-gold-dark">Founding Pro</div>
                <div className="px-2 sm:px-5 py-3 text-center">Private consultant</div>
                <div className="px-2 sm:px-5 py-3 text-center">DIY</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={i} className="grid grid-cols-[1.4fr,1fr,1fr,1fr] items-center text-xs sm:text-sm border-b border-border/60 last:border-0">
                  <div className="px-3 sm:px-5 py-3 sm:py-4 text-foreground font-medium">{row.row}</div>
                  <div className="px-2 sm:px-5 py-3 sm:py-4 text-center bg-gold/[0.04] text-foreground font-semibold">{row.us}</div>
                  <div className="px-2 sm:px-5 py-3 sm:py-4 text-center text-muted-foreground">{row.consultant}</div>
                  <div className="px-2 sm:px-5 py-3 sm:py-4 text-center text-muted-foreground">{row.diy}</div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="gold" size="lg" className="gap-2 px-8" onClick={startCheckout} disabled={loading || foundingLeft === 0 || isFounding}>
                {ctaLabel}
              </Button>
            </div>
          </motion.div>
        </section>

        {/* ─── SOCIAL PROOF — placeholder (mark as such) ─────────── */}
        <section className="px-5 sm:px-8 py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark text-center mb-3">From students who joined early</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-center mb-10 leading-tight">
              What founding members are saying.
            </h2>
            {/* TODO: REPLACE WITH REAL TESTIMONIALS BEFORE PUBLIC LAUNCH */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { quote: "Walked into my Yale interview with a real plan instead of nervous energy. The strategy report was the deliverable I needed.", name: "M.", school: "Yale '28 (placeholder)" },
                { quote: "Saved me 6 weeks of research. I had my matched scholarships and a 90-day timeline in 48 hours.", name: "A.", school: "Cambridge '28 (placeholder)" },
                { quote: "The workshops alone are worth more than $19/mo. The founders actually answered my essay questions live.", name: "D.", school: "MIT '28 (placeholder)" },
              ].map((t, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:border-gold/30 transition-colors">
                  <div className="text-gold-dark mb-3">★★★★★</div>
                  <p className="text-foreground/85 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                  <p className="text-xs font-semibold text-foreground">{t.name} · <span className="text-muted-foreground font-normal">{t.school}</span></p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ─── FAQ ──────────────────────────────────────────────── */}
        <section className="px-5 sm:px-8 py-16 bg-canvas-soft border-y border-border">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark text-center mb-3">Honest answers</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-center mb-10 leading-tight">
              Common questions before you join.
            </h2>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {FAQ.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="border-b border-border/60 last:border-0">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full text-left px-5 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-heading font-semibold text-foreground text-[15px] leading-snug">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-5 sm:px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                        {item.a}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* ─── FINAL CTA ────────────────────────────────────────── */}
        <section className="px-5 sm:px-8 py-20 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.05) 60%, hsl(var(--primary) / 0.20) 100%)" }} />
          <div className="max-w-2xl mx-auto text-center relative">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Lock className="w-7 h-7 text-gold-dark mx-auto mb-5" />
              <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
                When the {foundingCap} founding spots fill, the price <span className="text-gold-dark">doubles.</span>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-9 max-w-xl mx-auto leading-relaxed">
                {foundingLeft != null ? (
                  <><span className="text-foreground font-semibold tabular-nums">{foundingLeft}</span> spots left at $19/mo. Lock in the founding price for life — even after we move to $39/mo.</>
                ) : (
                  <>Lock in the founding price for life — even after we move to $39/mo.</>
                )}
              </p>
              <Button
                variant="gold"
                size="lg"
                className="gap-2 text-base h-12 px-10 shadow-md"
                disabled={loading || foundingLeft === 0 || isFounding}
                onClick={startCheckout}
              >
                {ctaLabel}
                {!isFounding && foundingLeft !== 0 && !loading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                <Shield className="w-3 h-3 inline mr-1 text-success" /> 30-day money-back guarantee · Cancel anytime
              </p>
              <p className="text-xs text-muted-foreground mt-6">
                Not ready? <strong className="text-foreground">Free</strong> still gets you the TopUni AI report and your top 3 scholarship matches.
                {" · "}
                Need 1:1 help? <button onClick={() => navigate("/offerings")} className="underline text-foreground hover:text-gold-dark">See consulting →</button>
              </p>
            </motion.div>
          </div>
        </section>

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
