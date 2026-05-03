import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw, CheckCircle2, AlertTriangle, Loader2, ZapOff,
  Zap, Search, ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* /admin/universities — operational surface for the data-enrichment loop.
 * Lists every university row with:
 *   · Field-completeness signal (how many of {ranking, tuition, acceptance,
 *     IELTS-min, GPA-min} are populated)
 *   · enriched_at timestamp + staleness badge
 *   · Per-row "Enrich now" button that fires the enrich-university edge fn
 *   · Bulk "Run cron pass" button that fires enrich-universities-cron
 *
 * Anything written by enrich-university is flagged via enrichment_metadata
 * (source: "ai" + confidence + inferred_at). The Sources page surfaces the
 * scrape-side equivalent; this is its cousin for the universities side. */

interface UniversityRow {
  university_id: string;
  university_name: string;
  country: string;
  city: string;
  global_ranking: number | null;
  tuition_usd_per_year: number | null;
  cost_of_living_index: number | null;
  enriched_at: string | null;
  enrichment_metadata: Record<string, { source?: string; confidence?: number; inferred_at?: string }> | null;
}

interface CoverageRow {
  total_universities: number;
  enriched_count: number;
  enriched_recent_count: number;
  have_ranking: number;
  have_tuition: number;
}

const fmtRel = (iso: string | null): string => {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
};

const STALE_DAYS = 180;

export default function AdminUniversities() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<UniversityRow[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [search, setSearch] = useState("");

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
    const [u, c] = await Promise.all([
      supabase
        .from("universities")
        .select("university_id, university_name, country, city, global_ranking, tuition_usd_per_year, cost_of_living_index, enriched_at, enrichment_metadata")
        .order("university_name"),
      supabase.from("university_enrichment_coverage_v" as never).select("*").maybeSingle(),
    ]);
    if (u.data) setRows(u.data as UniversityRow[]);
    if (c.data) setCoverage(c.data as CoverageRow);
  };

  const enrichOne = async (universityId: string, name: string) => {
    setEnrichingId(universityId);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        fields_updated: { university: number; admission_requirements: number; applications: number };
      }>("enrich-university", { body: { university_id: universityId } });
      if (error) throw new Error(error.message);
      const total =
        (data?.fields_updated?.university ?? 0)
        + (data?.fields_updated?.admission_requirements ?? 0)
        + (data?.fields_updated?.applications ?? 0);
      toast({
        title: total > 0 ? `Enriched ${name}` : `Scanned ${name} — nothing new`,
        description: total > 0
          ? `Filled ${total} field(s) across the row + its programs.`
          : "No high-confidence inferences this pass.",
      });
      await fetchAll();
    } catch (e) {
      toast({
        title: `Enrichment failed: ${name}`,
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setEnrichingId(null);
    }
  };

  const runBulkCron = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        candidates: number;
        enriched: number;
        fields_filled: { university: number; admission_requirements: number; applications: number };
        errors: string[];
      }>("enrich-universities-cron", { body: {} });
      if (error) throw new Error(error.message);
      const total = (data?.fields_filled?.university ?? 0)
        + (data?.fields_filled?.admission_requirements ?? 0)
        + (data?.fields_filled?.applications ?? 0);
      toast({
        title: `Cron pass complete`,
        description: `Enriched ${data?.enriched ?? 0} of ${data?.candidates ?? 0} candidates · ${total} fields filled · ${data?.errors?.length ?? 0} errors.`,
      });
      await fetchAll();
    } catch (e) {
      toast({
        title: "Cron run failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBulkRunning(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.university_name.toLowerCase().includes(q)
      || r.country.toLowerCase().includes(q)
      || r.city.toLowerCase().includes(q),
    );
  }, [rows, search]);

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
          <p className="text-sm text-muted-foreground mb-6">
            This surface is restricted to admin users.
          </p>
          <Button variant="outline" onClick={() => nav("/")}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-20">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-1">Admin · Data enrichment</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Universities</h1>
          </div>
          <Button variant="gold" onClick={runBulkCron} disabled={bulkRunning} className="gap-2">
            {bulkRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            {bulkRunning ? "Running cron pass…" : "Run cron pass (top 25 stale)"}
          </Button>
        </div>

        {/* Coverage banner */}
        {coverage && (
          <Card className="mb-5">
            <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Stat label="Universities total" value={coverage.total_universities.toString()} />
              <Stat label="Enriched ever" value={`${coverage.enriched_count}`} sub={`${coverage.total_universities ? Math.round(coverage.enriched_count / coverage.total_universities * 100) : 0}%`} />
              <Stat label="Enriched recently" value={coverage.enriched_recent_count.toString()} sub="last 180d" />
              <Stat label="Have ranking" value={coverage.have_ranking.toString()} />
              <Stat label="Have tuition" value={coverage.have_tuition.toString()} />
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative mb-5 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, country, city…"
            className="pl-10"
          />
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.map((u, i) => (
            <UniversityRow
              key={u.university_id}
              row={u}
              isEnriching={enrichingId === u.university_id}
              onEnrich={() => enrichOne(u.university_id, u.university_name)}
              index={i}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground">
              No universities match this filter.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{label}</p>
    <p className="font-heading font-bold text-xl tabular-nums tracking-tight leading-none text-foreground">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground/80 mt-1">{sub}</p>}
  </div>
);

const UniversityRow = ({
  row, isEnriching, onEnrich, index,
}: {
  row: UniversityRow;
  isEnriching: boolean;
  onEnrich: () => void;
  index: number;
}) => {
  // Field completeness — counts the 3 university-level fields we infer.
  const have = [
    row.global_ranking != null,
    row.tuition_usd_per_year != null,
    row.cost_of_living_index != null,
  ].filter(Boolean).length;
  const completion = Math.round((have / 3) * 100);

  // Staleness signal.
  const staleDays = row.enriched_at
    ? Math.floor((Date.now() - new Date(row.enriched_at).getTime()) / 86400_000)
    : null;
  const stale = staleDays === null || staleDays >= STALE_DAYS;

  // Surface the AI metadata if present so admins see what was inferred.
  const aiFields = row.enrichment_metadata
    ? Object.entries(row.enrichment_metadata).filter(([, v]) => v?.source === "ai")
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(0.02 * index, 0.4) }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <h3 className="font-heading font-semibold text-base text-foreground truncate">{row.university_name}</h3>
                <Badge variant="secondary" className="text-[10px]">{row.country}</Badge>
                <Badge variant="outline" className="text-[10px]">{row.city}</Badge>
                {stale ? (
                  <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-400/40">
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                    {staleDays === null ? "never enriched" : "stale"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-400/40">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                    fresh
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>completion <b className={`tabular-nums ${completion >= 66 ? "text-emerald-600" : completion >= 33 ? "text-amber-600" : "text-destructive"}`}>{completion}%</b></span>
                <span>last enriched <b className="text-foreground">{fmtRel(row.enriched_at)}</b></span>
                {row.global_ranking != null && (
                  <span>rank <b className="text-foreground tabular-nums">#{row.global_ranking}</b></span>
                )}
                {row.tuition_usd_per_year != null && (
                  <span>tuition <b className="text-foreground tabular-nums">${Math.round(row.tuition_usd_per_year).toLocaleString()}</b></span>
                )}
              </div>
              {aiFields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {aiFields.map(([field, meta]) => (
                    <span
                      key={field}
                      className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/60 border border-border text-muted-foreground"
                      title={`Inferred ${meta.inferred_at ?? ""}`}
                    >
                      {field} · {Math.round((meta.confidence ?? 0) * 100)}% conf
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={onEnrich}
              disabled={isEnriching}
            >
              {isEnriching
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              {isEnriching ? "Enriching…" : "Enrich now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
