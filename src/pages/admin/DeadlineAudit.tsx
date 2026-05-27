import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, ExternalLink, RefreshCw, CheckCircle2, ZapOff, Search,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* /admin/deadline-audit
 *
 * Triage view backed by the suspicious_deadlines SQL view. Each row carries
 * a `reasons` array of rule codes (R1..R8) explaining why it was surfaced.
 * Two actions per row:
 *   - "Re-audit now" → invokes audit-deadlines, writes a new audit row
 *   - "Accept observed" → copies the latest observed_deadline into
 *     canonical_deadline_iso (the auto-supersede trigger then promotes
 *     it into application_deadline if that's NULL)
 *
 * The numbers shown on a row reflect the most-recent audit. A row CAN
 * be on this list with no audit yet (R6: never_audited) — in that case
 * the only useful action is "Re-audit now."
 */

interface SuspiciousRow {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  application_deadline: string | null;
  canonical_deadline_iso: string | null;
  deadline_type: string | null;
  is_deadline_inferred: boolean | null;
  best_url: string | null;
  last_audit_at: string | null;
  last_audit_status: string | null;
  last_observed_deadline: string | null;
  last_audit_confidence: number | null;
  reasons: string[];
}

const REASON_LABELS: Record<string, string> = {
  R1_audit_mismatch:               "audit says mismatch",
  R2_observed_rolling_but_dated:   "observed rolling, but row has date",
  R3_stored_vs_canonical_drift:    "stored ≠ canonical",
  R4_feb_28_29_pattern:            "Feb 28/29 (notification-date pattern)",
  R5_rolling_but_dated:            "deadline_type=rolling but dated",
  R6_never_audited:                "never audited",
  R7_audit_stale_60d:              "audit stale > 60d",
  R8_year_too_far_out:             "year > 18 months out",
};

const REASON_TONE: Record<string, "warn" | "bad" | "info"> = {
  R1_audit_mismatch:             "bad",
  R2_observed_rolling_but_dated: "bad",
  R3_stored_vs_canonical_drift:  "warn",
  R4_feb_28_29_pattern:          "warn",
  R5_rolling_but_dated:          "warn",
  R6_never_audited:              "info",
  R7_audit_stale_60d:            "info",
  R8_year_too_far_out:           "warn",
};

export default function AdminDeadlineAudit() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<SuspiciousRow[]>([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data: role } = await supabase.from("user_roles")
        .select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!role);
      if (role) await fetchRows();
      setLoading(false);
    })();
  }, []);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("suspicious_deadlines" as never)
      .select("*")
      .order("application_deadline", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data as SuspiciousRow[]) ?? []);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (reasonFilter !== "all" && !r.reasons?.includes(reasonFilter)) return false;
      if (!q) return true;
      return (
        r.scholarship_name.toLowerCase().includes(q)
        || r.provider_name?.toLowerCase().includes(q)
        || r.host_country?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, reasonFilter]);

  const reasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) for (const code of r.reasons ?? []) counts[code] = (counts[code] ?? 0) + 1;
    return counts;
  }, [rows]);

  const reaudit = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("audit-deadlines", {
        body: { scholarship_id: id },
      });
      if (error) throw new Error(error.message);
      const status = (data as { status?: string })?.status ?? "unknown";
      toast({
        title: `Re-audited: ${status}`,
        description: (data as { notes?: string })?.notes ?? "",
      });
      await fetchRows();
    } catch (e) {
      toast({ title: "Re-audit failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const acceptObserved = async (row: SuspiciousRow) => {
    if (!row.last_observed_deadline) {
      toast({ title: "No observed deadline", description: "Run a re-audit first.", variant: "destructive" });
      return;
    }
    setBusyId(row.scholarship_id);
    try {
      // Write to canonical_deadline_iso — the BEFORE-UPDATE trigger
      // (promote_canonical_deadline_to_application_deadline) handles
      // propagation into application_deadline when that's NULL. We
      // also explicitly null application_deadline so the trigger fires
      // even when a stale value is there. Safer: write both.
      const { error } = await supabase
        .from("scholarships")
        .update({
          canonical_deadline_iso: row.last_observed_deadline,
          application_deadline:   row.last_observed_deadline,
          is_deadline_inferred:   false,
        })
        .eq("scholarship_id", row.scholarship_id);
      if (error) throw new Error(error.message);
      toast({
        title: "Deadline accepted",
        description: `Set to ${row.last_observed_deadline} from audit observation.`,
      });
      await fetchRows();
    } catch (e) {
      toast({ title: "Update failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
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
          <p className="text-sm text-muted-foreground mb-6">This surface is restricted to admin users.</p>
          <Button variant="outline" onClick={() => nav("/")}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-20">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">Admin · Deadline audit</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Suspicious deadlines</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Rows flagged by rule (R1–R8) and/or by the nightly audit cron. Re-audit on demand, or accept the most recent observation to write it back to the row.
          </p>
        </div>

        <Card className="mb-5">
          <CardContent className="p-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setReasonFilter("all")}
              className={`text-xs px-3 py-1.5 rounded-full border ${reasonFilter === "all" ? "bg-foreground text-background border-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}
            >
              All ({rows.length})
            </button>
            {Object.entries(reasonCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([code, count]) => (
              <button
                key={code}
                onClick={() => setReasonFilter(code)}
                className={`text-xs px-3 py-1.5 rounded-full border ${reasonFilter === code ? "bg-foreground text-background border-foreground" : "border-muted-foreground/30 text-muted-foreground"}`}
              >
                {REASON_LABELS[code] ?? code} ({count})
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search by name, provider, country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto mb-3" />
                No suspicious rows match this filter.
              </CardContent>
            </Card>
          )}
          {filtered.map((row) => {
            const observedDiffersFromStored =
              row.last_observed_deadline
              && row.application_deadline
              && row.last_observed_deadline !== row.application_deadline;
            return (
              <Card key={row.scholarship_id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-base leading-snug">{row.scholarship_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {row.provider_name ?? "—"} · {row.host_country ?? "—"} · {row.deadline_type ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {(row.reasons ?? []).map((code) => {
                        const tone = REASON_TONE[code] ?? "info";
                        const cls =
                          tone === "bad"  ? "bg-red-100 text-red-800 border-red-200"
                          : tone === "warn" ? "bg-amber-100 text-amber-800 border-amber-200"
                          :                   "bg-slate-100 text-slate-700 border-slate-200";
                        return (
                          <Badge key={code} variant="outline" className={`text-[10px] ${cls}`}>
                            {REASON_LABELS[code] ?? code}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mb-3 text-xs">
                    <Field label="Stored" value={row.application_deadline ?? "—"} muted={!row.application_deadline} />
                    <Field label="Canonical" value={row.canonical_deadline_iso ?? "—"} muted={!row.canonical_deadline_iso} />
                    <Field
                      label={`Last observed${row.last_audit_confidence != null ? ` · ${(row.last_audit_confidence * 100).toFixed(0)}%` : ""}`}
                      value={
                        row.last_observed_deadline
                          ?? (row.last_audit_status ?? "never audited")
                      }
                      muted={!row.last_observed_deadline}
                      flagged={!!observedDiffersFromStored}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {row.best_url && (
                      <a
                        href={row.best_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open source
                      </a>
                    )}
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.scholarship_id}
                      onClick={() => reaudit(row.scholarship_id)}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busyId === row.scholarship_id ? "animate-spin" : ""}`} />
                      Re-audit now
                    </Button>
                    <Button
                      size="sm"
                      disabled={busyId === row.scholarship_id || !row.last_observed_deadline || !observedDiffersFromStored}
                      onClick={() => acceptObserved(row)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Accept observed
                    </Button>
                  </div>

                  {row.last_audit_at && (
                    <p className="text-[10px] text-muted-foreground/70 mt-2">
                      Last audit: {new Date(row.last_audit_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-6 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Accepting observed writes the date into both canonical_deadline_iso and application_deadline, and clears is_deadline_inferred.
          </p>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, muted, flagged }: { label: string; value: string; muted?: boolean; flagged?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${flagged ? "border-amber-300 bg-amber-50/40" : "border-muted"}`}>
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-mono text-sm ${muted ? "text-muted-foreground/60" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
