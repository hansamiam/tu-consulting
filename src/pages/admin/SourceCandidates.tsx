// /admin/source_candidates
//
// Human review queue for the F13 discover-from-hub-backfill output.
// Each candidate row was discovered on a T3 aggregator, the LLM resolved
// its TRUE official URL + extracted name/deadline/coverage, and inserted
// here with status='pending'. Admin approves → INSERT into scholarship_sources +
// link via promoted_to_source_id. Admin rejects → status='rejected' +
// rejected_reason.
//
// Approval flow chosen for this v1 over an edge-function endpoint:
// the audit-trail mutation is small enough (one INSERT + one UPDATE)
// that doing it client-side keeps the admin loop tight, and RLS already
// gates the table to admins only.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ExternalLink, Database, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type CandidateRow = {
  candidate_id: string;
  candidate_official_url: string;
  proposed_name: string | null;
  proposed_provider: string | null;
  proposed_host_country: string | null;
  proposed_deadline: string | null;
  proposed_coverage_type: string | null;
  proposed_award_amount_text: string | null;
  discovered_from_url: string;
  discovered_from_source_id: string | null;
  extraction_confidence: number | null;
  extraction_notes: string | null;
  status: string;
  rejected_reason: string | null;
  promoted_to_source_id: string | null;
  created_at: string;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 50);
  }
};

const SourceCandidates = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [reasonByRow, setReasonByRow] = useState<Record<string, string>>({});

  const fetchData = useCallback(async (status: string) => {
    const { data, error } = await supabase
      .from("source_candidates")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Fetch failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data) setRows(data as CandidateRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!role;
      setIsAdmin(admin);
      if (admin) await fetchData(tab);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (isAdmin) fetchData(tab); }, [tab, isAdmin, fetchData]);

  const approve = async (row: CandidateRow) => {
    // 1. INSERT new scholarship_sources row carrying the candidate's
    //    resolved official URL + provenance.
    const newSource = {
      name: row.proposed_name ?? "(F13 candidate)",
      url: row.candidate_official_url,
      source_type: "html" as const,
      region: row.proposed_host_country ?? null,
      category: "official",
      parser_hint: `F13-promoted candidate. Provider: ${row.proposed_provider ?? "unknown"}. Single-program page — extract scholarship details directly.`,
      frequency_hours: 72,
      is_active: true,
      source_tier: "official_program" as const,
    };
    const { data: srcInsert, error: srcErr } = await supabase
      .from("scholarship_sources")
      .insert(newSource)
      .select("source_id")
      .maybeSingle();
    if (srcErr || !srcInsert) {
      toast({ title: "Promote failed", description: srcErr?.message ?? "no source_id returned", variant: "destructive" });
      return;
    }
    const newSourceId = (srcInsert as { source_id: string }).source_id;

    // 2. UPDATE candidate row → approved + linked.
    const { data: { session } } = await supabase.auth.getSession();
    const { error: updErr } = await supabase
      .from("source_candidates")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: session?.user?.id ?? null,
        promoted_to_source_id: newSourceId,
      })
      .eq("candidate_id", row.candidate_id);
    if (updErr) {
      toast({ title: "Candidate update failed", description: updErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Approved", description: `${row.proposed_name ?? "candidate"} → scholarship_sources` });
    fetchData(tab);
  };

  const reject = async (row: CandidateRow) => {
    const reason = (reasonByRow[row.candidate_id] ?? "").trim();
    if (!reason) {
      toast({ title: "Add a reason first", description: "Reject reason is required so the audit trail is meaningful.", variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("source_candidates")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: session?.user?.id ?? null,
        rejected_reason: reason,
      })
      .eq("candidate_id", row.candidate_id);
    if (error) { toast({ title: "Reject failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Rejected" });
    fetchData(tab);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language="en" />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <p className="text-destructive">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Source Candidates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              F13 discovered these on T3 aggregators and resolved their official URLs.
              Approve to promote to <code className="text-xs">scholarship_sources</code>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => nav("/admin/sources")} className="gap-1.5">
              <Database className="h-4 w-4" /> Sources
            </Button>
            <Button variant="outline" size="sm" onClick={() => nav("/admin/queue")} className="gap-1.5">
              <ChevronRight className="h-4 w-4" /> Scholarship queue
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "approved" | "rejected")}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending review</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-3">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No candidates with this status.</p>
            )}
            {rows.map((row) => (
              <Card key={row.candidate_id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base leading-tight">
                        {row.proposed_name ?? <span className="text-muted-foreground italic">(no name extracted)</span>}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {row.proposed_provider && (
                          <Badge variant="secondary" className="font-normal">{row.proposed_provider}</Badge>
                        )}
                        {row.proposed_host_country && (
                          <Badge variant="outline" className="font-normal">{row.proposed_host_country}</Badge>
                        )}
                        {row.proposed_coverage_type && (
                          <Badge variant="outline" className="font-normal">{row.proposed_coverage_type}</Badge>
                        )}
                        {row.proposed_deadline && (
                          <Badge variant="outline" className="font-normal">deadline {fmtDate(row.proposed_deadline)}</Badge>
                        )}
                        {row.extraction_confidence != null && (
                          <Badge
                            variant={row.extraction_confidence >= 0.8 ? "default" : "secondary"}
                            className="font-normal"
                          >
                            conf {row.extraction_confidence.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(row.created_at)}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {row.proposed_award_amount_text && (
                    <p className="text-sm">{row.proposed_award_amount_text}</p>
                  )}

                  <div className="text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">Official URL</span>
                      <a
                        href={row.candidate_official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate inline-flex items-center gap-1"
                      >
                        {hostnameOf(row.candidate_official_url)}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20 shrink-0">Discovered on</span>
                      <a
                        href={row.discovered_from_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground truncate inline-flex items-center gap-1"
                      >
                        {hostnameOf(row.discovered_from_url)}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  </div>

                  {row.extraction_notes && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{row.extraction_notes}</span>
                    </div>
                  )}

                  {tab === "pending" && (
                    <div className="pt-2 space-y-2">
                      <Textarea
                        placeholder="Reject reason (required for rejection — e.g. 'single_country_eligibility', 'career_fellowship', 'jobs_board_url')"
                        value={reasonByRow[row.candidate_id] ?? ""}
                        onChange={(e) =>
                          setReasonByRow((prev) => ({ ...prev, [row.candidate_id]: e.target.value }))
                        }
                        className="min-h-[60px] text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => reject(row)} className="gap-1.5">
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => approve(row)} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                      </div>
                    </div>
                  )}

                  {tab === "rejected" && row.rejected_reason && (
                    <p className="text-xs text-muted-foreground italic">
                      Rejected: {row.rejected_reason}
                    </p>
                  )}

                  {tab === "approved" && row.promoted_to_source_id && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Promoted → scholarship_sources <code>{row.promoted_to_source_id.slice(0, 8)}</code>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SourceCandidates;
