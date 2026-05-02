// Account — the hub authed users land on. Surfaces tracker stats,
// documents, brief status, nudge controls + the existing subscription
// info. Was: subscription card only. Now: a real "your TopUni" page.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Crown, Sparkles, ExternalLink, Loader2, LogOut, Calendar,
  Inbox, FileText, Bot, Bell, BellOff, ArrowRight, Search, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const Account = () => {
  const { user, loading, subscription, signOut, refreshSubscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  /* Account-hub data */
  const [trackerStats, setTrackerStats] = useState<{ tracked: number; urgent: number; pending: number; nextRow?: TrackerLite } | null>(null);
  const [docs, setDocs] = useState<{ count: number; ready: number; recent: DocLite[] }>({ count: 0, ready: 0, recent: [] });
  const [brief, setBrief] = useState<{ generated_at: string; report_grade: string } | null>(null);
  const [profileMeta, setProfileMeta] = useState<{ nudge_opt_out: boolean; last_nudge_sent_at: string | null }>({ nudge_opt_out: false, last_nudge_sent_at: null });
  const [hubLoading, setHubLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) setAuthOpen(true);
  }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const justSubscribed = params.get("subscribed") === "1";
    const action = params.get("action");
    (async () => {
      if (action === "pause-nudges") {
        const { error } = await supabase
          .from("student_profiles")
          .update({ nudge_opt_out: true })
          .eq("user_id", user.id);
        if (error) {
          toast.error("Couldn't update nudge preference. Try again.");
        } else {
          toast.success("Weekly nudges paused. You can re-enable any time below.");
        }
        window.history.replaceState({}, "", "/account");
      }
      if (justSubscribed) {
        for (let i = 0; i < 3; i++) {
          try {
            await supabase.functions.invoke("check-subscription");
            await refreshSubscription();
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
        toast.success("Welcome aboard! Your Founding Membership is active.");
        window.history.replaceState({}, "", "/account");
      } else {
        refreshSubscription();
      }
    })();
  }, [user, refreshSubscription]);

  /* Hub data load — runs once user is settled */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setHubLoading(true);
      const [trackerRes, docsRes, briefRes, profileRes] = await Promise.all([
        loadTrackerStats(user.id),
        loadDocStats(user.id),
        loadBrief(user.id),
        loadProfileMeta(user.id),
      ]);
      if (cancelled) return;
      setTrackerStats(trackerRes);
      setDocs(docsRes);
      setBrief(briefRes);
      setProfileMeta(profileRes);
      setHubLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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

  const toggleNudge = async (next: boolean) => {
    if (!user) return;
    setProfileMeta((p) => ({ ...p, nudge_opt_out: !next }));
    const { error } = await supabase
      .from("student_profiles")
      .update({ nudge_opt_out: !next })
      .eq("user_id", user.id);
    if (error) {
      setProfileMeta((p) => ({ ...p, nudge_opt_out: !p.nudge_opt_out })); // rollback
      toast.error("Couldn't update nudge preference.");
    } else {
      toast.success(next ? "Weekly nudges resumed." : "Weekly nudges paused.");
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
          <h1 className="text-2xl font-bold">Sign in to view your account</h1>
          <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
        </div>
        <AuthDialog open={authOpen} onOpenChange={(o) => { setAuthOpen(o); if (!o) navigate("/"); }} />
        <Footer language="en" />
      </>
    );
  }

  const tier = subscription.tier;
  const tierLabel = tier === "founding" ? "Founding Member" : tier === "pro" ? "Pro" : "Free";
  const tierColor = tier === "founding"
    ? "bg-gold/15 text-gold-dark border-gold/30"
    : tier === "pro" ? "bg-primary/10 text-primary border-primary/20"
    : "bg-muted text-muted-foreground";

  const firstName = (user.email || "").split("@")[0];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        {/* Welcome ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-2">
            Your TopUni
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
        </div>

        {/* Stats row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Inbox className="w-4 h-4" />}
            label="Tracking"
            value={hubLoading ? "—" : (trackerStats?.tracked ?? 0).toString()}
            sub={trackerStats && trackerStats.urgent > 0 ? `${trackerStats.urgent} urgent` : undefined}
            subTone={trackerStats && trackerStats.urgent > 0 ? "warn" : "neutral"}
            href="/pipeline"
          />
          <StatCard
            icon={<FileText className="w-4 h-4" />}
            label="Documents"
            value={hubLoading ? "—" : docs.count.toString()}
            sub={docs.ready > 0 ? `${docs.ready} ready` : undefined}
            href="/topuni-ai"
          />
          <StatCard
            icon={<Sparkles className="w-4 h-4" />}
            label="Brief"
            value={
              hubLoading ? "—"
              : brief
                ? brief.report_grade === "premium" ? "Premium" : "Basic"
                : "Not yet"
            }
            sub={
              brief
                ? `Updated ${formatDistanceToNow(new Date(brief.generated_at))} ago`
                : "Generate yours"
            }
            href="/topuni-ai"
          />
          <StatCard
            icon={<Bot className="w-4 h-4" />}
            label="Counselor"
            value={tier !== "free" ? "Premium" : "Free"}
            sub={tier !== "free" ? "case-aware" : undefined}
            href="/topuni-ai"
          />
        </div>

        {/* Pipeline preview ─────────────────────────────────────── */}
        {trackerStats && trackerStats.tracked > 0 && trackerStats.nextRow && (
          <Card className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-heading font-semibold tracking-tight">Coming up</h2>
              <Link to="/pipeline" className="text-xs text-muted-foreground hover:text-gold-dark transition-colors inline-flex items-center gap-1">
                Open pipeline <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <PipelinePreviewRow row={trackerStats.nextRow} />
            {trackerStats.tracked > 1 && (
              <p className="text-[11px] text-muted-foreground mt-3">
                + {trackerStats.tracked - 1} more in your pipeline
              </p>
            )}
          </Card>
        )}

        {/* Recent documents ─────────────────────────────────────── */}
        {docs.recent.length > 0 && (
          <Card className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-heading font-semibold tracking-tight">Recent documents</h2>
              <Link to="/topuni-ai" className="text-xs text-muted-foreground hover:text-gold-dark transition-colors inline-flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {docs.recent.map((d) => (
                <div key={d.document_id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{d.title || d.filename}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground shrink-0">{d.kind}</span>
                  <span className={`text-[10px] font-medium shrink-0 ${
                    d.parse_status === "ready" ? "text-emerald-600"
                    : d.parse_status === "failed" ? "text-destructive"
                    : "text-amber-600 dark:text-amber-500"
                  }`}>
                    {d.parse_status === "ready" ? "ready" : d.parse_status === "failed" ? "failed" : "reading"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Membership ───────────────────────────────────────────── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold tracking-tight">Membership</h2>
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
                {subscription.earned_trial_expires_at && format(new Date(subscription.earned_trial_expires_at), "PPP")}
                . Upgrade anytime to keep the access.
              </p>
              <Button size="sm" className="mt-3" onClick={() => navigate("/pricing")}>See plans</Button>
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

        {/* Notifications ────────────────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {profileMeta.nudge_opt_out ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-gold-dark" />}
                <h2 className="font-heading font-semibold tracking-tight">Weekly nudges</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sundays at 10 UTC, your AI coach reads your tracker state and writes a tight 3-things-this-week
                check-in. Cite-the-actual-scholarship-by-name personal, not generic.
              </p>
              {profileMeta.last_nudge_sent_at && !profileMeta.nudge_opt_out && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Last sent {formatDistanceToNow(new Date(profileMeta.last_nudge_sent_at))} ago
                </p>
              )}
            </div>
            <Switch
              checked={!profileMeta.nudge_opt_out}
              onCheckedChange={toggleNudge}
            />
          </div>
        </Card>

        {/* Quick links ──────────────────────────────────────────── */}
        <Card className="p-5">
          <h2 className="font-heading font-semibold tracking-tight mb-3">Jump to</h2>
          <div className="grid sm:grid-cols-2 gap-1.5 text-sm">
            <QuickLink to="/topuni-ai"          icon={<Bot className="w-3.5 h-3.5" />}      label="AI counselor + brief" />
            <QuickLink to="/discover"           icon={<Search className="w-3.5 h-3.5" />}   label="Discover scholarships" />
            <QuickLink to="/pipeline"           icon={<Inbox className="w-3.5 h-3.5" />}    label="Application pipeline" />
            <QuickLink to="/essay"              icon={<FileText className="w-3.5 h-3.5" />} label="Essay critique" />
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

/* ─── Internals ─────────────────────────────────────────────────── */

interface TrackerLite {
  scholarship_id: string;
  status: string | null;
  scholarship: { scholarship_name: string; host_country: string | null; application_deadline: string | null } | null;
}
interface DocLite {
  document_id: string;
  filename: string;
  title: string | null;
  kind: string;
  parse_status: string;
}

async function loadTrackerStats(userId: string) {
  const { data: tracker } = await supabase
    .from("application_tracker")
    .select(`
      scholarship_id, status, hidden, shortlisted,
      scholarship:scholarship_id ( scholarship_name, host_country, application_deadline )
    `)
    .eq("user_id", userId)
    .returns<(TrackerLite & { hidden: boolean; shortlisted: boolean })[]>();

  const now = Date.now();
  const visible = (tracker ?? []).filter((t) => !t.hidden && (t.status || t.shortlisted));
  const urgent = visible.filter((t) => {
    const dl = t.scholarship?.application_deadline;
    if (!dl) return false;
    const days = Math.ceil((new Date(dl).getTime() - now) / 86400_000);
    return days > 0 && days <= 30;
  }).length;
  const pending = visible.filter((t) => !t.status).length;
  // Closest deadline first
  const sorted = [...visible].sort((a, b) => {
    const ad = a.scholarship?.application_deadline ? new Date(a.scholarship.application_deadline).getTime() : Infinity;
    const bd = b.scholarship?.application_deadline ? new Date(b.scholarship.application_deadline).getTime() : Infinity;
    return ad - bd;
  });
  const nextRow = sorted[0];
  return { tracked: visible.length, urgent, pending, nextRow };
}

async function loadDocStats(userId: string) {
  const { data } = await supabase
    .from("student_documents")
    .select("document_id, filename, title, kind, parse_status, uploaded_at")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });
  const all = (data as (DocLite & { uploaded_at: string })[]) ?? [];
  return {
    count: all.length,
    ready: all.filter((d) => d.parse_status === "ready").length,
    recent: all.slice(0, 3),
  };
}

async function loadBrief(userId: string) {
  const { data } = await supabase
    .from("pathway_reports")
    .select("generated_at, report_grade")
    .eq("user_id", userId)
    .maybeSingle<{ generated_at: string; report_grade: string }>();
  return data;
}

async function loadProfileMeta(userId: string) {
  const { data } = await supabase
    .from("student_profiles")
    .select("nudge_opt_out, last_nudge_sent_at")
    .eq("user_id", userId)
    .maybeSingle<{ nudge_opt_out: boolean; last_nudge_sent_at: string | null }>();
  return data ?? { nudge_opt_out: false, last_nudge_sent_at: null };
}

const StatCard = ({ icon, label, value, sub, subTone = "neutral", href }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; subTone?: "neutral" | "warn"; href?: string;
}) => {
  const subClass =
    subTone === "warn" ? "text-amber-700 dark:text-amber-500"
    : "text-muted-foreground/80";
  const card = (
    <Card className="p-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">{label}</span>
      </div>
      <p className="font-heading font-bold text-xl tabular-nums tracking-tight leading-none text-foreground">{value}</p>
      {sub && <p className={`text-[11px] mt-1 ${subClass}`}>{sub}</p>}
    </Card>
  );
  if (href) return <Link to={href} className="contents">{card}</Link>;
  return card;
};

const PipelinePreviewRow = ({ row }: { row: TrackerLite }) => {
  const dl = row.scholarship?.application_deadline;
  const days = dl ? Math.ceil((new Date(dl).getTime() - Date.now()) / 86400_000) : null;
  const daysClass =
    days === null ? "text-muted-foreground"
    : days <= 7 ? "text-destructive"
    : days <= 30 ? "text-amber-600 dark:text-amber-500"
    : "text-muted-foreground";
  const daysText =
    days === null ? "Rolling / varies"
    : days <= 0 ? "Closed"
    : days === 1 ? "1 day"
    : days <= 30 ? `${days} days`
    : `${Math.round(days / 30)} months`;
  return (
    <Link to="/pipeline" className="flex items-center gap-3 hover:bg-muted/30 transition-colors -m-2 p-2 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold mb-0.5">
          {row.scholarship?.host_country ?? "—"}
        </p>
        <p className="font-medium text-foreground truncate">{row.scholarship?.scholarship_name}</p>
        {row.status && (
          <p className="text-[11px] text-muted-foreground mt-0.5">Status: {row.status}</p>
        )}
      </div>
      <span className={`text-xs font-semibold tabular-nums shrink-0 ${daysClass}`}>{daysText}</span>
    </Link>
  );
};

const QuickLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to} className="flex items-center gap-2 px-2.5 py-2 rounded-md text-foreground hover:bg-muted/40 transition-colors">
    <span className="text-gold-dark">{icon}</span>
    <span className="flex-1">{label}</span>
    <ArrowRight className="w-3 h-3 text-muted-foreground" />
  </Link>
);
