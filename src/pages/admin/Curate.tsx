/**
 * /admin/curate — manual approval spreadsheet for the scholarship catalog.
 *
 * 2026-05-19: user nuked the catalog (everything → inactive) and wants
 * to approve each row 1-by-1. This page is the workbench: dense table
 * of every scholarship, click "Make active" to flip lifecycle_status,
 * click "Hide" to flip back. Search + status filter on top. Link icon
 * opens the official_url in a new tab so you can sanity-check the
 * source before approving.
 *
 * Admin-only (has_role check). RLS already enforces admin-only writes
 * on scholarships, so the route gate is belt-and-braces.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, EyeOff, Search, RefreshCw, Loader2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Row {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  application_deadline: string | null;
  lifecycle_status: string | null;
  verification_status: string | null;
  official_url: string | null;
  source_url: string | null;
  estimated_total_value_usd: number | null;
  target_degree_level: string[] | null;
  created_at: string | null;
  data_source: string | null;
}

/* Mirrors the three server-side filters in src/pages/Discover.tsx
   (lifecycle + verification + future deadline). Kept in sync by hand —
   if the Discover query changes, update this predicate too. */
const isDiscoverVisible = (r: Row): boolean => {
  const today = new Date().toISOString().slice(0, 10);
  const lifecycleOk =
    r.lifecycle_status === "active" ||
    r.lifecycle_status === "reopens_annually" ||
    r.lifecycle_status === null;
  const verifOk =
    r.verification_status === null ||
    r.verification_status === "verified" ||
    r.verification_status === "stale" ||
    r.verification_status === "pending";
  const deadlineOk =
    r.application_deadline !== null && r.application_deadline >= today;
  return lifecycleOk && verifOk && deadlineOk;
};

const fmtRelative = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 2) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const hostnameFrom = (url: string | null): string => {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url.slice(0, 30); }
};

type StatusFilter = "all" | "inactive" | "active" | "reopens_annually" | "superseded" | "closed_archived";
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "inactive", label: "Hidden" },
  { key: "active", label: "Active" },
  { key: "reopens_annually", label: "Reopens annually" },
  { key: "superseded", label: "Superseded" },
  { key: "closed_archived", label: "Archived" },
];

type VerifFilter = "any" | "verified" | "stale" | "pending" | "broken" | "null";
const VERIF_FILTERS: { key: VerifFilter; label: string }[] = [
  { key: "any", label: "Any verif" },
  { key: "verified", label: "Verified" },
  { key: "stale", label: "Stale" },
  { key: "pending", label: "Pending" },
  { key: "broken", label: "Broken" },
  { key: "null", label: "Unverified" },
];

type VisibilityFilter = "any" | "visible" | "hidden_from_discover";
const VISIBILITY_FILTERS: { key: VisibilityFilter; label: string }[] = [
  { key: "any", label: "Any visibility" },
  { key: "visible", label: "On Discover" },
  { key: "hidden_from_discover", label: "Not on Discover" },
];

type SortKey =
  | "scraped_new"
  | "scraped_old"
  | "deadline_soon"
  | "deadline_far"
  | "name_az"
  | "value_high";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "scraped_new", label: "Newest scraped" },
  { key: "scraped_old", label: "Oldest scraped" },
  { key: "deadline_soon", label: "Deadline soonest" },
  { key: "deadline_far", label: "Deadline farthest" },
  { key: "name_az", label: "Name A→Z" },
  { key: "value_high", label: "Award value (high→low)" },
];

const fmtDeadline = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const days = Math.ceil((d.getTime() - now) / 86_400_000);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (days < 0) return `${date} (passed)`;
  if (days <= 14) return `${date} (${days}d)`;
  return date;
};

const statusBadgeClass = (status: string | null): string => {
  switch (status) {
    case "active": return "bg-success/15 text-success border-success/40";
    case "reopens_annually": return "bg-gold/15 text-gold-dark border-gold/40";
    case "inactive": return "bg-muted text-muted-foreground border-border";
    case "superseded": return "bg-amber-500/15 text-amber-700 border-amber-500/40";
    case "closed_archived": return "bg-destructive/10 text-destructive border-destructive/30";
    case "closed_recent": return "bg-rose-500/10 text-rose-700 border-rose-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const Curate = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [verifFilter, setVerifFilter] = useState<VerifFilter>("any");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("any");
  const [sortKey, setSortKey] = useState<SortKey>("scraped_new");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scholarships")
      .select(
        "scholarship_id, scholarship_name, provider_name, host_country, application_deadline, lifecycle_status, verification_status, official_url, source_url, estimated_total_value_usd, target_degree_level, created_at, data_source"
      )
      .order("application_deadline", { ascending: true, nullsFirst: false })
      .limit(2000);
    if (error) {
      toast({ title: "Couldn't load catalog", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as unknown as Row[]);
    }
    setLoading(false);
  };

  // Admin gate
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) { navigate("/"); return; }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const filtered = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();

    // A non-empty search overrides the status filter — "find me this thing"
    // shouldn't be silently scoped to one lifecycle bucket. (The Numerix
    // trap: searching while filtered to Hidden hid the live duplicate.)
    if (!q && statusFilter !== "all") {
      list = list.filter((r) => r.lifecycle_status === statusFilter);
    }
    if (verifFilter !== "any") {
      list = list.filter((r) =>
        verifFilter === "null"
          ? r.verification_status === null
          : r.verification_status === verifFilter,
      );
    }
    if (visibilityFilter !== "any") {
      list = list.filter((r) => {
        const visible = isDiscoverVisible(r);
        return visibilityFilter === "visible" ? visible : !visible;
      });
    }
    if (q) {
      list = list.filter((r) => {
        const hay = `${r.scholarship_name} ${r.provider_name ?? ""} ${r.host_country ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...list];
    const farFuture = "9999-12-31";
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "scraped_new":
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        case "scraped_old":
          return (a.created_at ?? "").localeCompare(b.created_at ?? "");
        case "deadline_soon":
          return (a.application_deadline ?? farFuture).localeCompare(b.application_deadline ?? farFuture);
        case "deadline_far":
          return (b.application_deadline ?? "").localeCompare(a.application_deadline ?? "");
        case "name_az":
          return a.scholarship_name.localeCompare(b.scholarship_name);
        case "value_high":
          return (b.estimated_total_value_usd ?? 0) - (a.estimated_total_value_usd ?? 0);
        default:
          return 0;
      }
    });
    return sorted;
  }, [rows, search, statusFilter, verifFilter, visibilityFilter, sortKey]);

  const discoverVisibleCount = useMemo(
    () => rows.filter(isDiscoverVisible).length,
    [rows],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      const k = r.lifecycle_status ?? "null";
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [rows]);

  const flip = async (id: string, to: "active" | "inactive") => {
    setPending((p) => ({ ...p, [id]: true }));
    const { error } = await supabase
      .from("scholarships")
      .update({ lifecycle_status: to, updated_at: new Date().toISOString() })
      .eq("scholarship_id", id);
    setPending((p) => { const c = { ...p }; delete c[id]; return c; });
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    // Patch local state so we don't refetch every click
    setRows((rs) => rs.map((r) => r.scholarship_id === id ? { ...r, lifecycle_status: to } : r));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-baseline justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Catalog curation</h1>
            <p className="text-muted-foreground text-sm mt-1">
              All scholarships. Click <span className="font-semibold text-success">Make active</span> to surface a row on /discover.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`text-[11.5px] uppercase tracking-[0.16em] px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f.label}
              {f.key !== "all" && (
                <span className="ml-1.5 text-[10px] opacity-70">{counts[f.key] ?? 0}</span>
              )}
              {f.key === "all" && (
                <span className="ml-1.5 text-[10px] opacity-70">{rows.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {VERIF_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setVerifFilter(f.key)}
              className={`text-[11px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border transition-colors ${
                verifFilter === f.key
                  ? "bg-foreground/90 text-background border-foreground/90"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {VISIBILITY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setVisibilityFilter(f.key)}
              className={`text-[11px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border transition-colors ${
                visibilityFilter === f.key
                  ? "bg-foreground/90 text-background border-foreground/90"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f.label}
              {f.key === "visible" && (
                <span className="ml-1.5 text-[10px] opacity-70">{discoverVisibleCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-[1fr_220px] gap-2 mb-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, provider, or country…"
              className="pl-9"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-md border border-border bg-card text-sm px-3 text-foreground"
            aria-label="Sort by"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{`Sort: ${s.label}`}</option>
            ))}
          </select>
        </div>

        {search.trim() && statusFilter !== "all" && (
          <p className="text-xs text-muted-foreground mb-3">
            Searching across <span className="text-foreground">all statuses</span> — the "{FILTERS.find((f) => f.key === statusFilter)?.label}" tab is suspended while a search is active.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} rows`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3" />
                Loading catalog…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No rows match. Try clearing the search or filter.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Provider</th>
                      <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Country</th>
                      <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Deadline</th>
                      <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Source</th>
                      <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Scraped</th>
                      <th className="py-2 px-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="py-2 pl-3 font-medium text-[11px] uppercase tracking-wider text-muted-foreground text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const isActive = r.lifecycle_status === "active" || r.lifecycle_status === "reopens_annually";
                      const isPending = pending[r.scholarship_id];
                      return (
                        <tr key={r.scholarship_id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 pr-3 max-w-[320px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate font-medium text-foreground">{r.scholarship_name}</span>
                              {r.official_url && (
                                <a
                                  href={r.official_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-muted-foreground hover:text-gold-dark transition-colors"
                                  title={r.official_url}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-foreground/80 max-w-[200px] truncate" title={r.provider_name ?? ""}>
                            {r.provider_name ?? "—"}
                          </td>
                          <td className="py-2.5 px-3 text-foreground/80 max-w-[140px] truncate" title={r.host_country ?? ""}>
                            {r.host_country ?? "—"}
                          </td>
                          <td className="py-2.5 px-3 text-foreground/80 whitespace-nowrap">
                            {fmtDeadline(r.application_deadline)}
                          </td>
                          <td className="py-2.5 px-3 max-w-[180px]">
                            {r.source_url ? (
                              <a
                                href={r.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-gold-dark transition-colors text-[12.5px] truncate max-w-full"
                                title={r.source_url}
                              >
                                <span className="truncate">{hostnameFrom(r.source_url)}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground/60 text-[12.5px]">
                                {r.data_source === "hand_curated" ? "manual" : "—"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-[12.5px] whitespace-nowrap" title={r.created_at ?? ""}>
                            {fmtRelative(r.created_at)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={`text-[10.5px] uppercase tracking-wider ${statusBadgeClass(r.lifecycle_status)}`}>
                                {r.lifecycle_status ?? "null"}
                              </Badge>
                              {isDiscoverVisible(r) && (
                                <span
                                  title="Passes all Discover filters — visible to users right now"
                                  className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-success border border-success/40 bg-success/10 rounded-full px-1.5 py-0.5"
                                >
                                  <Eye className="h-2.5 w-2.5" /> on discover
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                            {isActive ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => flip(r.scholarship_id, "inactive")}
                                disabled={isPending}
                                className="gap-1.5 text-muted-foreground hover:text-destructive h-7 px-2"
                              >
                                {isPending
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <EyeOff className="h-3 w-3" />}
                                Hide
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => flip(r.scholarship_id, "active")}
                                disabled={isPending}
                                className="gap-1.5 text-success border-success/40 hover:bg-success/10 h-7 px-2.5"
                              >
                                {isPending
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <CheckCircle2 className="h-3 w-3" />}
                                Make active
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Curate;
