/**
 * /admin/waitlist — viewer for the public waitlist signups.
 *
 * Backed by public.waitlist_emails (id, email, source, created_at).
 * RLS: anon-insert allowed, SELECT gated to admins via
 * has_role(auth.uid(), 'admin'). The page surfaces the inbox: list
 * by created_at desc, filter by source bucket, copy-emails-as-csv
 * for piping into a mail blast tool when doors open.
 *
 * Sources seen so far: 'index_hero' (legacy default), 'academy_waitlist'
 * (the /academy landing form). New sources add themselves to the
 * filter chip rail automatically because we derive the chip list from
 * distinct values in the fetched rows.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, Inbox } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";

interface WaitlistRow {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
}

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, {
  month: "short", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit",
});

const Waitlist = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Admin gate. Non-admins get bounced to the home page.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id, _role: "admin",
      });
      if (!isAdmin) { navigate("/"); return; }

      const { data, error } = await supabase
        .from("waitlist_emails")
        // Source column was added in a recent ALTER; the generated
        // types file hasn't been regenerated yet (npm run gen:types).
        // Cast through unknown so the runtime read still works.
        .select("id, email, source, created_at" as never)
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Couldn't load waitlist", description: error.message, variant: "destructive" });
      } else {
        setRows((data ?? []) as unknown as WaitlistRow[]);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.source) set.add(r.source); });
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    if (sourceFilter === "all") return rows;
    return rows.filter((r) => (r.source ?? "") === sourceFilter);
  }, [rows, sourceFilter]);

  const copyEmailsCsv = async () => {
    const csv = filtered.map((r) => r.email).join(", ");
    try {
      await navigator.clipboard.writeText(csv);
      toast({ title: `Copied ${filtered.length} email(s) to clipboard` });
    } catch {
      toast({ title: "Couldn't copy to clipboard", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Waitlist</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Email signups from public landing pages. Admin-only view.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={copyEmailsCsv} disabled={filtered.length === 0} className="gap-2">
            <Copy className="h-3.5 w-3.5" />
            Copy {filtered.length} as CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`text-[11.5px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border transition-colors ${
                sourceFilter === s
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
              {s !== "all" && (
                <span className="ml-2 text-[10px] opacity-70">
                  {rows.filter((r) => (r.source ?? "") === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-4 w-4 text-gold-dark" />
              {loading ? "Loading…" : `${filtered.length} signup${filtered.length === 1 ? "" : "s"}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading waitlist…</div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Mail className="h-8 w-8 text-muted-foreground/40" />}
                title="No signups yet"
                description="Once visitors hit the waitlist on /academy (or other landing pages), they'll appear here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((r) => (
                  <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-foreground truncate">{r.email}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{fmt(r.created_at)}</p>
                    </div>
                    {r.source && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {r.source.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Waitlist;
