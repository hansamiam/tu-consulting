/**
 * Refer — share your referral code at /refer
 *
 * Authed-only. Calls get_or_create_my_referral_code() to lazily mint a
 * code on first visit. Shows the user's code, share link, copy button,
 * and a stats panel: total signups, premium conversions, who's waiting
 * to convert.
 *
 * Stripe-side credit logic (free month for both when referee converts)
 * lives in the existing check-subscription / Stripe webhook flow —
 * this page is the user-facing surface that drives the loop.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Copy, Check, Share2, ArrowLeft, ArrowRight, Sparkles, Crown,
  Loader2, Mail, MessageCircle, Users,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const Refer = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; premium: number }>({ total: 0, premium: 0 });
  const [recent, setRecent] = useState<{ signed_up_at: string; became_premium_at: string | null }[]>([]);
  const [hubLoading, setHubLoading] = useState(true);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    document.title = "Refer a friend — TopUni";
    if (!loading && !user) setAuthOpen(true);
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setHubLoading(true);
      // RPC mints (or returns) the user's code
      const { data: codeData, error: codeErr } = await supabase.rpc("get_or_create_my_referral_code");
      if (cancelled) return;
      if (codeErr) {
        toast.error("Couldn't load your referral code.");
        setHubLoading(false);
        return;
      }
      setCode(codeData as string);

      // Stats
      const { data: codeRow } = await supabase
        .from("referral_codes")
        .select("total_uses, premium_conversions")
        .eq("user_id", user.id)
        .maybeSingle<{ total_uses: number; premium_conversions: number }>();
      if (cancelled) return;
      setStats({
        total: codeRow?.total_uses ?? 0,
        premium: codeRow?.premium_conversions ?? 0,
      });

      // Recent referrals (no PII — just timestamps)
      const { data: refs } = await supabase
        .from("referrals")
        .select("signed_up_at, became_premium_at")
        .eq("referrer_user_id", user.id)
        .order("signed_up_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      setRecent((refs as typeof recent) ?? []);
      setHubLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const shareLink = code ? `https://topuni.org/topuni-ai?ref=${code}` : "";

  const copy = async (what: "code" | "link") => {
    if (!code) return;
    const text = what === "code" ? code : shareLink;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
      toast.success(what === "code" ? "Code copied" : "Share link copied");
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const tryNativeShare = async () => {
    if (!shareLink) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Try TopUni — AI admissions strategy",
          text: "I'm using TopUni to plan scholarships and applications — here's a referral link:",
          url: shareLink,
        });
      } catch { /* user dismissed */ }
    } else {
      copy("link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-2xl font-bold">Sign in to get your referral code</h1>
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
        </div>
        <AuthDialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) navigate("/"); }} />
        <Footer language="en" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <Link
            to="/account"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to account
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            Refer a friend
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            Send a friend. Save together.
          </h1>
          <p className="text-primary-foreground/80 text-sm sm:text-base leading-relaxed max-w-xl">
            When a friend signs up via your link and becomes a paying member, you both get a free month of Premium.
            They get faster, deeper AI strategy. You extend your subscription. No limit on referrals.
          </p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-6">
        {/* Code card */}
        <Card className="p-6 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">
              Your referral code
            </p>
            {hubLoading || !code ? (
              <div className="h-10 flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating…
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <code className="font-heading text-3xl sm:text-4xl font-bold tracking-[0.18em] text-foreground bg-muted/40 border border-border rounded-lg px-4 py-2">
                  {code}
                </code>
                <Button
                  variant={copied === "code" ? "outline" : "gold"}
                  size="sm"
                  onClick={() => copy("code")}
                  className="gap-1.5"
                >
                  {copied === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "code" ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
          </div>

          {code && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">
                Or share the direct link
              </p>
              <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-lg px-3 py-2.5">
                <code className="text-xs sm:text-sm text-foreground flex-1 truncate font-mono">{shareLink}</code>
                <Button
                  variant={copied === "link" ? "outline" : "gold"}
                  size="sm"
                  onClick={() => copy("link")}
                  className="gap-1.5 shrink-0"
                >
                  {copied === "link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "link" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}

          {code && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a
                  href={`mailto:?subject=${encodeURIComponent("Try TopUni — AI admissions strategy")}&body=${encodeURIComponent(
                    "I've been using TopUni to plan my scholarship applications. The AI is genuinely useful — and if you sign up via my link we both get a free month of Premium:\n\n" + shareLink,
                  )}`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email a friend
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent("I'm using TopUni for my admissions strategy — sign up via my link and we both get a free month of Premium: " + shareLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={tryNativeShare}>
                <Share2 className="w-3.5 h-3.5" /> Share…
              </Button>
            </div>
          )}
        </Card>

        {/* Stats card */}
        <Card className="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-heading font-semibold text-lg tracking-tight">Your referrals</h2>
            <Link to="/account" className="text-xs text-muted-foreground hover:text-gold-dark transition-colors">
              View account
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">Signups</p>
              <p className="font-heading text-3xl font-bold tabular-nums tracking-tight text-foreground">{stats.total}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">Premium conversions</p>
              <p className={`font-heading text-3xl font-bold tabular-nums tracking-tight ${stats.premium > 0 ? "text-gold-dark" : "text-foreground"}`}>
                {stats.premium}
              </p>
            </div>
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              No referrals yet. Share your code and they'll appear here as friends sign up.
            </p>
          ) : (
            <div className="border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Recent</p>
              <div className="space-y-2">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="flex-1 text-muted-foreground">
                      Friend signed up {formatDistanceToNow(new Date(r.signed_up_at), { addSuffix: true })}
                    </span>
                    {r.became_premium_at ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-gold-dark font-semibold">
                        <Crown className="w-3 h-3" /> Premium
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Free</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* How it works */}
        <Card className="p-6">
          <h2 className="font-heading font-semibold text-lg tracking-tight mb-4">How it works</h2>
          <ol className="space-y-3 text-sm">
            {[
              "Share your code or link. WhatsApp / email / wherever your friends already are.",
              "Your friend signs up at TopUni. They get the same product you have — AI strategy, scholarship database, application tracker.",
              "When your friend upgrades to Premium, you both get a free month added to your subscription.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="h-5 w-5 shrink-0 rounded-full bg-gold/15 text-gold-dark text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-foreground/90 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-muted-foreground mt-5 leading-relaxed">
            Credit is applied the next billing cycle. We email both parties when the bonus posts.
            No referral cap. Self-referrals don't count.
          </p>
        </Card>

        {/* Closing CTA */}
        <div className="text-center pt-2">
          <Button variant="ghost" asChild className="gap-1.5">
            <Link to="/topuni-ai">
              Open TopUni AI <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </main>
      <Footer language="en" />
    </div>
  );
};

export default Refer;
