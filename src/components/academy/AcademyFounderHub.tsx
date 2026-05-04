/* Academy founder hub — the actual content view of /academy that the
 * founder sees while the public still gets the waitlist landing. v0:
 *   · List published & upcoming workshops + office hours
 *   · Inline form to add a new entry (workshop / office hours / guide)
 *   · Edit / delete existing entries
 *
 * RLS-gated by public.is_topuni_founder() — non-founders making the
 * same query will get an empty list back from the database, so this
 * component is double-gated (client check + RLS). */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Video, MessageSquare, FileText, Calendar, ExternalLink,
  Loader2, Pencil, Trash2, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type WorkshopKind = "workshop" | "office_hours" | "guide";

interface Workshop {
  id: string;
  title: string;
  kind: WorkshopKind;
  summary: string | null;
  recording_url: string | null;
  join_url: string | null;
  scheduled_for: string | null;
  is_published: boolean;
  created_at: string;
}

const KIND_META: Record<WorkshopKind, { label: string; icon: typeof Video; tone: string }> = {
  workshop:     { label: "Workshop",     icon: Video,          tone: "text-gold-dark bg-gold/10 border-gold/30" },
  office_hours: { label: "Office hours", icon: MessageSquare,  tone: "text-primary bg-primary/10 border-primary/25" },
  guide:        { label: "Guide",        icon: FileText,       tone: "text-emerald-700 bg-emerald-50 border-emerald-300/40 dark:text-emerald-300 dark:bg-emerald-950/30" },
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
};

interface FormState {
  id?: string;
  title: string;
  kind: WorkshopKind;
  summary: string;
  recording_url: string;
  join_url: string;
  scheduled_for: string;
  is_published: boolean;
}

const EMPTY_FORM: FormState = {
  title: "", kind: "workshop", summary: "",
  recording_url: "", join_url: "", scheduled_for: "", is_published: false,
};

export const AcademyFounderHub = () => {
  const [items, setItems] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("academy_workshops")
      .select("*")
      .order("scheduled_for", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Couldn't load workshops");
    } else {
      setItems((data as Workshop[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const startNew = () => setEditing({ ...EMPTY_FORM });
  const startEdit = (w: Workshop) => setEditing({
    id: w.id,
    title: w.title,
    kind: w.kind,
    summary: w.summary ?? "",
    recording_url: w.recording_url ?? "",
    join_url: w.join_url ?? "",
    scheduled_for: w.scheduled_for ? w.scheduled_for.slice(0, 16) : "",
    is_published: w.is_published,
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    const payload = {
      title: editing.title.trim(),
      kind: editing.kind,
      summary: editing.summary.trim() || null,
      recording_url: editing.recording_url.trim() || null,
      join_url: editing.join_url.trim() || null,
      scheduled_for: editing.scheduled_for ? new Date(editing.scheduled_for).toISOString() : null,
      is_published: editing.is_published,
    };
    const { error } = editing.id
      ? await supabase.from("academy_workshops").update(payload).eq("id", editing.id)
      : await supabase.from("academy_workshops").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success(editing.id ? "Updated" : "Created");
    setEditing(null);
    void refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("academy_workshops").delete().eq("id", id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    toast.success("Deleted");
    void refresh();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-2">Founder hub · gated</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Academy workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Add workshops, office hours, and guides as you build the v0 cohort. Published items will surface here once Academy opens publicly; until then everything sits behind the waitlist.
          </p>
        </div>
        {!editing && (
          <Button variant="gold" onClick={startNew} className="gap-2">
            <Plus className="h-4 w-4" /> New entry
          </Button>
        )}
      </div>

      {editing && (
        <Card className="border-gold/30">
          <CardContent className="p-6 space-y-4">
            <div className="grid sm:grid-cols-[1fr_200px] gap-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Personal statement teardown — Cohort 1"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v as WorkshopKind })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="office_hours">Office hours</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Summary (optional)</Label>
              <Textarea
                value={editing.summary}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                rows={2}
                placeholder="One-paragraph description of what's covered"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Scheduled for</Label>
                <Input
                  type="datetime-local"
                  value={editing.scheduled_for}
                  onChange={(e) => setEditing({ ...editing, scheduled_for: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.is_published}
                    onCheckedChange={(checked) => setEditing({ ...editing, is_published: checked })}
                  />
                  <Label className="text-xs">Published</Label>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Live join URL</Label>
                <Input
                  value={editing.join_url}
                  onChange={(e) => setEditing({ ...editing, join_url: e.target.value })}
                  placeholder="https://us02web.zoom.us/..."
                />
              </div>
              <div>
                <Label className="text-xs">Recording URL</Label>
                <Input
                  value={editing.recording_url}
                  onChange={(e) => setEditing({ ...editing, recording_url: e.target.value })}
                  placeholder="https://www.loom.com/..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="gold" onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing.id ? "Save changes" : "Create entry"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading workshops…
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No workshops yet. Click <span className="font-medium text-foreground">New entry</span> to add the first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((w) => {
            const meta = KIND_META[w.kind];
            const Icon = meta.icon;
            const when = formatDateTime(w.scheduled_for);
            return (
              <motion.li
                key={w.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`inline-flex items-center justify-center h-9 w-9 rounded-lg border shrink-0 ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${meta.tone.split(" ")[0]}`}>
                          {meta.label}
                        </span>
                        {!w.is_published && (
                          <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            Draft
                          </span>
                        )}
                        {when && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {when}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading font-semibold text-base text-foreground tracking-tight leading-tight mt-1">
                        {w.title}
                      </h3>
                      {w.summary && (
                        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{w.summary}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {w.join_url && (
                          <a href={w.join_url} target="_blank" rel="noopener noreferrer" className="text-gold-dark hover:text-gold underline-offset-2 hover:underline inline-flex items-center gap-1">
                            Join live <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {w.recording_url && (
                          <a href={w.recording_url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-gold-dark underline-offset-2 hover:underline inline-flex items-center gap-1">
                            Recording <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(w)}
                      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void remove(w.id)}
                      className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
