/**
 * /admin/journal — write + manage TopUni Journal articles.
 *
 * Backing table: public.journal_entries (migration
 * 20260528160000_journal_entries.sql). Admin-gated via has_role.
 *
 * One-pane editor + list. Same pattern as /admin/academy/resources but
 * with content-as-paragraph-array because BlogArticle.tsx already
 * renders that shape (split on \n\n for new paragraph; **bold** stays
 * literal). Saves as a Postgres text[] so the public render path can
 * stay the same .map((p) => …) it uses for the static articles.
 *
 * Workflow:
 *   · Click "New" → blank editor on the left.
 *   · Click a row in the list → editor loads that row for inline edit.
 *   · Save (unpublished) or Save & publish.
 *   · Publish toggle on each row flips live/draft without opening it.
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
import { Trash2, Pencil, Plus, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface JournalRow {
  id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  slug: string;
  language: "en" | "ru" | string;
  title: string;
  excerpt: string | null;
  category: string | null;
  read_time: string | null;
  hero_image_url: string | null;
  content: string[];
  is_published: boolean;
  sort_order: number;
}

const slugify = (s: string) =>
  s.toLowerCase()
   .trim()
   .replace(/[^a-z0-9\s-]/g, "")
   .replace(/\s+/g, "-")
   .replace(/-+/g, "-")
   .replace(/^-+|-+$/g, "")
   .slice(0, 80);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

// Body editor uses one big textarea. Paragraphs separated by blank
// line (two \n). Keeps the **bold** convention BlogArticle.tsx already
// parses. Split/join transparently here.
const bodyToText = (paragraphs: string[]) => paragraphs.join("\n\n");
const textToBody = (raw: string) =>
  raw.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);

const JournalEntries = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Editor state — `editingId` null = creating new, else editing that row.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [readTime, setReadTime] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [language, setLanguage] = useState<"en" | "ru">("en");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("journal_entries" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data ?? []) as unknown as JournalRow[]);
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
    setEditingId(null);
    setTitle(""); setSlug(""); setSlugTouched(false);
    setExcerpt(""); setCategory(""); setReadTime("");
    setHeroImageUrl(""); setLanguage("en"); setBody("");
  };

  const loadIntoEditor = (row: JournalRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setSlug(row.slug);
    setSlugTouched(true); // don't auto-overwrite a known-good slug
    setExcerpt(row.excerpt ?? "");
    setCategory(row.category ?? "");
    setReadTime(row.read_time ?? "");
    setHeroImageUrl(row.hero_image_url ?? "");
    setLanguage((row.language as "en" | "ru") ?? "en");
    setBody(bodyToText(row.content ?? []));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const onSave = async (publish: boolean) => {
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (!slug.trim() || !/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) {
      toast({ title: "Bad slug", description: "lowercase letters, digits, hyphens; starts with letter or digit", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        category: category.trim() || null,
        read_time: readTime.trim() || null,
        hero_image_url: heroImageUrl.trim() || null,
        language,
        content: textToBody(body),
        ...(publish ? { is_published: true } : {}),
      };

      if (editingId) {
        const { error } = await supabase
          .from("journal_entries" as never)
          .update(payload as never)
          .eq("id", editingId);
        if (error) throw new Error(error.message);
        toast({ title: publish ? "Updated + published" : "Updated" });
      } else {
        const { error } = await supabase
          .from("journal_entries" as never)
          .insert({ ...payload, is_published: publish, sort_order: 0 } as never);
        if (error) throw new Error(error.message);
        toast({ title: publish ? "Created + published" : "Created (draft)" });
      }

      resetForm();
      await fetchAll();
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (row: JournalRow) => {
    setBusyId(row.id);
    const { error } = await supabase
      .from("journal_entries" as never)
      .update({ is_published: !row.is_published } as never)
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await fetchAll();
  };

  const removeRow = async (row: JournalRow) => {
    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    setBusyId(row.id);
    const { error } = await supabase
      .from("journal_entries" as never)
      .delete()
      .eq("id", row.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    if (editingId === row.id) resetForm();
    toast({ title: "Article deleted" });
    await fetchAll();
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
        <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Write + publish articles to <span className="font-mono">/blog</span>.
              Body paragraphs are split on blank lines; <span className="font-mono">**bold**</span> renders as a section header.
            </p>
          </div>
          {editingId && (
            <Button variant="outline" size="sm" onClick={resetForm}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New article
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-[3fr_2fr] gap-8">
          {/* ─── Editor ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Edit article" : "New article"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs uppercase tracking-wider font-medium">Title</Label>
                <Input id="title" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="What to Actually Look for in an Admissions Consultant" />
              </div>

              <div className="grid grid-cols-[2fr_1fr] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-xs uppercase tracking-wider font-medium">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                    placeholder="admissions-consultant-checklist"
                    className="font-mono"
                  />
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
                <Label htmlFor="excerpt" className="text-xs uppercase tracking-wider font-medium">Excerpt</Label>
                <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="One-paragraph summary shown on the index card + in meta description." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs uppercase tracking-wider font-medium">Category</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Admissions" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="readTime" className="text-xs uppercase tracking-wider font-medium">Read time</Label>
                  <Input id="readTime" value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder="7 min" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hero" className="text-xs uppercase tracking-wider font-medium">Hero image URL</Label>
                <Input id="hero" type="url" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." />
                {heroImageUrl && (
                  <a href={heroImageUrl} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
                    <ExternalLink className="h-3 w-3" /> open image
                  </a>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="body" className="text-xs uppercase tracking-wider font-medium">Body</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={18}
                  placeholder={"First paragraph here.\n\nNext paragraph after a blank line.\n\n**Section header** Section body continues on the same paragraph after the bold."}
                  className="font-mono text-sm leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Blank line → new paragraph. <span className="font-mono">**text**</span> renders as a bold section header.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => onSave(false)} disabled={submitting} variant="outline" className="flex-1">
                  {submitting ? "Saving…" : editingId ? "Save changes (keep current state)" : "Save as draft"}
                </Button>
                <Button onClick={() => onSave(true)} disabled={submitting} className="flex-1">
                  {submitting ? "Saving…" : editingId ? "Save + publish" : "Save + publish"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ─── List ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Library ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No articles yet. Write your first one on the left.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((r) => (
                    <li
                      key={r.id}
                      className={`py-4 grid grid-cols-[1fr_auto] gap-3 items-start cursor-pointer rounded-md px-2 -mx-2 transition-colors ${
                        editingId === r.id ? "bg-gold/10" : "hover:bg-muted/40"
                      }`}
                      onClick={() => loadIntoEditor(r)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-[14px] leading-snug truncate">{r.title}</h3>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.language}</span>
                          {r.category && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">· {r.category}</span>}
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">/blog/{r.slug}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span>created {fmtDate(r.created_at)}</span>
                          {r.published_at && <span>· published {fmtDate(r.published_at)}</span>}
                        </div>
                      </div>
                      <div
                        className="flex flex-col items-end gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.is_published}
                            disabled={busyId === r.id}
                            onCheckedChange={() => togglePublish(r)}
                            aria-label="Publish toggle"
                          />
                          <span className="text-[11px] text-muted-foreground">{r.is_published ? "Live" : "Draft"}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => removeRow(r)} disabled={busyId === r.id}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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

export default JournalEntries;
