import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ZapOff, Users, MousePointerClick, Lock, ArrowDown, RefreshCw } from "lucide-react";

/* /admin/analytics — funnel metrics from public.analytics_events.
 *
 * Reads the analytics_events_funnel_v aggregation view (rolling 30-day,
 * pre-grouped by event × day). Renders:
 *   · Headline counts for the canonical funnel events
 *   · Gate conversion rate (gate_seen → gate_upgrade_clicked)
 *   · Brief funnel (started → completed → viewed_full)
 *   · Per-day mini-bar of total events
 *
 * Anything else admin-y for analytics belongs here. Keep the existing
 * /admin/funnel for the booking/payment flow — different fact table,
 * different ownership.
 */

interface Bucket {
  event_name: string;
  day: string;
  event_count: number;
  unique_users: number | null;
  unique_anons: number | null;
}

const FUNNEL_EVENTS = [
  "brief_generation_started",
  "brief_generation_completed",
  "brief_viewed_full",
  "gate_seen",
  "gate_upgrade_clicked",
  "signup_started",
  "payment_completed",
] as const;

export default function AdminAnalyticsFunnel() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Bucket[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data: role } = await supabase.from("user_roles")
        .select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!role);
      if (role) await fetchAll();
      setLoading(false);
    })();
  }, []);

  const fetchAll = async () => {
    const { data } = await supabase
      .from("analytics_events_funnel_v" as never)
      .select("event_name, day, event_count, unique_users, unique_anons")
      .order("day", { ascending: false });
    if (data) setRows(data as Bucket[]);
  };

  const totals = useMemo(() => {
    const m: Record<string, { events: number; users: number; anons: number }> = {};
    for (const r of rows) {
      const k = r.event_name;
      if (!m[k]) m[k] = { events: 0, users: 0, anons: 0 };
      m[k].events += r.event_count;
      m[k].users += r.unique_users ?? 0;
      m[k].anons += r.unique_anons ?? 0;
    }
    return m;
  }, [rows]);

  const conversionRate = (numerator?: number, denominator?: number) => {
    if (!denominator || denominator === 0) return null;
    return Math.round(((numerator ?? 0) / denominator) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-md mx-auto px-5 pt-32 text-center">
          <ZapOff className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Admin only</h1>
          <Button variant="outline" onClick={() => nav("/")}>Back to home</Button>
        </div>
      </div>
    );
  }

  // Funnel arithmetic — relative drop-off at each step.
  const briefStarted = totals.brief_generation_started?.events ?? 0;
  const briefCompleted = totals.brief_generation_completed?.events ?? 0;
  const briefViewed = totals.brief_viewed_full?.events ?? 0;
  const gateSeen = totals.gate_seen?.events ?? 0;
  const gateClicked = totals.gate_upgrade_clicked?.events ?? 0;
  const proCompareOpened = totals.pro_comparison_opened?.events ?? 0;
  const proCompareUpgrade = totals.pro_comparison_upgrade_clicked?.events ?? 0;
  const signupStarted = totals.signup_started?.events ?? 0;
  const paymentDone = totals.payment_completed?.events ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-20">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">Admin · Analytics</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Funnel · last 30 days</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Top-of-funnel + headline counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Tile label="Briefs started" value={briefStarted} icon={<Users className="h-4 w-4" />} />
          <Tile label="Briefs completed" value={briefCompleted}
                sub={conversionRate(briefCompleted, briefStarted) !== null ? `${conversionRate(briefCompleted, briefStarted)}% completion` : undefined}
                icon={<ArrowDown className="h-4 w-4" />} />
          <Tile label="Gates seen" value={gateSeen} icon={<Lock className="h-4 w-4" />} />
          <Tile label="Gate upgrade clicks" value={gateClicked}
                sub={conversionRate(gateClicked, gateSeen) !== null ? `${conversionRate(gateClicked, gateSeen)}% gate CTR` : undefined}
                icon={<MousePointerClick className="h-4 w-4" />} />
        </div>

        {/* Conversion funnel as a clean text-and-numbers block */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="font-heading font-bold text-lg mb-4">Conversion funnel</h2>
            <div className="space-y-3">
              <FunnelRow label="Brief started" count={briefStarted} pct={100} />
              <FunnelRow label="Brief streamed back" count={briefCompleted} pct={conversionRate(briefCompleted, briefStarted) ?? 0} />
              <FunnelRow label="Brief viewed past 50%" count={briefViewed} pct={conversionRate(briefViewed, briefStarted) ?? 0} />
              <FunnelRow label="Gate seen" count={gateSeen} pct={conversionRate(gateSeen, briefStarted) ?? 0} />
              <FunnelRow label="Upgrade clicked (gate)" count={gateClicked} pct={conversionRate(gateClicked, briefStarted) ?? 0} />
              <FunnelRow label="Pro comparison opened" count={proCompareOpened} pct={conversionRate(proCompareOpened, briefStarted) ?? 0} />
              <FunnelRow label="Upgrade clicked (modal)" count={proCompareUpgrade} pct={conversionRate(proCompareUpgrade, briefStarted) ?? 0} />
              <FunnelRow label="Signup started" count={signupStarted} pct={conversionRate(signupStarted, briefStarted) ?? 0} />
              <FunnelRow label="Payment completed" count={paymentDone} pct={conversionRate(paymentDone, briefStarted) ?? 0} highlight />
            </div>
            <p className="text-[11px] text-muted-foreground mt-5 leading-relaxed">
              Percentages are relative to brief-started in the same window. Counts include both authed users and anon visitors with a per-browser id. View powers off the rolling 30-day aggregate; refresh re-pulls.
            </p>
          </CardContent>
        </Card>

        {/* Raw event counts for everything else */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading font-bold text-lg mb-3">Every event, last 30 days</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground py-2 pr-4">Event</th>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground py-2 pr-4">Total</th>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground py-2 pr-4">Authed users</th>
                    <th className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground py-2">Anon visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals).sort((a, b) => b[1].events - a[1].events).map(([name, t]) => (
                    <tr key={name} className="border-b border-border/30">
                      <td className="py-2 pr-4 font-mono text-[12px]">{name}</td>
                      <td className="py-2 pr-4 text-right font-semibold tabular-nums">{t.events.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground tabular-nums">{t.users.toLocaleString()}</td>
                      <td className="py-2 text-right text-muted-foreground tabular-nums">{t.anons.toLocaleString()}</td>
                    </tr>
                  ))}
                  {Object.keys(totals).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                        No events recorded yet. Once users start interacting the funnel populates automatically.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

const Tile = ({ label, value, sub, icon }: { label: string; value: number; sub?: string; icon: React.ReactNode }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{label}</p>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <p className="font-heading font-bold text-2xl tabular-nums tracking-tight leading-none text-foreground">
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground/80 mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const FunnelRow = ({ label, count, pct, highlight }: { label: string; count: number; pct: number; highlight?: boolean }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-1">
      <span className={`text-[13px] ${highlight ? "font-semibold text-gold-dark" : "text-foreground/85"}`}>{label}</span>
      <span className="text-[12px] tabular-nums text-muted-foreground">
        <span className={`font-semibold ${highlight ? "text-gold-dark" : "text-foreground"}`}>{count.toLocaleString()}</span>
        {" · "}
        {pct}%
      </span>
    </div>
    <div className="h-1 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full transition-[width] duration-500 ${highlight ? "bg-gold-dark" : "bg-foreground/40"}`}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  </div>
);
