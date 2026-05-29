// /admin/segments — live segment counts driven by the same SQL paths
// broadcast-to-members uses. The launch-month minimum: a count per
// pre-defined segment + a CSV export of that segment's emails. No
// member_tags cron yet — when we need fancier segmentation we add it.
//
// Segments mirror broadcast-to-members.ts.resolveAudience exactly so
// the count here = the audience size of a broadcast against the same
// segment slug. That parity is the whole point: don't surprise the
// founder with "I clicked send and only 8 got it but the dashboard
// said 11."

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type SegmentKey = "all_members" | "needs_funding" | "english_weak" | "english_strong" | "masters_track" | "bachelor_track";

const SEGMENT_LABEL: Record<SegmentKey, string> = {
  all_members:    "All paying members",
  needs_funding:  "Needs funding (full scholarship only)",
  english_weak:   "English weak (< 6.5 IELTS)",
  english_strong: "English strong (≥ 7.5 IELTS)",
  masters_track:  "Masters / PhD track",
  bachelor_track: "Bachelor track",
};

interface Row { email: string; user_id: string | null; }

const Segments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Row[]>([]);
  const [profilesByUser, setProfilesByUser] = useState<Record<string, {
    english_score: number | null;
    ability_to_pay: string | null;
    target_degree: string | null;
  }>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id, _role: "admin",
      });
      if (!isAdmin) { navigate("/"); return; }

      const { data: subs, error } = await supabase
        .from("subscriptions")
        .select("email, user_id")
        .in("status", ["active", "trialing"]);
      if (error) {
        toast({ title: "Failed to load subscriptions", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const rows = ((subs ?? []).filter((r) => !!r.email) as Row[]);
      setMembers(rows);

      const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
      if (userIds.length > 0) {
        // deno-lint-ignore no-explicit-any
        const { data: profRows } = await (supabase as any)
          .from("student_profiles")
          .select("user_id, english_score, ability_to_pay, target_degree")
          .in("user_id", userIds);
        const map: Record<string, { english_score: number | null; ability_to_pay: string | null; target_degree: string | null; }> = {};
        (profRows ?? []).forEach((p: { user_id: string; english_score: number | null; ability_to_pay: string | null; target_degree: string | null; }) => {
          map[p.user_id] = { english_score: p.english_score, ability_to_pay: p.ability_to_pay, target_degree: p.target_degree };
        });
        setProfilesByUser(map);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const segmentRows = useMemo(() => {
    function pick(key: SegmentKey): Row[] {
      if (key === "all_members") return members;
      return members.filter((m) => {
        if (!m.user_id) return false;
        const p = profilesByUser[m.user_id];
        if (!p) return false;
        if (key === "needs_funding")  return p.ability_to_pay === "full_scholarship_only";
        if (key === "english_weak")   return typeof p.english_score === "number" && p.english_score < 6.5;
        if (key === "english_strong") return typeof p.english_score === "number" && p.english_score >= 7.5;
        if (key === "masters_track")  return p.target_degree === "masters" || p.target_degree === "phd";
        if (key === "bachelor_track") return p.target_degree === "bachelors";
        return false;
      });
    }
    const out: Record<SegmentKey, Row[]> = {
      all_members: pick("all_members"),
      needs_funding: pick("needs_funding"),
      english_weak: pick("english_weak"),
      english_strong: pick("english_strong"),
      masters_track: pick("masters_track"),
      bachelor_track: pick("bachelor_track"),
    };
    return out;
  }, [members, profilesByUser]);

  function downloadCsv(key: SegmentKey) {
    const rows = segmentRows[key];
    const lines = ["email"];
    for (const r of rows) lines.push(`"${r.email.replaceAll('"', '""')}"`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topuni-segment-${key}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-5 py-8 space-y-4">
        <header>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold">Admin</p>
          <h1 className="font-heading text-2xl font-bold">Segments</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Live counts. Segment slugs match broadcast-to-members so the count here equals the audience size of a broadcast against the same segment.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-2">
            {(Object.keys(SEGMENT_LABEL) as SegmentKey[]).map((key) => {
              const rows = segmentRows[key];
              return (
                <Card key={key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gold-dark" />
                        {SEGMENT_LABEL[key]}
                      </span>
                      <span className="text-muted-foreground font-normal">{rows.length}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={rows.length === 0}
                      onClick={() => downloadCsv(key)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Segments;
