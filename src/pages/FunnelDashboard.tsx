import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Users, MousePointerClick, ArrowDown, AlertCircle, RefreshCw, Receipt, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface InteractionRow {
  id: string;
  event_type: string;
  event_data: any;
  session_id: string | null;
  device_type: string | null;
  created_at: string;
}

const FUNNEL_STEPS: Array<{ key: string; label: string }> = [
  { key: "dialog_opened", label: "Opened Payment" },
  { key: "promo_applied", label: "Applied Promo" },
  { key: "receipt_uploaded", label: "Uploaded Receipt" },
  { key: "terms_accepted", label: "Accepted Terms" },
  { key: "proceeded", label: "Booked Call" },
];

const FunnelDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [days, setDays] = useState("7");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAuthChecking(false);
        return;
      }
      setUser(session.user);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
      setAuthChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin, days]);

  const loadData = async () => {
    setLoading(true);
    const since = new Date(Date.now() - Number(days) * 86400000).toISOString();
    const [interactionsRes, bookingsRes] = await Promise.all([
      supabase
        .from("student_interactions")
        .select("id, event_type, event_data, session_id, device_type, created_at")
        .gte("created_at", since)
        .in("event_type", ["payment_funnel", "page_view", "tool_used", "ai_interaction", "client_error", "booking_completed"])
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("bookings")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (!interactionsRes.error && interactionsRes.data) setInteractions(interactionsRes.data as InteractionRow[]);
    if (!bookingsRes.error && bookingsRes.data) setBookings(bookingsRes.data);
    setLoading(false);
  };

  const openReceipt = async (path: string) => {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, 60 * 10); // 10 min
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else alert("Couldn't open receipt: " + (error?.message || "unknown"));
  };


  // ===== ANALYTICS COMPUTATIONS =====
  const funnelEvents = interactions.filter((i) => i.event_type === "payment_funnel");
  const pageViews = interactions.filter((i) => i.event_type === "page_view");
  const errors = interactions.filter((i) => i.event_type === "client_error");

  // Step counts by unique session
  const stepSessions = new Map<string, Set<string>>();
  FUNNEL_STEPS.forEach((s) => stepSessions.set(s.key, new Set()));
  funnelEvents.forEach((e) => {
    const step = (e.event_data?.step as string) || "";
    const sid = e.session_id || e.id;
    if (stepSessions.has(step)) stepSessions.get(step)!.add(sid);
  });

  const stepCounts = FUNNEL_STEPS.map((s) => ({
    ...s,
    count: stepSessions.get(s.key)?.size || 0,
  }));

  const topCount = stepCounts[0]?.count || 0;
  const finalCount = stepCounts[stepCounts.length - 1]?.count || 0;
  const overallConversion = topCount > 0 ? (finalCount / topCount) * 100 : 0;

  // Top pages
  const pageCount = new Map<string, number>();
  pageViews.forEach((p) => {
    const page = (p.event_data?.page as string) || "/";
    pageCount.set(page, (pageCount.get(page) || 0) + 1);
  });
  const topPages = Array.from(pageCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Device split
  const deviceCount = new Map<string, number>();
  interactions.forEach((i) => {
    const d = i.device_type || "unknown";
    deviceCount.set(d, (deviceCount.get(d) || 0) + 1);
  });

  const uniqueSessions = new Set(interactions.map((i) => i.session_id).filter(Boolean)).size;

  // ===== RENDER GUARDS =====
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language="en" />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <h1 className="text-2xl font-heading font-bold">Sign in required</h1>
          <p className="text-muted-foreground text-sm">
            This dashboard is only for TopUni admins.
          </p>
          <Button onClick={() => navigate("/admin")}>Go to Admin Login</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language="en" />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <h1 className="text-2xl font-heading font-bold">Access denied</h1>
          <p className="text-muted-foreground text-sm">Admin role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Funnel Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Conversion drop-off across the booking funnel — find where you're losing revenue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="h-3.5 w-3.5" /> Unique Sessions
              </div>
              <div className="text-3xl font-bold text-foreground">{uniqueSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <MousePointerClick className="h-3.5 w-3.5" /> Payment Opens
              </div>
              <div className="text-3xl font-bold text-foreground">{topCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Bookings
              </div>
              <div className="text-3xl font-bold text-gold">{finalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingDown className="h-3.5 w-3.5" /> Conversion
              </div>
              <div className="text-3xl font-bold text-foreground">
                {overallConversion.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Recent Bookings — actual revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gold" />
              Recent Bookings ({bookings.length})
            </CardTitle>
            <Badge variant="outline">{bookings.filter(b => b.status === "pending_review").length} pending review</Badge>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No bookings in this period yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left py-2 pr-3">When</th>
                      <th className="text-left py-2 pr-3">Type</th>
                      <th className="text-left py-2 pr-3">Contact</th>
                      <th className="text-right py-2 pr-3">Price</th>
                      <th className="text-left py-2 pr-3">Promo</th>
                      <th className="text-left py-2 pr-3">Status</th>
                      <th className="text-left py-2">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {new Date(b.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2 pr-3 font-medium">{b.consultation_type}</td>
                        <td className="py-2 pr-3">
                          <div>{b.contact_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{b.contact_email}</div>
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold text-gold">
                          ${Number(b.final_price || 0).toFixed(0)}
                        </td>
                        <td className="py-2 pr-3 text-xs">{b.promo_code || "—"}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={b.status === "pending_review" ? "outline" : "default"}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {b.receipt_path ? (
                            <Button variant="ghost" size="sm" onClick={() => openReceipt(b.receipt_path)}>
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">none</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funnel Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stepCounts.map((step, i) => {
              const prev = i === 0 ? topCount : stepCounts[i - 1].count;
              const stepConv = prev > 0 ? (step.count / prev) * 100 : 0;
              const dropOff = prev - step.count;
              const widthPct = topCount > 0 ? (step.count / topCount) * 100 : 0;
              const isLeak = i > 0 && stepConv < 50 && prev > 5;

              return (
                <div key={step.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{step.label}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{step.count} sessions</span>
                      {i > 0 && (
                        <Badge variant={isLeak ? "destructive" : "secondary"} className="text-xs">
                          {stepConv.toFixed(0)}% from prev
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="h-9 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className={`h-full transition-all ${isLeak ? "bg-destructive/70" : "bg-primary"}`}
                      style={{ width: `${Math.max(widthPct, 2)}%` }}
                    />
                  </div>
                  {i > 0 && dropOff > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 ml-1">
                      <ArrowDown className="h-3 w-3" />
                      {dropOff} dropped off ({((dropOff / prev) * 100).toFixed(0)}%)
                    </div>
                  )}
                </div>
              );
            })}
            {topCount === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No payment funnel events yet in this window.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two-column: Top pages + Device split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Pages</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {topPages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No page views yet.</p>
              )}
              {topPages.map(([page, count]) => {
                const max = topPages[0][1];
                const pct = (count / max) * 100;
                return (
                  <div key={page}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono text-foreground truncate">{page}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Device Split</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Array.from(deviceCount.entries()).sort((a, b) => b[1] - a[1]).map(([device, count]) => {
                const total = interactions.length || 1;
                const pct = (count / total) * 100;
                return (
                  <div key={device}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium text-foreground">{device}</span>
                      <span className="text-xs text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {deviceCount.size === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" /> Recent Client Errors ({errors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {errors.slice(0, 20).map((e) => (
                  <div key={e.id} className="text-xs p-2 bg-muted/50 rounded border border-border">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-foreground">{e.event_data?.path || "?"}</span>
                      <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-destructive font-mono text-xs">{e.event_data?.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4">
          <Link to="/admin" className="underline">← Back to Admin</Link>
        </p>
      </div>

      <Footer language="en" />
    </div>
  );
};

export default FunnelDashboard;
