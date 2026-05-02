import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Play, RefreshCw, AlertTriangle, CheckCircle2, Clock, ExternalLink, ListChecks } from "lucide-react";
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

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const Sources = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", url: "", source_type: "html", region: "", category: "", parser_hint: "", frequency_hours: "24",
  });

  const fetchAll = useCallback(async () => {
    const [s, r, p] = await Promise.all([
      supabase.from("scholarship_sources").select("*").order("name"),
      supabase.from("scrape_runs").select("*").order("started_at", { ascending: false }).limit(50),
      supabase.from("scholarships_staging").select("staging_id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    if (s.data) setSources(s.data as Source[]);
    if (r.data) setRecentRuns(r.data as Run[]);
    if (p.count !== null) setPendingCount(p.count);
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
    toast({ title: `Crawling ${name}…`, description: "Up to 30s" });
    try {
      const { data, error } = await supabase.functions.invoke("scrape-source", { body: { source_id: id } });
      if (error) throw error;
      toast({
        title: data?.ok ? "Crawl complete" : "Crawl failed",
        description: data?.ok
          ? `Found ${data.found ?? 0}, new ${data.new ?? 0}, auto-published ${data.auto_published ?? 0}, needs review ${data.needs_review ?? 0}`
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
    toast({ title: "Dispatching all due sources…" });
    try {
      const { data, error } = await supabase.functions.invoke("scrape-cron-dispatcher", { body: { force_all: true } });
      if (error) throw error;
      toast({ title: "Dispatch complete", description: `Hit ${data?.dispatched ?? 0} sources` });
    } catch (e) {
      toast({ title: "Dispatch failed", description: e instanceof Error ? e.message : "unknown", variant: "destructive" });
    } finally {
      setRunning(null);
      fetchAll();
    }
  };

  const runsBySource = recentRuns.reduce<Record<string, Run[]>>((acc, r) => {
    (acc[r.source_id] ||= []).push(r); return acc;
  }, {});

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Scholarship Sources</h1>
            <p className="text-sm text-muted-foreground mt-1">{sources.length} sources · {pendingCount} pending review</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => nav("/admin/queue")} className="gap-1.5">
              <ListChecks className="h-4 w-4" /> Review Queue ({pendingCount})
            </Button>
            <Button variant="outline" size="sm" onClick={dispatchAll} disabled={running !== null} className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${running === "ALL" ? "animate-spin" : ""}`} /> Run all due
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Source</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add scholarship source</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chevening Scholarships" /></div>
                  <div><Label>URL *</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://www.chevening.org/scholarships/" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="html">HTML</SelectItem><SelectItem value="rss">RSS</SelectItem><SelectItem value="sitemap">Sitemap</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Frequency (hrs)</Label><Input type="number" value={form.frequency_hours} onChange={(e) => setForm({ ...form, frequency_hours: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="UK" /></div>
                    <div>
                      <Label>Category</Label>
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
                  <Button onClick={addSource} className="w-full">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Cadence</TableHead>
                  <TableHead>Last crawl</TableHead>
                  <TableHead>Last 3 runs</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => {
                  const runs = (runsBySource[s.source_id] ?? []).slice(0, 3);
                  const failed = s.consecutive_failures > 0;
                  const stale = s.last_success_at && (Date.now() - new Date(s.last_success_at).getTime()) > s.frequency_hours * 3.6e6 * 2;
                  return (
                    <TableRow key={s.source_id} className={!s.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate max-w-[280px]">
                          <ExternalLink className="h-3 w-3 shrink-0" /> {s.url}
                        </a>
                      </TableCell>
                      <TableCell>{s.region ?? "—"}</TableCell>
                      <TableCell>{s.frequency_hours}h</TableCell>
                      <TableCell className="text-sm">{fmt(s.last_crawled_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {runs.length === 0 ? <span className="text-xs text-muted-foreground">no runs</span> :
                           runs.map((r) => (
                            <span key={r.run_id} title={`${r.status} · ${fmt(r.started_at)}${r.error_message ? "\n" + r.error_message : ""}`}>
                              {r.status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                               r.status === "content_unchanged" ? <Clock className="h-4 w-4 text-blue-500" /> :
                               r.status === "failed" ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
                               <Clock className="h-4 w-4 text-muted-foreground" />}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {failed ? <Badge variant="destructive">{s.consecutive_failures} fails</Badge> :
                         stale ? <Badge variant="secondary">stale</Badge> :
                         s.is_active ? <Badge variant="outline" className="text-emerald-700 border-emerald-300">healthy</Badge> :
                         <Badge variant="secondary">paused</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => runNow(s.source_id, s.name)} disabled={running !== null} className="h-7 px-2 gap-1">
                            <Play className={`h-3.5 w-3.5 ${running === s.source_id ? "animate-pulse" : ""}`} />
                            <span className="text-xs">Run</span>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleActive(s.source_id, s.is_active)} className="h-7 px-2 text-xs">
                            {s.is_active ? "Pause" : "Resume"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(s.source_id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sources.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No sources yet. Add one to start crawling.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Recent runs (last 50)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Found</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Took</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((r) => {
                  const src = sources.find((s) => s.source_id === r.source_id);
                  return (
                    <TableRow key={r.run_id}>
                      <TableCell className="text-sm whitespace-nowrap">{fmt(r.started_at)}</TableCell>
                      <TableCell className="text-sm">{src?.name ?? r.source_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "success" ? "outline" : r.status === "failed" ? "destructive" : "secondary"}
                               className={r.status === "success" ? "text-emerald-700 border-emerald-300" : ""}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.scholarships_found ?? 0}</TableCell>
                      <TableCell>{r.scholarships_new ?? 0}</TableCell>
                      <TableCell>{r.scholarships_updated ?? 0}</TableCell>
                      <TableCell>{r.needs_review ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.cost_estimate_usd ? `$${Number(r.cost_estimate_usd).toFixed(4)}` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {recentRuns.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No runs yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sources;
