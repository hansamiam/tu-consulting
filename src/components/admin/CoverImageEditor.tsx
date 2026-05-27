import { useRef, useState } from "react";
import { Upload, Link as LinkIcon, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useScholarshipEdit } from "./useScholarshipEdit";

/**
 * Cover image editor. Two paths:
 *  1. File upload — picks a local file, uploads to the
 *     `scholarship-covers` Storage bucket under <scholarship_id>/<ts>-<name>,
 *     then writes the resulting public URL onto scholarships.cover_image_url
 *     (going through the audit log via saveScholarshipField).
 *  2. URL paste — bypass storage entirely and just set cover_image_url
 *     to a hosted URL (e.g. a Wikipedia or provider site image).
 *
 * Clear-button blanks the column (sets NULL).
 *
 * Storage path keys by scholarship_id so multiple uploads accumulate
 * historically — we don't delete the old file when replacing, so an
 * accidental swap is recoverable through Supabase Storage.
 */

interface Props {
  scholarshipId: string;
  currentUrl: string | null;
  onSaved: (next: string | null) => void;
}

export const CoverImageEditor = ({ scholarshipId, currentUrl, onSaved }: Props) => {
  const { user } = useAuth();
  const { saving: savingEdit, saveScholarshipField } = useScholarshipEdit(scholarshipId);
  const [uploading, setUploading] = useState(false);
  const [draftUrl, setDraftUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const setCover = async (next: string | null): Promise<boolean> => {
    const ok = await saveScholarshipField("cover_image_url", currentUrl, next);
    if (ok) onSaved(next);
    return ok;
  };

  const onPickFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${scholarshipId}/${Date.now()}-cover.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("scholarship-covers")
      .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type || undefined });
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: publicUrlData } = supabase.storage.from("scholarship-covers").getPublicUrl(path);
    const publicUrl = publicUrlData?.publicUrl ?? null;
    setUploading(false);
    if (!publicUrl) {
      toast({ title: "Uploaded but no public URL", description: "Re-link manually.", variant: "destructive" });
      return;
    }
    await setCover(publicUrl);
  };

  const onPasteUrl = async () => {
    const next = draftUrl.trim();
    if (!next) return;
    const ok = await setCover(next);
    if (ok) setDraftUrl("");
  };

  const onClear = async () => {
    await setCover(null);
  };

  return (
    <div className="space-y-2.5">
      {currentUrl ? (
        <div className="relative inline-block rounded-md overflow-hidden border border-foreground/15 bg-foreground/[0.02]">
          <img src={currentUrl} alt="Cover preview" className="h-20 w-auto block" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 right-1 rounded-full bg-black/60 hover:bg-black/80 text-white p-1"
            title="Clear cover image"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <p className="text-[12px] text-foreground/55 italic">No cover image — upload a file or paste a URL.</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading || savingEdit}
          onClick={() => fileRef.current?.click()}
          className="gap-1.5 h-8"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            e.currentTarget.value = "";
          }}
        />

        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <LinkIcon className="size-3.5 text-foreground/40" />
          <Input
            type="url"
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onPasteUrl(); } }}
            placeholder="…or paste an image URL"
            className="h-8 text-[13px]"
            disabled={uploading || savingEdit}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onPasteUrl}
            disabled={!draftUrl.trim() || uploading || savingEdit}
            className="h-8"
          >
            Use
          </Button>
        </div>
      </div>
    </div>
  );
};
