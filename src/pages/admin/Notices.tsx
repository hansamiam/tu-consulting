// /admin/notices — ad-hoc broadcast composer + history.
//
// Composer at the top: subject + body (markdown) + kind + segment.
// Hits broadcast-to-members, which logs to broadcast_notices and fans
// out via the email queue. History list below shows recent broadcasts
// with audience size + fan-out count.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Kind = "emergency" | "workshop" | "announcement" | "product";
type Segment = "all_members" | "needs_funding" | "english_weak";

interface NoticeRow {
  id: string;
  kind: Kind;
  subject: string;
  segment: Segment;
  created_at: string;
  sent_at: string | null;
  fan_out_count: number;
  error: string | null;
}

const Notices = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<NoticeRow[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Kind>("announcement");
  const [segment, setSegment] = useState<Segment>("all_members");
  const [sending, setSending] = useState(false);

  async function loadHistory() {
    const { data, error } = await supabase
      .from("broadcast_notices")
      .select("id,kind,subject,segment,created_at,sent_at,fan_out_count,error")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast({ title: "Failed to load history", description: error.message, variant: "destructive" });
      return;
    }
    setHistory((data ?? []) as NoticeRow[]);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id, _role: "admin",
      });
      if (!isAdmin) { navigate("/"); return; }
      await loadHistory();
      setLoading(false);
    })();
  }, [navigate]);

  async function sendBroadcast() {
    if (subject.trim().length < 3 || body.trim().length < 10) {
      toast({ title: "Add a subject + body", description: "Subject ≥ 3 chars, body ≥ 10 chars.", variant: "destructive" });
      return;
    }
    if (!confirm(`Send to ${segment} now? This will fan out emails immediately.`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-to-members", {
        body: { subject, body_markdown: body, kind, segment },
      });
      if (error) throw new Error(error.message);
      const queued = (data as { queued?: number })?.queued ?? 0;
      toast({ title: "Broadcast queued", description: `Fanned out to ${queued} members.` });
      setSubject(""); setBody("");
      await loadHistory();
    } catch (err) {
      toast({ title: "Broadcast failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-5 py-8 space-y-4">
        <header>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold">Admin</p>
          <h1 className="font-heading text-2xl font-bold">Broadcast notices</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Ad-hoc emails to a segment. Logged to broadcast_notices; rendered via the announcement-generic template (approval-gated).
          </p>
        </header>

        <Card>
          <CardHeader><CardTitle className="text-sm">Compose</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="A schedule change for Thursday's workshop"
                className="w-full rounded-md border border-border/70 bg-background p-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Body (markdown)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder={"Hi members,\n\nThis Thursday's workshop has moved from 7pm to 8pm Almaty time.\n\n- New time: 8pm Almaty\n- Same Zoom link, same topic"}
                className="w-full rounded-md border border-border/70 bg-background p-2 text-sm font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Kind</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as Kind)}
                  className="rounded-md border border-border/70 bg-background p-1.5 text-sm"
                >
                  <option value="announcement">Announcement</option>
                  <option value="workshop">Workshop</option>
                  <option value="emergency">Emergency</option>
                  <option value="product">Product</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Segment</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as Segment)}
                  className="rounded-md border border-border/70 bg-background p-1.5 text-sm"
                >
                  <option value="all_members">All members</option>
                  <option value="needs_funding">Needs funding</option>
                  <option value="english_weak">English weak</option>
                </select>
              </div>
            </div>
            <Button onClick={sendBroadcast} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              Send broadcast
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Recent broadcasts</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((n) => (
                  <li key={n.id} className="rounded-md border border-border/70 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{n.subject}</span>
                      <span className="text-muted-foreground">
                        {n.kind} · {n.segment} · {n.fan_out_count} sent
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}{n.sent_at ? "" : " · queued"}
                      {n.error ? ` · ${n.error}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Notices;
