/**
 * /admin/partner-inquiries — review queue for the partner-inquiry form.
 *
 * Submissions land in public.partner_inquiries (see migration
 * 20260509070000_partner_inquiries.sql). RLS allows SELECT/UPDATE only
 * for admins via has_role(auth.uid(),'admin').
 *
 * This page exposes the inbox: list rows newest-first, filter by status,
 * update status via dropdown, and edit per-row notes (saved on blur).
 * Patterned after Submissions.tsx (admin gate, layout, status filter
 * chips, toast feedback).
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Inbox, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";

type Status = "pending_review" | "contacted" | "qualified" | "closed_won" | "closed_lost";

interface PartnerInquiry {
  id: string;
  created_at: string;
  institution_name: string;
  region: string | null;
  contact_email: string;
  message: string | null;
  language: "en" | "ru" | string;
  source_path: string | null;
  user_agent: string | null;
  status: Status;
  notes: string | null;
}

const STATUSES: Status[] = ["pending_review", "contacted", "qualified", "closed_won", "closed_lost"];
type StatusFilter = Status | "all";
const FILTERS: StatusFilter[] = ["all", ...STATUSES];

const fmt = (iso: string | null) => iso
  ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  : "—";

const labelFor = (s: StatusFilter) =>
  s === "all" ? "All"
  : s === "pending_review" ? "Pending"
  : s === "contacted" ? "Contacted"
  : s === "qualified" ? "Qualified"
  : s === "closed_won" ? "Won"
  : s === "closed_lost" ? "Lost"
  : s;

const statusBadgeCls = (s: Status) =>
  s === "pending_review" ? "text-muted-foreground border-border bg-muted/30"
  : s === "contacted"    ? "text-amber-700 border-amber-300/40 bg-amber-50 dark:bg-amber-950/20"
  : s === "qualified"    ? "text-emerald-700 border-emerald-300/40 bg-emerald-50 dark:bg-emerald-950/20"
  : s === "closed_won"   ? "text-success border-success/40 bg-success/5"
  : s === "closed_lost"  ? "text-destructive border-destructive/40 bg-destructive/5"
  : "text-muted-foreground border-border";

const truncate = (str: string, n = 220) =>
  str.length <= n ? str : str.slice(0, n).trimEnd() + "…";

const PartnerInquiries = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("pending_review");
  const [rows, setRows] = useState<PartnerInquiry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notesByRow, setNotesByRow] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async (status: StatusFilter) => {
    // partner_inquiries isn't in the generated types yet — cast through `never`
    // to bypass the typed client (same pattern as ScholarshipVerification uses
    // for the verification-coverage view). RLS still enforces admin-only access.
    const table = supabase.from("partner_inquiries" as never);
    const baseQuery = status === "all"
      ? table.select("*").order("created_at", { ascending: false }).limit(200)
      : table.select("*").eq("status", status).order("created_at", { ascending: false }).limit(200);

    const [r, c] = await Promise.all([
      baseQuery,
      supabase.from("partner_inquiries" as never).select("status"),
    ]);
    if (r.data) {
      const data = r.data as unknown as PartnerInquiry[];
      setRows(data);
      // Seed notes editor state with current row notes so blur-save can compare.
      const seed: Record<string, string> = {};
      for (const row of data) seed[row.id] = row.notes ?? "";
      setNotesByRow((prev) => ({ ...seed, ...prev }));
    }
    if (c.data) {
      const counter: Record<string, number> = {};
      for (const row of c.data as unknown as { status: string }[]) {
        counter[row.status] = (counter[row.status] ?? 0) + 1;
      }
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
      if (admin) await fetchAll(filter);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (isAdmin) fetchAll(filter); }, [filter, isAdmin, fetchAll]);

  const updateStatus = async (row: PartnerInquiry, next: Status) => {
    if (next === row.status) return;
    setBusyId(row.id);
    const { error } = await supabase
      .from("partner_inquiries" as never)
      .update({ status: next } as never)
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status updated", description: `${row.institution_name} → ${labelFor(next)}` });
    fetchAll(filter);
  };

  const saveNotes = async (row: PartnerInquiry) => {
    const next = (notesByRow[row.id] ?? "").trim();
    const current = (row.notes ?? "").trim();
    if (next === current) return;
    setBusyId(row.id);
    const { error } = await supabase
      .from("partner_inquiries" as never)
      .update({ notes: next || null } as never)
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Notes save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notes saved" });
    fetchAll(filter);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-destructive">Admin access required.</p>
        <Button variant="outline" className="mt-4" onClick={() => nav("/")}>Back to home</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">Admin · Partner inquiries</p>
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">Partner inquiries</h1>
            <p className="text-sm text-muted-foreground mt-1">Inbound from the partner-inquiry form. Triage status and keep working notes.</p>
          </div>
        </div>

        {/* Status filter chips — same visual idiom as ScholarshipVerification */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-card flex-wrap">
            {FILTERS.map((s) => {
              const n = s === "all"
                ? Object.values(counts).reduce((a, b) => a + b, 0)
                : (counts[s] ?? 0);
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 h-8 rounded text-[12px] font-medium transition-colors inline-flex items-center gap-1.5 ${filter === s ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {labelFor(s)}
                  {n > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">({n})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Inbox />}
            title={filter === "pending_review" ? "Inbox zero." : "Nothing here."}
            description={
              filter === "pending_review"
                ? "No partner inquiries waiting. The form is linked from the partners page."
                : "Switch to another tab to see other inquiries."
            }
            cta={filter !== "pending_review" ? { label: "Open pending", onClick: () => setFilter("pending_review") } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const isBusy = busyId === r.id;
              return (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base truncate">{r.institution_name}</CardTitle>
                          <Badge variant="outline" className={`text-[10px] ${statusBadgeCls(r.status)}`}>{r.status}</Badge>
                          {r.region && <Badge variant="secondary" className="text-[10px]">{r.region}</Badge>}
                          <Badge variant="outline" className="text-[10px] uppercase">{r.language}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-1.5">
                          <a href={`mailto:${r.contact_email}`} className="hover:text-foreground inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {r.contact_email}
                          </a>
                          <span>Submitted {fmt(r.created_at)}</span>
                          {r.source_path && (
                            <span className="inline-flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> {r.source_path}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 w-44">
                        <Select
                          value={r.status}
                          onValueChange={(v) => updateStatus(r, v as Status)}
                          disabled={isBusy}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">{labelFor(s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {r.message && (
                      <div className="text-sm bg-muted/30 border border-border rounded-md p-3">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold block mb-1">Message</span>
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{truncate(r.message)}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold block mb-1">Notes (saves on blur)</span>
                      <Textarea
                        placeholder="Internal notes — visible to admins only."
                        value={notesByRow[r.id] ?? ""}
                        onChange={(e) => setNotesByRow({ ...notesByRow, [r.id]: e.target.value })}
                        onBlur={() => saveNotes(r)}
                        disabled={isBusy}
                        className="text-sm h-20"
                      />
                    </div>

                    {r.user_agent && (
                      <p className="text-[10px] text-muted-foreground/80 truncate" title={r.user_agent}>
                        UA: {r.user_agent}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerInquiries;
