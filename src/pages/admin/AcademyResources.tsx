/**
 * /admin/academy/resources — upload + manage the Academy resource library.
 *
 * Backing table: public.academy_resources (migration
 * 20260520150000_academy_resources.sql). Files live in storage bucket
 * 'academy-resources' (private). Both gated by has_role admin.
 *
 * The page is intentionally minimal: an upload form on the left, a
 * list of existing rows on the right. Members get the polished surface
 * — admins get the workshop. We can dress this up after we know what
 * categories + filetypes we're actually shipping.
 *
 * Two upload modes:
 *   · File   — direct upload to the storage bucket, mints a
 *              file_path (uuid + sanitized filename).
 *   · Link   — external_url only (YouTube, Notion doc, Google Drive).
 *              Useful as long as the upstream is also gated.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Upload, ExternalLink, FileText, Link as LinkIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ResourceRow {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  file_path: string | null;
  external_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  category: string | null;
  language: "en" | "ru" | string;
  access_tier: "free" | "member" | string;
  is_published: boolean;
  sort_order: number;
}

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);

const fmtBytes = (n: number | null) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const AcademyResources = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ─── New-resource form state ────────────────────────────────────
  const [mode, setMode] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState<"en" | "ru">("en");
  const [accessTier, setAccessTier] = useState<"free" | "member">("member");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("academy_resources" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data ?? []) as unknown as ResourceRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data: role } = await supabase.from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      const admin = !!role;
      setIsAdmin(admin);
      if (admin) await fetchAll();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setCategory("");
    setLanguage("en"); setAccessTier("member");
    setFile(null); setExternalUrl("");
    setMode("file");
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (mode === "file" && !file) {
      toast({ title: "Choose a file or switch to link mode", variant: "destructive" });
      return;
    }
    if (mode === "link" && !externalUrl.trim()) {
      toast({ title: "Paste a URL", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let filePath: string | null = null;
      let fileSizeBytes: number | null = null;
      let mimeType: string | null = null;

      if (mode === "file" && file) {
        const safe = sanitizeFilename(file.name);
        filePath = `${crypto.randomUUID()}/${safe}`;
        const { error: uploadErr } = await supabase.storage
          .from("academy-resources")
          .upload(filePath, file, {
            cacheControl: "3600",
            contentType: file.type || undefined,
            upsert: false,
          });
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
        fileSizeBytes = file.size;
        mimeType = file.type || null;
      }

      const { error: insertErr } = await supabase
        .from("academy_resources" as never)
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          language,
          access_tier: accessTier,
          file_path: filePath,
          external_url: mode === "link" ? externalUrl.trim() : null,
          file_size_bytes: fileSizeBytes,
          mime_type: mimeType,
          is_published: false,
          sort_order: 0,
        } as never);

      if (insertErr) throw new Error(insertErr.message);

      toast({ title: "Resource added", description: "Toggle Publish to show it to members." });
      resetForm();
      await fetchAll();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (row: ResourceRow) => {
    setBusyId(row.id);
    const { error } = await supabase
      .from("academy_resources" as never)
      .update({ is_published: !row.is_published } as never)
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await fetchAll();
  };

  const removeRow = async (row: ResourceRow) => {
    if (!confirm(`Delete "${row.title}"? This also removes the file from storage.`)) return;
    setBusyId(row.id);
    // Storage delete first — if the row delete succeeded but storage hadn't,
    // we'd orphan the file. Reverse order means a failed row delete leaves
    // metadata pointing at a missing object, which is louder + easier to spot.
    if (row.file_path) {
      const { error: rmErr } = await supabase.storage
        .from("academy-resources")
        .remove([row.file_path]);
      if (rmErr) {
        setBusyId(null);
        toast({ title: "Storage delete failed", description: rmErr.message, variant: "destructive" });
        return;
      }
    }
    const { error } = await supabase
      .from("academy_resources" as never)
      .delete()
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Row delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Resource removed" });
    await fetchAll();
  };

  // Preview = mint a temporary signed URL via service-side signing
  // (admin has direct storage bucket access via RLS).
  const previewFile = async (row: ResourceRow) => {
    if (row.external_url) {
      window.open(row.external_url, "_blank");
      return;
    }
    if (!row.file_path) return;
    setBusyId(row.id);
    const { data, error } = await supabase.storage
      .from("academy-resources")
      .createSignedUrl(row.file_path, 300);
    setBusyId(null);
    if (error || !data?.signedUrl) {
      toast({ title: "Preview failed", description: error?.message ?? "no URL", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language="en" />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <p className="text-destructive">Admin access required.</p>
          <Button variant="outline" className="mt-4" onClick={() => nav("/")}>Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Academy resources</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload files or attach external links. Members see <span className="font-semibold">published</span> rows under /academy.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_2fr] gap-8">
          {/* ─── Upload form ────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-4 w-4" /> Add a resource
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("file")}
                  className="flex-1"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> File
                </Button>
                <Button
                  type="button"
                  variant={mode === "link" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("link")}
                  className="flex-1"
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> External link
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs uppercase tracking-wider font-medium">Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. UK personal statement template" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs uppercase tracking-wider font-medium">Description</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="One-line summary shown under the title." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs uppercase tracking-wider font-medium">Category</Label>
                  <Input id="category" value={category} onChange={e => setCategory(e.target.value)} placeholder="Essays, Funding, Visa…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider font-medium">Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "ru")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Russian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-medium">Access</Label>
                <Select value={accessTier} onValueChange={(v) => setAccessTier(v as "free" | "member")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Members only</SelectItem>
                    <SelectItem value="free">Free (any signed-in user)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "file" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="file" className="text-xs uppercase tracking-wider font-medium">File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      {file.name} · {fmtBytes(file.size)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="external" className="text-xs uppercase tracking-wider font-medium">URL</Label>
                  <Input
                    id="external"
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              )}

              <Button onClick={onSubmit} disabled={submitting} className="w-full">
                {submitting ? "Saving…" : "Save (unpublished)"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Saved as unpublished. Flip the Publish toggle in the list to make it live.
              </p>
            </CardContent>
          </Card>

          {/* ─── Existing list ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Library ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No resources yet. Upload your first one on the left.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((r) => (
                    <li key={r.id} className="py-4 grid grid-cols-[1fr_auto] gap-4 items-start">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-[15px] leading-snug truncate">{r.title}</h3>
                          <span className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${
                            r.access_tier === "member" ? "bg-gold/15 text-gold-dark" : "bg-emerald-100 text-emerald-700"
                          }`}>{r.access_tier}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.language}</span>
                          {r.category && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">· {r.category}</span>}
                        </div>
                        {r.description && (
                          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{r.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span>{fmtDate(r.created_at)}</span>
                          {r.file_path && <span>{fmtBytes(r.file_size_bytes)}</span>}
                          {r.mime_type && <span>{r.mime_type}</span>}
                          {r.external_url && <span className="inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> external</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.is_published}
                            disabled={busyId === r.id}
                            onCheckedChange={() => togglePublish(r)}
                            aria-label="Publish toggle"
                          />
                          <span className="text-[11px] text-muted-foreground">{r.is_published ? "Live" : "Draft"}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => previewFile(r)} disabled={busyId === r.id}>
                            Preview
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => removeRow(r)} disabled={busyId === r.id}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AcademyResources;
