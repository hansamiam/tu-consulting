// Account page — shows subscription status + manage button
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Sparkles, ExternalLink, Loader2, LogOut, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Account = () => {
  const { user, loading, subscription, signOut, refreshSubscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) setAuthOpen(true);
  }, [loading, user]);

  useEffect(() => {
    if (user) refreshSubscription();
  }, [user, refreshSubscription]);

  const openPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setPortalLoading(false);
    if (error || !data?.url) {
      toast.error("Couldn't open billing portal. Try again.");
      return;
    }
    window.open(data.url, "_blank");
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
          <h1 className="text-2xl font-bold">Sign in to view your account</h1>
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
        </div>
        <AuthDialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) navigate("/"); }} />
        <Footer language="en" />
      </>
    );
  }

  const tier = subscription.tier;
  const tierLabel =
    tier === "founding" ? "Founding Member" : tier === "pro" ? "Pro" : "Free";
  const tierColor =
    tier === "founding" ? "bg-gold/15 text-gold border-gold/30"
    : tier === "pro" ? "bg-primary/10 text-primary border-primary/20"
    : "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Your Account</h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>

        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Membership</h2>
                <Badge variant="outline" className={tierColor}>
                  {tier === "founding" && <Crown className="w-3 h-3 mr-1" />}
                  {tier === "pro" && <Sparkles className="w-3 h-3 mr-1" />}
                  {tierLabel}
                </Badge>
              </div>
              {subscription.is_founding_member && subscription.founding_member_number && (
                <p className="text-sm text-muted-foreground mt-1">
                  Founding Member #{subscription.founding_member_number} of 100
                </p>
              )}
            </div>
            {tier === "free" && !subscription.earned_trial_active && (
              <Button onClick={() => navigate("/pricing")} className="gap-2">
                <Sparkles className="w-4 h-4" /> Upgrade
              </Button>
            )}
          </div>

          {subscription.earned_trial_active && tier === "free" && (
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
              <p className="font-medium text-sm">🎁 Earned trial active</p>
              <p className="text-sm text-muted-foreground mt-1">
                You've unlocked Pro until{" "}
                {subscription.earned_trial_expires_at &&
                  format(new Date(subscription.earned_trial_expires_at), "PPP")}
                . Upgrade anytime to keep the access.
              </p>
              <Button size="sm" className="mt-3" onClick={() => navigate("/pricing")}>
                See plans
              </Button>
            </div>
          )}

          {subscription.current_period_end && tier !== "free" && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {subscription.cancel_at_period_end ? "Ends" : "Renews"} on{" "}
              {format(new Date(subscription.current_period_end), "PPP")}
              {subscription.billing_interval && ` (${subscription.billing_interval}ly)`}
            </div>
          )}

          {tier !== "free" && (
            <Button variant="outline" onClick={openPortal} disabled={portalLoading} className="gap-2">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Manage billing
            </Button>
          )}
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="text-lg font-semibold">Quick links</h2>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <Button variant="ghost" className="justify-start" onClick={() => navigate("/discover")}>Discover universities</Button>
            <Button variant="ghost" className="justify-start" onClick={() => navigate("/academy")}>Open Academy</Button>
            <Button variant="ghost" className="justify-start" onClick={() => navigate("/prep/dashboard")}>Open Prep</Button>
            <Button variant="ghost" className="justify-start" onClick={() => navigate("/topuni-ai")}>TopUni AI</Button>
          </div>
        </Card>

        <Button variant="ghost" onClick={() => signOut().then(() => navigate("/"))} className="gap-2 text-muted-foreground">
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </main>
      <Footer language="en" />
    </div>
  );
};

export default Account;
