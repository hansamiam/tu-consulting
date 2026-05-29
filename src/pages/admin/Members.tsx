// /admin/members — paying-members directory + CSV export.
//
// Reads from the subscriptions table (filter status in active/trialing),
// joins client-side to student_profiles for the profile fields the
// founder needs to pull a list against (e.g., "all members who marked
// 'full scholarship only' in the wizard"). Single CSV button at the
// top exports the current filtered view.
//
// Why join client-side rather than a view: the segments dashboard
// (/admin/segments) handles the canonical SQL segmentation work — this
// page is the friendly directory. Keeping it client-side dodges yet
// another migration and avoids RLS surprises on a view definition.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SubscriptionRow {
  user_id: string | null;
  email: string;
  tier: string;
  status: string;
  billing_interval: string | null;
  current_period_end: string | null;
  is_founding_member: boolean;
  founding_member_number: number | null;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  country: string | null;
  english_score: number | null;
  ability_to_pay: string | null;
  target_degree: string | null;
}

const Members = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id, _role: "admin",
      });
      if (!isAdmin) { navigate("/"); return; }

      const { data: subRows, error: subErr } = await supabase
        .from("subscriptions")
        .select("user_id,email,tier,status,billing_interval,current_period_end,is_founding_member,founding_member_number,created_at")
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false });
      if (subErr) {
        toast({ title: "Failed to load members", description: subErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      setSubs((subRows ?? []) as SubscriptionRow[]);

      const userIds = (subRows ?? []).map((r) => r.user_id).filter(Boolean) as string[];
      if (userIds.length > 0) {
        // Cast through any until gen:types refresh — ability_to_pay /
        // english_score columns are added by the lifecycle migration
        // landing alongside this UI; types regen happens post-deploy.
        // deno-lint-ignore no-explicit-any
        const { data: profRows } = await (supabase as any)
          .from("student_profiles")
          .select("user_id,country,english_score,ability_to_pay,target_degree")
          .in("user_id", userIds);
        const map: Record<string, ProfileRow> = {};
        (profRows ?? []).forEach((p: ProfileRow) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const csv = useMemo(() => {
    const header = [
      "email", "tier", "status", "billing_interval", "current_period_end",
      "founding_member_number", "country", "target_degree", "english_score",
      "ability_to_pay", "joined_at",
    ];
    const lines = [header.join(",")];
    for (const s of subs) {
      const p = s.user_id ? profiles[s.user_id] : undefined;
      const row = [
        s.email,
        s.tier,
        s.status,
        s.billing_interval ?? "",
        s.current_period_end ?? "",
        s.founding_member_number ?? "",
        p?.country ?? "",
        p?.target_degree ?? "",
        p?.english_score ?? "",
        p?.ability_to_pay ?? "",
        s.created_at,
      ].map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`);
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }, [subs, profiles]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topuni-members-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-6xl mx-auto px-5 py-8 space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold">Admin</p>
            <h1 className="font-heading text-2xl font-bold">Members ({subs.length})</h1>
          </div>
          <Button onClick={downloadCsv} disabled={loading || subs.length === 0}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </header>

        <Card>
          <CardHeader><CardTitle className="text-sm">Active + trialing</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : subs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active members yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Tier</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Interval</th>
                      <th className="py-2 pr-3">Renew</th>
                      <th className="py-2 pr-3">Country</th>
                      <th className="py-2 pr-3">Degree</th>
                      <th className="py-2 pr-3">English</th>
                      <th className="py-2 pr-3">Pay</th>
                      <th className="py-2 pr-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map((s, i) => {
                      const p = s.user_id ? profiles[s.user_id] : undefined;
                      return (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-3 font-medium">{s.email}</td>
                          <td className="py-2 pr-3">{s.tier}</td>
                          <td className="py-2 pr-3">{s.status}</td>
                          <td className="py-2 pr-3">{s.billing_interval ?? "—"}</td>
                          <td className="py-2 pr-3">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}</td>
                          <td className="py-2 pr-3">{p?.country ?? "—"}</td>
                          <td className="py-2 pr-3">{p?.target_degree ?? "—"}</td>
                          <td className="py-2 pr-3">{p?.english_score ?? "—"}</td>
                          <td className="py-2 pr-3">{p?.ability_to_pay ?? "—"}</td>
                          <td className="py-2 pr-3">{new Date(s.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Members;
