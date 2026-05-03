import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, AlertTriangle, ExternalLink, Search, ChevronRight,
  ZapOff, Loader2, Filter,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* /admin/scholarships-verification — promote-pending workflow.
 *
 * Per docs/DATA_PIPELINE_AUDIT.md the read-side LLMs (brief, counselor)
 * only see scholarships with verification_status IN ('verified', 'stale').
 * Newly-scraped rows land as 'pending' and stay invisible to users until
 * a human admin promotes them.
 *
 * This surface lets an admin:
 *   · Filter by status, host_country, data_source
 *   · See key fields in a dense list (name, country, coverage, deadline,
 *     source_url, why_this_fits)
 *   · Open the source_url in a new tab to spot-check
 *   · Promote one or many rows → verification_status='verified',
 *     last_verified_at=now()
 *   · Mark a row 'broken' if the source URL turned out to be wrong
 */

interface Row {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  application_deadline: string | null;
  official_url: string | null;
  source_url: string | null;
  data_source: string | null;
  verification_status: string | null;
  last_verified_at: string | null;
  why_this_fits: string | null;
}

interface Coverage {
  total_scholarships: number;
  verified_count: number;
  stale_count: number;
  broken_count: number;
  pending_count: number;
  have_source_url: number;
  verified_in_last_30d: number;
}

const STATUS_OPTIONS = ["pending", "verified", "stale", "broken"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number] | "all";

export default function AdminScholarshipVerification() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

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
    const [rowsRes, covRes] = await Promise.all([
      supabase
        .from("scholarships")
        .select("scholarship_id, scholarship_name, provider_name, host_country, coverage_type, award_amount_text, application_deadline, official_url, source_url, data_source, verification_status, last_verified_at, why_this_fits")
        .order("verification_status", { nullsFirst: false })
        .order("last_verified_at", { ascending: true, nullsFirst: true })
        .limit(500),
      supabase.from("scholarship_verification_coverage_v" as never).select("*").maybeSingle(),
    ]);
    if (rowsRes.data) setRows(rowsRes.data as Row[]);
    if (covRes.data) setCoverage(covRes.data as Coverage);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter(r => {
      if (statusFilter !== "all" && (r.verification_status ?? "pending") !== statusFilter) return false;
      if (!q) return true;
      return (
        r.scholarship_name.toLowerCase().includes(q)
        || r.provider_name?.toLowerCase().includes(q)
        || r.host_country?.toLowerCase().includes(q)
        || r.source_url?.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, search]);

  const promote = async (ids: string[], targetStatus: "verified" | "broken") => {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("scholarships")
      .update({
        verification_status: targetStatus,
        last_verified_at: now,
        verified: targetStatus === "verified",
      })
      .in("scholarship_id", ids);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: targetStatus === "verified" ? `Promoted ${ids.length} row${ids.length === 1 ? "" : "s"}` : `Marked ${ids.length} broken`,
      description: targetStatus === "verified"
        ? "These scholarships are now visible to the brief and counselor."
        : "These scholarships are hidden from LLM context.",
    });
    setSelected(new Set());
    await fetchAll();
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
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">Admin · Verification queue</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Scholarship verification</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Pending rows are invisible to the brief + counselor LLMs until promoted. Spot-check the source URL, then promote (verified) or reject (broken).
          </p>
        </div>

        {coverage && (
          <Card className="mb-5">
            <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Stat label="Verified" value={coverage.verified_count.toString()} tone="good" sub={`${coverage.verified_in_last_30d} fresh ≤30d`} />
              <Stat label="Stale" value={coverage.stale_count.toString()} tone="warn" />
              <Stat label="Broken" value={coverage.broken_count.toString()} tone={coverage.broken_count > 0 ? "danger" : "neutral"} />
              <Stat label="Pending review" value={coverage.pending_count.toString()} tone={coverage.pending_count > 50 ? "warn" : "neutral"} sub="hidden from LLM" />
              <Stat label="Total" value={coverage.total_scholarships.toString()} sub={`${coverage.have_source_url} have source_url`} />
            </CardContent>
          </Card>
        )}

        {/* Filters + search + bulk action */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-card">
            {(["pending", "verified", "stale", "broken", "all"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-8 rounded text-[12px] font-medium transition-colors ${statusFilter === s ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by name, country, URL…" className="pl-9 h-9" />
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground tabular-nums">{selected.size} selected</span>
              <Button
                variant="gold"
                size="sm"
                disabled={bulkBusy}
                onClick={async () => {
                  setBulkBusy(true);
                  await promote(Array.from(selected), "verified");
                  setBulkBusy(false);
                }}
                className="gap-1.5"
              >
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Promote → verified
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={bulkBusy}
                onClick={async () => {
                  setBulkBusy(true);
                  await promote(Array.from(selected), "broken");
                  setBulkBusy(false);
                }}
                className="gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Mark broken
              </Button>
            </div>
          )}
        </div>

        {/* Row list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">No rows match this filter.</div>
          ) : filtered.map((r, i) => (
            <RowCard
              key={r.scholarship_id}
              row={r}
              checked={selected.has(r.scholarship_id)}
              onCheck={(v) => {
                setSelected(prev => {
                  const next = new Set(prev);
                  if (v) next.add(r.scholarship_id); else next.delete(r.scholarship_id);
                  return next;
                });
              }}
              busy={busyId === r.scholarship_id}
              onPromote={async () => {
                setBusyId(r.scholarship_id);
                await promote([r.scholarship_id], "verified");
                setBusyId(null);
              }}
              onBreak={async () => {
                setBusyId(r.scholarship_id);
                await promote([r.scholarship_id], "broken");
                setBusyId(null);
              }}
              index={i}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

const Stat = ({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "danger" | "neutral" }) => {
  const cls = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-700" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{label}</p>
      <p className={`font-heading font-bold text-2xl tabular-nums tracking-tight leading-none ${cls}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground/80 mt-1">{sub}</p>}
    </div>
  );
};

const RowCard = ({
  row, checked, onCheck, busy, onPromote, onBreak, index,
}: {
  row: Row; checked: boolean; onCheck: (v: boolean) => void;
  busy: boolean; onPromote: () => void; onBreak: () => void; index: number;
}) => {
  const status = row.verification_status ?? "pending";
  const statusCls = status === "verified" ? "text-success border-success/40 bg-success/5"
    : status === "stale" ? "text-amber-700 border-amber-300/40 bg-amber-50 dark:bg-amber-950/20"
    : status === "broken" ? "text-destructive border-destructive/40 bg-destructive/5"
    : "text-muted-foreground border-border bg-muted/30";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(0.02 * index, 0.4) }}
    >
      <Card className={status === "broken" ? "border-destructive/30" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Checkbox checked={checked} onCheckedChange={(v) => onCheck(!!v)} className="mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <h3 className="font-heading font-semibold text-base truncate">{row.scholarship_name}</h3>
                <Badge variant="outline" className={`text-[10px] ${statusCls}`}>{status}</Badge>
                {row.host_country && <Badge variant="secondary" className="text-[10px]">{row.host_country}</Badge>}
                {row.data_source && <Badge variant="outline" className="text-[10px]">{row.data_source}</Badge>}
                <Badge variant="outline" className="text-[10px] capitalize">{row.coverage_type}</Badge>
              </div>
              {row.provider_name && <p className="text-[12px] text-muted-foreground mb-1.5 truncate">{row.provider_name}</p>}
              {row.why_this_fits && <p className="text-[12px] text-foreground/80 leading-snug mb-1.5 line-clamp-2">{row.why_this_fits}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {row.application_deadline && <span>deadline <b className="text-foreground tabular-nums">{row.application_deadline}</b></span>}
                {row.award_amount_text && <span>award <b className="text-foreground">{row.award_amount_text}</b></span>}
                {row.last_verified_at && <span>checked <b className="text-foreground tabular-nums">{new Date(row.last_verified_at).toLocaleDateString()}</b></span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                {row.source_url && (
                  <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate max-w-md">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{row.source_url}</span>
                  </a>
                )}
                <Link to={`/scholarships/${row.scholarship_id}`} className="text-[11px] text-gold-dark hover:underline inline-flex items-center gap-0.5">
                  detail <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {status !== "verified" && (
                <Button size="sm" variant="gold" disabled={busy} onClick={onPromote} className="gap-1.5 h-8">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Promote
                </Button>
              )}
              {status !== "broken" && (
                <Button size="sm" variant="ghost" disabled={busy} onClick={onBreak} className="gap-1.5 h-8 text-destructive hover:bg-destructive/10">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Mark broken
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
