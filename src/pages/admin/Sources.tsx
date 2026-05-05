import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from "recharts";
import {
  Plus, Trash2, Play, RefreshCw, AlertTriangle, CheckCircle2, Clock,
  ExternalLink, ListChecks, Search, Activity, Database, DollarSign,
  Sparkles, Pause, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Source = {
  source_id: string;
  name: string;
  url: string;
  source_type: "html" | "rss" | "sitemap";
  region: string | null;
  category: string | null;
  parser_hint: string | null;
  frequency_hours: number;
  last_crawled_at: string | null;
  last_success_at: string | null;
  consecutive_failures: number;
  is_active: boolean;
  health_status?: string | null;
  health_reason?: string | null;
  last_evaluated_at?: string | null;
};

type Run = {
  run_id: string;
  source_id: string;
  started_at: string;
  status: string;
  scholarships_found: number | null;
  scholarships_new: number | null;
  scholarships_updated: number | null;
  needs_review: number | null;
  duration_ms: number | null;
  error_message: string | null;
  cost_estimate_usd: string | null;
};

/** Per-source rolling quality stats from the source_quality_v view.
 *  avg_confidence_60d is the canonical "is this source any good?" signal. */
type SourceQuality = {
  source_id: string;
  rows_last_60d: number | null;
  avg_confidence_60d: number | null;
  auto_publish_rate_60d: number | null;
  pending_review_60d: number | null;
};

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const Sources = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  // Map keyed by source_id for O(1) lookup when rendering the source list.
  const [qualityBySource, setQualityBySource] = useState<Record<string, SourceQuality>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [autoPubToday, setAutoPubToday] = useState(0);
  const [scholarshipsTotal, setScholarshipsTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({
    name: "", url: "", source_type: "html", region: "", category: "", parser_hint: "", frequency_hours: "24",
  });
  const pollRef = useRef<number | null>(null);

  const fetchAll = useCallback(async () => {
    const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [s, r, p, ap, st, q] = await Promise.all([
      supabase.from("scholarship_sources").select("*").order("name"),
      supabase.from("scrape_runs").select("*").gte("started_at", since24h).order("started_at", { ascending: false }).limit(500),
      supabase.from("scholarships_staging").select("staging_id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("scholarships_staging").select("staging_id", { count: "exact", head: true }).eq("status", "auto_published").gte("created_at", todayStart.toISOString()),
      supabase.from("scholarships").select("scholarship_id", { count: "exact", head: true }),
      // Rolling 60-day quality stats per source — avg confidence + auto-pub rate.
      // View is created by 20260503050000 migration; gracefully no-op if not deployed yet.
      supabase.from("source_quality_v" as never).select("source_id, rows_last_60d, avg_confidence_60d, auto_publish_rate_60d, pending_review_60d"),
    ]);
    if (s.data) setSources(s.data as Source[]);
    if (r.data) setRecentRuns(r.data as Run[]);
    if (p.count !== null) setPendingCount(p.count);
    if (ap.count !== null) setAutoPubToday(ap.count);
    if (st.count !== null) setScholarshipsTotal(st.count);
    if (Array.isArray(q.data)) {
      const map: Record<string, SourceQuality> = {};
      for (const row of q.data as SourceQuality[]) {
        map[row.source_id] = row;
      }
      setQualityBySource(map);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data: role } = await supabase.from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      const admin = !!role;
      setIsAdmin(admin);
      if (admin) await fetchAll();
      setLoading(false);
    })();
  }, [fetchAll]);

  // Live polling — refresh every 10s while a crawl is running, every 30s otherwise.
  // Stops on hidden tab to save API credits.
  useEffect(() => {
    if (!isAdmin) return;
    const tick = () => { if (!document.hidden) fetchAll(); };
    pollRef.current = window.setInterval(tick, running ? 5000 : 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAdmin, fetchAll, running]);

  // ─── Aggregations ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const since24h = Date.now() - 24 * 3600_000;
    const runs24h = recentRuns.filter((r) => new Date(r.started_at).getTime() >= since24h);
    const totalFound = runs24h.reduce((a, r) => a + (r.scholarships_found ?? 0), 0);
    const totalCost = runs24h.reduce((a, r) => a + Number(r.cost_estimate_usd ?? 0), 0);
    const failedCount = sources.filter((s) => s.consecutive_failures > 0).length;
    const healthyCount = sources.filter((s) => s.is_active && s.consecutive_failures === 0).length;
    return { runs24h: runs24h.length, totalFound, totalCost, failedCount, healthyCount };
  }, [recentRuns, sources]);

  // 24-hour activity chart — bucket extractions per hour
  const chartData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3600_000);
      t.setMinutes(0, 0, 0);
      const key = t.toISOString().slice(11, 16); // "HH:MM"
      buckets[key] = 0;
    }
    for (const r of recentRuns) {
      const t = new Date(r.started_at);
      t.setMinutes(0, 0, 0);
      const key = t.toISOString().slice(11, 16);
      if (key in buckets) buckets[key] += r.scholarships_found ?? 0;
    }
    return Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
  }, [recentRuns]);

  const runsBySource = useMemo(() => {
    const acc: Record<string, Run[]> = {};
    for (const r of recentRuns) (acc[r.source_id] ||= []).push(r);
    return acc;
  }, [recentRuns]);

  const regions = useMemo(() =>
    Array.from(new Set(sources.map((s) => s.region).filter(Boolean))).sort() as string[],
    [sources]);
  const categories = useMemo(() =>
    Array.from(new Set(sources.map((s) => s.category).filter(Boolean))).sort() as string[],
    [sources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sources.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.url.toLowerCase().includes(q)) return false;
      if (filterRegion !== "all" && s.region !== filterRegion) return false;
      if (filterCategory !== "all" && s.category !== filterCategory) return false;
      if (filterStatus === "healthy" && (s.consecutive_failures > 0 || !s.is_active)) return false;
      if (filterStatus === "failing" && s.consecutive_failures === 0) return false;
      if (filterStatus === "paused" && s.is_active) return false;
      return true;
    });
  }, [sources, search, filterRegion, filterCategory, filterStatus]);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const addSource = async () => {
    if (!form.name || !form.url) { toast({ title: "Name + URL required", variant: "destructive" }); return; }
    const { error } = await supabase.from("scholarship_sources").insert({
      name: form.name, url: form.url, source_type: form.source_type as "html",
      region: form.region || null, category: form.category || null,
      parser_hint: form.parser_hint || null,
      frequency_hours: Number(form.frequency_hours) || 24,
    });
    if (error) { toast({ title: "Insert failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Source added" });
    setForm({ name: "", url: "", source_type: "html", region: "", category: "", parser_hint: "", frequency_hours: "24" });
    setDialogOpen(false);
    fetchAll();
  };
  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("scholarship_sources").update({ is_active: !current }).eq("source_id", id);
    fetchAll();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this source? Past runs will be retained.")) return;
    await supabase.from("scholarship_sources").delete().eq("source_id", id);
    toast({ title: "Source removed" });
    fetchAll();
  };
  const runNow = async (id: string, name: string) => {
    setRunning(id);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-source", { body: { source_id: id } });
      if (error) throw error;
      toast({
        title: data?.ok ? `${name} crawled` : "Crawl failed",
        description: data?.ok
          ? `${data.found ?? 0} found · ${data.auto_published ?? 0} published · ${data.needs_review ?? 0} pending`
          : data?.error ?? "see logs",
        variant: data?.ok ? "default" : "destructive",
      });
    } catch (e) {
      toast({ title: "Invoke failed", description: e instanceof Error ? e.message : "unknown", variant: "destructive" });
    } finally {
      setRunning(null);
      fetchAll();
    }
  };
  const dispatchAll = async () => {
    setRunning("ALL");
    try {
      const { data, error } = await supabase.functions.invoke("scrape-cron-dispatcher", { body: { force_all: true } });
      if (error) throw error;
      toast({ title: "Dispatch complete", description: `${data?.dispatched ?? 0} sources crawled` });
    } catch (e) {
      toast({ title: "Dispatch failed", description: e instanceof Error ? e.message : "unknown", variant: "destructive" });
    } finally {
      setRunning(null);
      fetchAll();
    }
  };

  // ─── Loading / gate ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
  if (!isAdmin) return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-destructive">Admin access required.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">Scholarship pipeline</h1>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 gap-1">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                live
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-crawls every hour · {sources.length} sources · {scholarshipsTotal.toLocaleString()} scholarships in DB
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => nav("/admin/queue")} className="gap-1.5 relative">
              <ListChecks className="h-4 w-4" /> Review queue
              {pendingCount > 0 && <Badge className="ml-1 px-1.5 py-0 h-5 text-[10px] bg-amber-500 hover:bg-amber-500">{pendingCount}</Badge>}
            </Button>
            <Button variant="outline" size="sm" onClick={dispatchAll} disabled={running !== null} className="gap-1.5">
              {running === "ALL" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run all due
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add source</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add scholarship source</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chevening Scholarships" /></div>
                  <div><Label>URL *</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://www.chevening.org/scholarships/" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="html">HTML</SelectItem><SelectItem value="rss">RSS</SelectItem><SelectItem value="sitemap">Sitemap</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Frequency (hrs)</Label><Input type="number" value={form.frequency_hours} onChange={(e) => setForm({ ...form, frequency_hours: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="UK" /></div>
                    <div><Label>Category</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="university">University</SelectItem>
                          <SelectItem value="ngo">NGO / Foundation</SelectItem>
                          <SelectItem value="aggregator">Aggregator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Parser hint (optional)</Label><Textarea value={form.parser_hint} onChange={(e) => setForm({ ...form, parser_hint: e.target.value })} placeholder="Look for accordion sections; ignore the news sidebar." /></div>
                  <Button onClick={addSource} className="w-full">Add source</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ─── Stats grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Healthy sources" value={stats.healthyCount} sub={`${sources.length} total`} accent="emerald" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="Runs (24h)" value={stats.runs24h} sub="every hour at :17" />
          <StatCard icon={<Sparkles className="h-4 w-4" />} label="Scholarships found" value={stats.totalFound} sub="last 24h" accent="amber" />
          <StatCard icon={<Database className="h-4 w-4" />} label="Auto-published" value={autoPubToday} sub="today (≥85% confidence)" />
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="Spent (24h)" value={`$${stats.totalCost.toFixed(3)}`} sub={stats.failedCount > 0 ? `${stats.failedCount} failing` : "all healthy"} accent={stats.failedCount > 0 ? "red" : undefined} />
        </div>

        {/* ─── 24h activity chart ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Extractions (last 24h)</CardTitle></CardHeader>
          <CardContent className="h-32 -mx-2 -mb-2 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="extractGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={3} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, padding: "4px 8px" }} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#extractGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ─── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search sources…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filterRegion} onValueChange={setFilterRegion}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All regions</SelectItem>{regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="failing">Failing</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          {filtered.length !== sources.length && (
            <span className="text-xs text-muted-foreground">{filtered.length} of {sources.length}</span>
          )}
        </div>

        {/* ─── Source list ────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((s, idx) => (
              <SourceRow
                key={s.source_id}
                source={s}
                runs={runsBySource[s.source_id] ?? []}
                running={running}
                onRun={runNow}
                onToggle={toggleActive}
                onDelete={remove}
                index={idx}
                quality={qualityBySource[s.source_id]}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {sources.length === 0 ? "No sources yet — add one to start crawling." : "No sources match your filters."}
            </CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  accent?: "emerald" | "amber" | "red";
}) {
  const accentClass = accent === "emerald" ? "text-emerald-600" : accent === "amber" ? "text-amber-600" : accent === "red" ? "text-destructive" : "text-foreground";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardContent className="p-4">
          <div className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${accentClass}`}>
            {icon} {label}
          </div>
          <div className="text-2xl font-heading font-semibold mt-1.5 tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SourceRow({
  source: s, runs, running, onRun, onToggle, onDelete, index, quality,
}: {
  source: Source; runs: Run[]; running: string | null;
  onRun: (id: string, name: string) => void; onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void; index: number;
  quality?: SourceQuality;
}) {
  const failed = s.consecutive_failures > 0;
  const stale = s.last_success_at && (Date.now() - new Date(s.last_success_at).getTime()) > s.frequency_hours * 3.6e6 * 2;
  const isPaused = !s.is_active;
  const last10 = runs.slice(0, 10).reverse();
  const successRate = runs.length > 0 ? Math.round(runs.filter((r) => r.status === "success" || r.status === "content_unchanged").length / runs.length * 100) : null;
  const sumFound = runs.reduce((a, r) => a + (r.scholarships_found ?? 0), 0);
  const isRunning = running === s.source_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isPaused ? 0.55 : 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
    >
      <Card className={`hover:border-foreground/20 transition-colors ${failed ? "border-destructive/40" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-semibold text-base truncate">{s.name}</h3>
                {failed ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{s.consecutive_failures} fails</Badge> :
                 isPaused ? <Badge variant="secondary">paused</Badge> :
                 s.health_status === "quarantined" ? <Badge variant="destructive" className="gap-1" title={s.health_reason || ""}><AlertTriangle className="h-3 w-3" />quarantined</Badge> :
                 s.health_status === "degraded" ? <Badge variant="outline" className="text-amber-700 border-amber-300" title={s.health_reason || ""}>degraded</Badge> :
                 stale ? <Badge variant="outline" className="text-amber-700 border-amber-300">stale</Badge> :
                 <Badge variant="outline" className="text-emerald-700 border-emerald-300" title={s.health_reason || ""}>healthy</Badge>}
                {s.region && <Badge variant="secondary" className="text-xs">{s.region}</Badge>}
                {s.category && <Badge variant="outline" className="text-xs capitalize">{s.category}</Badge>}
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1 truncate max-w-full">
                <ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate">{s.url}</span>
              </a>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span>cadence <b className="text-foreground tabular-nums">{s.frequency_hours}h</b></span>
                <span>last crawl <b className="text-foreground">{ago(s.last_crawled_at)}</b></span>
                {successRate !== null && <span>success <b className={`tabular-nums ${successRate >= 90 ? "text-emerald-600" : successRate >= 70 ? "text-amber-600" : "text-destructive"}`}>{successRate}%</b> <span className="text-muted-foreground/60">({runs.length} runs / 24h)</span></span>}
                {sumFound > 0 && <span>found <b className="text-foreground tabular-nums">{sumFound}</b> in last 24h</span>}
                {quality && quality.avg_confidence_60d != null && (() => {
                  const conf = quality.avg_confidence_60d as unknown as number;
                  const autoPub = (quality.auto_publish_rate_60d as unknown as number | null) ?? 0;
                  const tone = conf >= 0.85 ? "text-emerald-600" : conf >= 0.7 ? "text-amber-600" : "text-destructive";
                  return (
                    <>
                      <span title="Average extraction confidence over last 60 days">
                        avg conf <b className={`tabular-nums ${tone}`}>{(conf * 100).toFixed(0)}%</b>
                      </span>
                      <span title="Auto-publish rate over last 60 days">
                        auto-pub <b className="text-foreground tabular-nums">{(autoPub * 100).toFixed(0)}%</b>
                      </span>
                      {(quality.pending_review_60d ?? 0) > 0 && (
                        <span>queued <b className="text-amber-700 tabular-nums">{quality.pending_review_60d}</b></span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Sparkline of last 10 runs */}
            <div className="hidden sm:flex items-end gap-0.5 h-10 self-center">
              {last10.map((r) => {
                const found = r.scholarships_found ?? 0;
                const h = Math.min(40, Math.max(4, found * 4 + 4));
                const color = r.status === "failed" ? "bg-destructive" :
                              r.status === "content_unchanged" ? "bg-muted-foreground/30" :
                              found > 0 ? "bg-primary" : "bg-emerald-300";
                return <div key={r.run_id} title={`${r.status} · ${found} found · ${fmt(r.started_at)}`} className={`w-1.5 rounded-sm ${color}`} style={{ height: `${h}px` }} />;
              })}
              {last10.length === 0 && <div className="text-xs text-muted-foreground/50 self-center">no runs yet</div>}
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onRun(s.source_id, s.name)} disabled={running !== null} className="h-7 px-2 gap-1">
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span className="text-xs">Run</span>
              </Button>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onToggle(s.source_id, s.is_active)} className="h-7 px-2 text-xs flex-1">
                  {s.is_active ? <><Pause className="h-3 w-3 mr-1" />Pause</> : <><Play className="h-3 w-3 mr-1" />Resume</>}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => onDelete(s.source_id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default Sources;
