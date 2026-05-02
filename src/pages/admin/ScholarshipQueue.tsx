import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ExternalLink, ChevronDown, ChevronRight, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type StagingRow = {
  staging_id: string;
  source_id: string;
  scholarship_id: string | null;
  fingerprint: string;
  raw_text: string | null;
  parsed_data: Record<string, unknown>;
  confidence: number;
  diff_summary: string | null;
  status: string;
  created_at: string;
  rejection_reason: string | null;
};

type Source = { source_id: string; name: string; url: string };

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const ScholarshipQueue = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"pending" | "auto_published" | "rejected">("pending");
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [sourcesById, setSourcesById] = useState<Record<string, Source>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reasonByRow, setReasonByRow] = useState<Record<string, string>>({});

  const fetchData = useCallback(async (status: string) => {
    const [r, s] = await Promise.all([
      supabase.from("scholarships_staging").select("*").eq("status", status).order("created_at", { ascending: false }).limit(200),
      supabase.from("scholarship_sources").select("source_id, name, url"),
    ]);
    if (r.data) setRows(r.data as StagingRow[]);
    if (s.data) {
      const map: Record<string, Source> = {};
      for (const row of s.data as Source[]) map[row.source_id] = row;
      setSourcesById(map);
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
      if (admin) await fetchData(tab);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (isAdmin) fetchData(tab); }, [tab, isAdmin, fetchData]);

  const approve = async (row: StagingRow) => {
    // Promote staging row's parsed_data into scholarships table
    const p = row.parsed_data as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      ...p,
      verified: true,
      last_verified_date: new Date().toISOString().slice(0, 10),
      embedding: null, // force re-embed
      embedded_at: null,
    };
    delete payload["confidence"];
    delete payload["notes"];

    let scholarshipId = row.scholarship_id;
    if (scholarshipId) {
      const { error } = await supabase.from("scholarships").update(payload).eq("scholarship_id", scholarshipId);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from("scholarships").insert(payload).select("scholarship_id").single();
      if (error) { toast({ title: "Insert failed", description: error.message, variant: "destructive" }); return; }
      scholarshipId = data?.scholarship_id ?? null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("scholarships_staging").update({
      status: "approved",
      reviewed_by: session?.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      scholarship_id: scholarshipId,
    }).eq("staging_id", row.staging_id);
    toast({ title: "Approved", description: (p.scholarship_name as string) ?? row.staging_id.slice(0, 8) });
    fetchData(tab);
  };

  const reject = async (row: StagingRow) => {
    const reason = reasonByRow[row.staging_id] ?? "";
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("scholarships_staging").update({
      status: "rejected",
      rejection_reason: reason || null,
      reviewed_by: session?.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("staging_id", row.staging_id);
    toast({ title: "Rejected" });
    fetchData(tab);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Scholarship Review Queue</h1>
            <p className="text-sm text-muted-foreground mt-1">Review LLM-extracted scholarships before publishing.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => nav("/admin/sources")} className="gap-1.5">
            <Database className="h-4 w-4" /> Sources
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "auto_published" | "rejected")}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending review</TabsTrigger>
            <TabsTrigger value="auto_published">Auto-published</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {rows.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nothing in this tab.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => {
                  const p = r.parsed_data as Record<string, unknown>;
                  const src = sourcesById[r.source_id];
                  const isExpanded = expanded.has(r.staging_id);
                  return (
                    <Card key={r.staging_id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base truncate">{(p.scholarship_name as string) ?? "(unnamed)"}</CardTitle>
                              <Badge variant="outline" className={r.confidence >= 0.85 ? "text-emerald-700 border-emerald-300" : r.confidence >= 0.7 ? "text-amber-700 border-amber-300" : "text-destructive border-destructive/40"}>
                                {(r.confidence * 100).toFixed(0)}% confident
                              </Badge>
                              {r.scholarship_id && <Badge variant="secondary">UPDATE</Badge>}
                              {!r.scholarship_id && <Badge variant="outline">new</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">{(p.provider_name as string) ?? "?"}</span> · {(p.host_country as string) ?? "?"} · {(p.coverage_type as string) ?? "?"}
                              {p.application_deadline ? ` · deadline ${p.application_deadline as string}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              from <a href={src?.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />{src?.name ?? r.source_id.slice(0, 8)}</a> · {fmt(r.created_at)}
                            </p>
                            {r.diff_summary && (
                              <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded p-2 font-mono">
                                <span className="font-sans font-medium not-italic">Changes: </span>{r.diff_summary}
                              </div>
                            )}
                          </div>
                          {tab === "pending" && (
                            <div className="flex gap-1.5 shrink-0">
                              <Button size="sm" onClick={() => approve(r)} className="gap-1 bg-emerald-600 hover:bg-emerald-700"><Check className="h-4 w-4" />Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => reject(r)} className="gap-1"><X className="h-4 w-4" />Reject</Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button variant="ghost" size="sm" onClick={() => toggleExpand(r.staging_id)} className="h-7 px-2 -ml-2 gap-1 text-xs text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          {isExpanded ? "Hide details" : "Show all extracted fields"}
                        </Button>
                        {isExpanded && (
                          <pre className="mt-2 text-[11px] bg-muted/40 border rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(p, null, 2)}
                          </pre>
                        )}
                        {tab === "pending" && (
                          <div className="mt-3">
                            <Textarea
                              placeholder="Optional: rejection reason"
                              value={reasonByRow[r.staging_id] ?? ""}
                              onChange={(e) => setReasonByRow({ ...reasonByRow, [r.staging_id]: e.target.value })}
                              className="text-sm h-16"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ScholarshipQueue;
