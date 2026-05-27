import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * Persist one field change on a scholarship row + write an audit row.
 *
 * Why two writes (and not a Postgres trigger): the audit row needs
 * editor_email, which is on auth.users not auth.uid(). Doing it client-side
 * keeps that out of every RLS-evaluated trigger and keeps the migration
 * trivial. RLS still enforces that only an admin can write to either table.
 *
 * Note on race / partial-failure: if the scholarships UPDATE succeeds but
 * the audit INSERT fails, we toast a warning but DO NOT revert — the user's
 * intent landed, and the audit gap is a known-soft loss. We'd rather have
 * the fix saved without provenance than a confusing revert.
 */
export const useScholarshipEdit = (scholarshipId: string) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const saveScholarshipField = async (
    field: string,
    valueBefore: unknown,
    valueAfter: unknown
  ): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const { error: updErr } = await supabase
      .from("scholarships")
      .update({ [field]: valueAfter as never })
      .eq("scholarship_id", scholarshipId);

    if (updErr) {
      setSaving(false);
      toast({
        title: "Save failed",
        description: updErr.message,
        variant: "destructive",
      });
      return false;
    }

    const { error: auditErr } = await supabase.from("scholarship_edits").insert({
      scholarship_id: scholarshipId,
      editor_user_id: user.id,
      editor_email: user.email ?? "unknown",
      field_name: field,
      value_before: valueBefore as never,
      value_after: valueAfter as never,
    });
    if (auditErr) {
      console.warn("[admin-edit] audit insert failed (save persisted)", auditErr);
      toast({
        title: "Saved (audit warning)",
        description: "Edit persisted but audit row failed to write.",
      });
    } else {
      toast({ title: "Saved" });
    }
    setSaving(false);
    return true;
  };

  /**
   * Mini-guide content lives in a JSONB column on a different table
   * (scholarship_mini_guides.content). Edits target a dotted path
   * within the JSON. We do a read-modify-write — the JSON is small
   * enough that we don't bother with a Postgres-side jsonb_set RPC.
   */
  /** scholarshipId here is also the PK of scholarship_mini_guides — that
   *  table uses scholarship_id as its primary key (no separate id column).
   *  Kept as a named param so callers don't have to know that. */
  const saveMiniGuideField = async (
    miniGuideScholarshipId: string,
    path: string,
    valueBefore: unknown,
    valueAfter: unknown,
    nextFullContent: Record<string, unknown>
  ): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const { error: updErr } = await supabase
      .from("scholarship_mini_guides")
      .update({ content: nextFullContent as never })
      .eq("scholarship_id", miniGuideScholarshipId);

    if (updErr) {
      setSaving(false);
      toast({
        title: "Save failed",
        description: updErr.message,
        variant: "destructive",
      });
      return false;
    }

    const { error: auditErr } = await supabase.from("scholarship_edits").insert({
      scholarship_id: scholarshipId,
      editor_user_id: user.id,
      editor_email: user.email ?? "unknown",
      field_name: `mini_guide.${path}`,
      value_before: valueBefore as never,
      value_after: valueAfter as never,
    });
    if (auditErr) {
      console.warn("[admin-edit] mini-guide audit insert failed", auditErr);
      toast({
        title: "Saved (audit warning)",
        description: "Edit persisted but audit row failed to write.",
      });
    } else {
      toast({ title: "Saved" });
    }
    setSaving(false);
    return true;
  };

  return { saving, saveScholarshipField, saveMiniGuideField };
};
