/**
 * DocumentManager
 *
 * Upload + manage student documents (transcripts, essay drafts,
 * references, CVs, test score reports). Each upload kicks off the
 * parse-document edge function to extract text via the Lovable AI
 * vision gateway. Once parse_status='ready' the counselor sees the
 * document in its live case context and can cite from it.
 *
 * Auth-only — anon users see a sign-in prompt. The DB schema's RLS
 * locks reads/writes to the owner.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload, FileText, Image as ImageIcon, Loader2, Trash2, Check, X,
  CircleAlert, FileType, Eye, EyeOff, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type DocKind = "transcript" | "essay_draft" | "reference_letter" | "cv" | "test_score" | "other";

interface DocRow {
  document_id: string;
  filename: string;
  title: string | null;
  kind: DocKind;
  mime_type: string | null;
  size_bytes: number | null;
  parse_status: "pending" | "parsing" | "ready" | "failed" | "unsupported";
  parse_error: string | null;
  use_in_counselor: boolean;
  uploaded_at: string;
  storage_path: string;
}

const KIND_LABEL: Record<DocKind, string> = {
  transcript: "Transcript",
  essay_draft: "Essay draft",
  reference_letter: "Reference letter",
  cv: "CV / Résumé",
  test_score: "Test score",
  other: "Other",
};

const STATUS_LABEL: Record<DocRow["parse_status"], { label: string; tone: string }> = {
  pending:     { label: "Queued",        tone: "text-muted-foreground" },
  parsing:     { label: "Reading…",      tone: "text-amber-600 dark:text-amber-500" },
  ready:       { label: "Ready",         tone: "text-emerald-600" },
  failed:      { label: "Parse failed",  tone: "text-destructive" },
  unsupported: { label: "Format n/a",    tone: "text-muted-foreground" },
};

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.rtf,.docx";
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  isRu?: boolean;
  /** Compact mode: tighter spacing for the counselor sidebar */
  compact?: boolean;
}

export function DocumentManager({ isRu = false, compact = false }: Props) {
  const { user } = useAuth();
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedKind, setStagedKind] = useState<DocKind>("transcript");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Load docs once + subscribe to row updates so a parse moving from
     'parsing' to 'ready' updates the UI live without a refresh. */
  const refresh = useCallback(async () => {
    if (!user) {
      setDocs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("student_documents")
      .select("document_id, filename, title, kind, mime_type, size_bytes, parse_status, parse_error, use_in_counselor, uploaded_at, storage_path")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    setDocs((data as DocRow[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  /* Poll while any doc is parsing — saves us setting up realtime
     channels for a relatively rare event. Stops once nothing is in
     pending/parsing. */
  useEffect(() => {
    const anyParsing = docs.some((d) => d.parse_status === "pending" || d.parse_status === "parsing");
    if (!anyParsing) return;
    const iv = setInterval(refresh, 2500);
    return () => clearInterval(iv);
  }, [docs, refresh]);

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(t(`File too large (max 10 MB).`, "Файл слишком большой (макс. 10 МБ)."));
      return;
    }
    setStagedFile(file);
    setStagedKind(guessKindFromFilename(file.name));
  };

  const handleUpload = async () => {
    if (!user || !stagedFile) return;
    setUploading(true);
    try {
      const ext = stagedFile.name.split(".").pop() || "bin";
      const safeName = stagedFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
      const path = `${user.id}/${Date.now()}-${safeName}`;

      // 1. Upload raw bytes to storage
      const { error: upErr } = await supabase.storage
        .from("student-documents")
        .upload(path, stagedFile, {
          contentType: stagedFile.type || `application/${ext}`,
          upsert: false,
        });
      if (upErr) throw new Error(upErr.message);

      // 2. Insert metadata row (parse_status='pending')
      const { data: inserted, error: insErr } = await supabase
        .from("student_documents")
        .insert({
          user_id: user.id,
          storage_path: path,
          filename: stagedFile.name,
          title: stagedFile.name.split(".").slice(0, -1).join(".") || stagedFile.name,
          mime_type: stagedFile.type || null,
          size_bytes: stagedFile.size,
          kind: stagedKind,
          parse_status: "pending",
          use_in_counselor: true,
        })
        .select("document_id")
        .single();
      if (insErr) throw new Error(insErr.message);

      setStagedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();

      // 3. Kick off the parser (don't await — UI shows "Reading…" via poll)
      supabase.functions.invoke("parse-document", { body: { document_id: inserted.document_id } })
        .then(({ error }) => { if (error) console.warn("parse-document invoke", error); })
        .catch((e) => console.warn("parse-document threw", e));

      toast.success(t("Uploaded — reading the document now.", "Загружено — читаем документ."));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleUseInChat = async (doc: DocRow) => {
    setDocs((prev) => prev.map((d) => d.document_id === doc.document_id ? { ...d, use_in_counselor: !d.use_in_counselor } : d));
    await supabase
      .from("student_documents")
      .update({ use_in_counselor: !doc.use_in_counselor })
      .eq("document_id", doc.document_id);
  };

  const removeDoc = async (doc: DocRow) => {
    if (!confirm(t(`Delete "${doc.filename}"?`, `Удалить "${doc.filename}"?`))) return;
    // Storage object first; if it fails we still remove the metadata so
    // the UI doesn't show ghosts.
    await supabase.storage.from("student-documents").remove([doc.storage_path]);
    await supabase.from("student_documents").delete().eq("document_id", doc.document_id);
    setDocs((prev) => prev.filter((d) => d.document_id !== doc.document_id));
  };

  if (!user) {
    return (
      <div className={`${compact ? "px-3 py-3" : "p-4"} rounded-lg border border-dashed border-border text-center`}>
        <FileText className="w-5 h-5 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
          {t("Sign in to upload your transcript, drafts, and references.",
             "Войдите, чтобы загрузить транскрипт, черновики и рекомендации.")}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/account">{t("Sign in", "Войти")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
          {t("Documents", "Документы")}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {t("Transcript, essay drafts, references — the counselor reads them and cites them in answers.",
             "Транскрипт, черновики, рекомендации — советник читает и цитирует их в ответах.")}
        </p>
      </div>

      {/* Stage / upload */}
      <div>
        {!stagedFile ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full text-left rounded-lg border border-dashed border-border hover:border-gold/40 hover:bg-gold/5 px-3 py-2.5 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-2 text-xs">
              <Upload className="w-3.5 h-3.5 text-gold-dark" />
              <span className="font-semibold text-foreground">{t("Upload document", "Загрузить документ")}</span>
              <Plus className="w-3 h-3 ml-auto text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              {t("PDF, image, txt · max 10 MB · transcripts get OCR'd",
                 "PDF, изображения, txt · до 10 МБ · транскрипты распознаются")}
            </p>
          </button>
        ) : (
          <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <FileTypeIcon mime={stagedFile.type} className="w-3.5 h-3.5 text-gold-dark shrink-0" />
              <span className="font-medium text-foreground truncate flex-1">{stagedFile.name}</span>
              <button onClick={() => setStagedFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <Select value={stagedKind} onValueChange={(v) => setStagedKind(v as DocKind)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABEL) as DocKind[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">{KIND_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="gold"
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full gap-1.5 h-8 text-xs"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? t("Uploading…", "Загружаем…") : t("Upload + analyse", "Загрузить и распознать")}
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("Loading…", "Загрузка…")}
        </div>
      ) : docs.length === 0 ? null : (
        <div className="space-y-1.5">
          {docs.map((d) => {
            const status = STATUS_LABEL[d.parse_status];
            return (
              <div key={d.document_id} className="rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors px-2.5 py-2">
                <div className="flex items-start gap-2">
                  <FileTypeIcon mime={d.mime_type} className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {d.title || d.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {KIND_LABEL[d.kind]}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">·</span>
                      <span className={`text-[10px] font-medium ${status.tone} flex items-center gap-0.5`}>
                        {(d.parse_status === "parsing" || d.parse_status === "pending") && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        {d.parse_status === "ready" && <Check className="w-2.5 h-2.5" />}
                        {d.parse_status === "failed" && <CircleAlert className="w-2.5 h-2.5" />}
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {d.parse_status === "ready" && (
                      <button
                        title={d.use_in_counselor ? t("Hide from counselor", "Скрыть от советника") : t("Show to counselor", "Показать советнику")}
                        onClick={() => toggleUseInChat(d)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {d.use_in_counselor ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    )}
                    <button
                      title={t("Delete", "Удалить")}
                      onClick={() => removeDoc(d)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {d.parse_error && d.parse_status === "failed" && (
                  <p className="text-[10px] text-destructive mt-1 leading-snug">{d.parse_error.slice(0, 140)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FileTypeIcon = ({ mime, className }: { mime: string | null; className?: string }) => {
  if (!mime) return <FileType className={className} />;
  if (mime.startsWith("image/")) return <ImageIcon className={className} />;
  if (mime === "application/pdf") return <FileText className={className} />;
  return <FileType className={className} />;
};

function guessKindFromFilename(name: string): DocKind {
  const n = name.toLowerCase();
  if (/transcript|grade|gpa|marks|academic/.test(n)) return "transcript";
  if (/essay|statement|sop|personal|draft/.test(n)) return "essay_draft";
  if (/reference|recommend|letter/.test(n)) return "reference_letter";
  if (/cv|resume|résumé/.test(n)) return "cv";
  if (/ielts|toefl|sat|gre|gmat|score/.test(n)) return "test_score";
  return "other";
}
