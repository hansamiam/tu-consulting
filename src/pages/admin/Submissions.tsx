/**
 * /admin/submissions — review queue for the public /submit form.
 *
 * Users submit scholarship URLs from /submit; rows land in
 * scholarship_submissions with status='pending_review'. This page is
 * the editorial workflow:
 *   - Approve → INSERT into public.scholarships, mark submission as
 *     approved with a back-pointer (promoted_to). Triggers re-embed
 *     on the next embed-scholarships cron tick.
 *   - Reject → mark with reason. The DB partial-unique index lifts
 *     so the same URL can be submitted again later.
 *   - Duplicate → mark and don't insert.
 *
 * RLS gates this page to admins via has_role; the queries below assume
 * the caller is admin (gated above).
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, ExternalLink, Database, ListChecks, Mail, User as UserIcon, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";

type Submission = {
  submission_id: string;
  submitted_by: string | null;
  submitter_email: string | null;
  submitter_name: string | null;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  official_url: string;
  coverage_type: string | null;
  award_amount_text: string | null;
  application_deadline: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  notes: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  promoted_to: string | null;
  created_at: string;
};

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

type StatusFilter = "pending_review" | "approved" | "rejected" | "duplicate";

const Submissions = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<StatusFilter>("pending_review");
  const [rows, setRows] = useState<Submission[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reasonByRow, setReasonByRow] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async (status: StatusFilter) => {
    const [r, c] = await Promise.all([
      supabase.from("scholarship_submissions").select("*").eq("status", status).order("created_at", { ascending: false }).limit(200),
      supabase.from("scholarship_submissions").select("status"),
    ]);
    if (r.data) setRows(r.data as Submission[]);
    if (c.data) {
      const counter: Record<string, number> = {};
      for (const row of c.data as { status: string }[]) counter[row.status] = (counter[row.status] ?? 0) + 1;
      setCounts(counter);
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
      if (admin) await fetchAll(tab);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (isAdmin) fetchAll(tab); }, [tab, isAdmin, fetchAll]);

  const approve = async (s: Submission) => {
    setBusyId(s.submission_id);
    // Build the public.scholarships payload
    const payload: Record<string, unknown> = {
      scholarship_name:     s.scholarship_name,
      provider_name:        s.provider_name,
      host_country:         s.host_country,
      official_url:         s.official_url,
      coverage_type:        s.coverage_type ?? "other",
      award_amount_text:    s.award_amount_text,
      application_deadline: s.application_deadline,
      target_degree_level:  s.target_degree_level,
      target_fields:        s.target_fields,
      verified:             true,
      last_verified_date:   new Date().toISOString().slice(0, 10),
      // Force re-embed on next embed-scholarships cron tick
      embedding:            null,
      embedded_at:          null,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("scholarships")
      .insert(payload)
      .select("scholarship_id")
      .single();

    if (insErr) {
      setBusyId(null);
      toast({ title: "Insert failed", description: insErr.message, variant: "destructive" });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const { error: upErr } = await supabase
      .from("scholarship_submissions")
      .update({
        status: "approved",
        reviewed_by: session?.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        promoted_to: inserted?.scholarship_id ?? null,
      })
      .eq("submission_id", s.submission_id);

    setBusyId(null);
    if (upErr) {
      toast({ title: "Marked but not linked", description: upErr.message, variant: "destructive" });
    } else {
      toast({ title: "Approved", description: `${s.scholarship_name} added to database.` });
    }
    fetchAll(tab);
  };

  const reject = async (s: Submission, asDuplicate = false) => {
    setBusyId(s.submission_id);
    const reason = reasonByRow[s.submission_id] ?? "";
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("scholarship_submissions")
      .update({
        status: asDuplicate ? "duplicate" : "rejected",
        rejection_reason: reason || null,
        reviewed_by: session?.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("submission_id", s.submission_id);

    setBusyId(null);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: asDuplicate ? "Marked duplicate" : "Rejected" });
    }
    fetchAll(tab);
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">User submissions</h1>
            <p className="text-sm text-muted-foreground mt-1">Scholarships submitted via /submit, awaiting editorial review.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => nav("/admin/sources")} className="gap-1.5"><Database className="h-4 w-4" /> Sources</Button>
            <Button variant="outline" size="sm" onClick={() => nav("/admin/queue")} className="gap-1.5"><ListChecks className="h-4 w-4" /> AI scrape queue</Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as StatusFilter)}>
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="pending_review" className="gap-1.5">
              Pending {counts.pending_review ? <Badge variant="secondary" className="ml-1 h-5 text-[10px]">{counts.pending_review}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved {counts.approved ? <span className="ml-1 text-xs text-muted-foreground">({counts.approved})</span> : null}</TabsTrigger>
            <TabsTrigger value="rejected">Rejected {counts.rejected ? <span className="ml-1 text-xs text-muted-foreground">({counts.rejected})</span> : null}</TabsTrigger>
            <TabsTrigger value="duplicate">Duplicates {counts.duplicate ? <span className="ml-1 text-xs text-muted-foreground">({counts.duplicate})</span> : null}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {rows.length === 0 ? (
              <EmptyState
                icon={<ListChecks />}
                title={tab === "pending_review" ? "Inbox zero." : "Nothing here."}
                description={
                  tab === "pending_review"
                    ? "No submissions waiting for review. The /submit form is publicly linked from the footer in both languages."
                    : "Switch to another tab to see other submissions."
                }
                cta={tab !== "pending_review" ? { label: "Open pending", onClick: () => setTab("pending_review") } : undefined}
              />
            ) : (
              <div className="space-y-3">
                {rows.map((s) => {
                  const isBusy = busyId === s.submission_id;
                  return (
                    <Card key={s.submission_id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base truncate">{s.scholarship_name}</CardTitle>
                              {s.coverage_type && <Badge variant="outline" className="text-xs">{s.coverage_type}</Badge>}
                              {s.host_country && <Badge variant="secondary" className="text-xs">{s.host_country}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">{s.provider_name ?? "—"}</span>
                              {s.award_amount_text ? ` · ${s.award_amount_text}` : ""}
                              {s.application_deadline ? ` · deadline ${s.application_deadline}` : ""}
                            </p>
                            <a href={s.official_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-gold-dark inline-flex items-center gap-1 mt-1.5 break-all">
                              <ExternalLink className="w-3 h-3 shrink-0" /> {s.official_url}
                            </a>
                          </div>
                          {tab === "pending_review" && (
                            <div className="flex gap-1.5 shrink-0">
                              <Button size="sm" disabled={isBusy} onClick={() => approve(s)} className="gap-1 bg-emerald-600 hover:bg-emerald-700"><Check className="h-4 w-4" />Approve</Button>
                              <Button size="sm" variant="outline" disabled={isBusy} onClick={() => reject(s, true)} className="gap-1 text-amber-700 border-amber-300"><AlertTriangle className="h-3.5 w-3.5" />Dup</Button>
                              <Button size="sm" variant="outline" disabled={isBusy} onClick={() => reject(s, false)} className="gap-1"><X className="h-4 w-4" />Reject</Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {(s.target_degree_level?.length || s.target_fields?.length) && (
                          <div className="flex flex-wrap gap-1.5">
                            {(s.target_degree_level ?? []).map((l) => <Badge key={`l-${l}`} variant="outline" className="text-[10px]">{l}</Badge>)}
                            {(s.target_fields ?? []).map((f) => <Badge key={`f-${f}`} variant="outline" className="text-[10px]">{f}</Badge>)}
                          </div>
                        )}

                        {s.notes && (
                          <div className="text-sm bg-muted/30 border border-border rounded-md p-3">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold block mb-1">Submitter notes</span>
                            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{s.notes}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {(s.submitter_name || s.submitter_email) && (
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="w-3 h-3" /> {s.submitter_name ?? "Anon"}
                              {s.submitter_email && (
                                <>
                                  {" · "}
                                  <a href={`mailto:${s.submitter_email}`} className="hover:text-foreground inline-flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {s.submitter_email}
                                  </a>
                                </>
                              )}
                            </span>
                          )}
                          <span>Submitted {fmt(s.created_at)}</span>
                          {s.reviewed_at && <span>Reviewed {fmt(s.reviewed_at)}</span>}
                          {s.promoted_to && (
                            <a href={`/scholarships/${s.promoted_to}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1 text-emerald-600">
                              <Check className="w-3 h-3" /> Live in DB
                            </a>
                          )}
                        </div>

                        {s.rejection_reason && (
                          <div className="text-xs bg-destructive/5 text-destructive border border-destructive/20 rounded-md p-2">
                            <span className="font-medium">Rejection note: </span>{s.rejection_reason}
                          </div>
                        )}

                        {tab === "pending_review" && (
                          <Textarea
                            placeholder="Optional: rejection / duplicate reason (sent to no one, kept for our records)"
                            value={reasonByRow[s.submission_id] ?? ""}
                            onChange={(e) => setReasonByRow({ ...reasonByRow, [s.submission_id]: e.target.value })}
                            className="text-sm h-16"
                          />
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

export default Submissions;
