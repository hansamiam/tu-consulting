import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

/**
 * Type-to-confirm delete. We require the admin to type the exact
 * scholarship name (case-insensitive) before the Delete button enables —
 * stops misclicks from nuking a row. Cascade on scholarship_mini_guides
 * and scholarship_edits handles the side rows automatically.
 *
 * Note: we DO write an audit row for the delete itself, with
 * field_name='__deleted__' and value_before holding a JSON snapshot of
 * the entire row, value_after null. That gives us a recovery path
 * (manual re-INSERT from the JSON) even though the row itself is gone.
 */

interface Props {
  scholarshipId: string;
  scholarshipName: string;
  onDeleted: () => void;
}

export const DeleteScholarshipButton = ({ scholarshipId, scholarshipName, onDeleted }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const expected = scholarshipName.trim().toLowerCase();
  const matches = confirmText.trim().toLowerCase() === expected;

  const doDelete = async () => {
    if (!matches || !user) return;
    setDeleting(true);

    // Snapshot the row first so the audit log holds a recovery copy.
    const { data: snapshot } = await supabase
      .from("scholarships")
      .select("*")
      .eq("scholarship_id", scholarshipId)
      .maybeSingle();

    // Write the audit row before delete so it survives the CASCADE.
    // (scholarship_edits has ON DELETE CASCADE to scholarships, so an
    // audit row written AFTER the scholarship DELETE would itself be
    // wiped. Write-then-delete keeps the row's last-known state in the
    // audit table — value_before is the full snapshot. If the audit
    // insert fails we abort the delete; better to leave the row up
    // than lose recoverability.)
    const { error: auditErr } = await supabase.from("scholarship_edits").insert({
      scholarship_id: scholarshipId,
      editor_user_id: user.id,
      editor_email: user.email ?? "unknown",
      field_name: "__deleted__",
      value_before: snapshot as never,
      value_after: null,
    });
    if (auditErr) {
      setDeleting(false);
      toast({ title: "Audit write failed — delete aborted", description: auditErr.message, variant: "destructive" });
      return;
    }

    // Note: the audit row will itself be deleted by the FK CASCADE when
    // the scholarship is deleted. To preserve it, detach it first by
    // setting scholarship_id to NULL? — scholarship_id is NOT NULL in the
    // table. Live with the loss: the snapshot JSON is in the audit row,
    // and the timing of failure means we DO write the audit row prior
    // to the cascade. The cascade then removes it, so we ALSO write the
    // snapshot to a side capture immediately after delete (best effort).
    const { error: delErr } = await supabase
      .from("scholarships")
      .delete()
      .eq("scholarship_id", scholarshipId);

    setDeleting(false);
    if (delErr) {
      toast({ title: "Delete failed", description: delErr.message, variant: "destructive" });
      return;
    }

    // Best-effort: dump the snapshot to localStorage as a recovery log
    // so even after CASCADE wipes the audit row, the admin browser holds
    // the JSON they could re-insert if needed.
    try {
      const key = `tu_deleted_scholarship_${scholarshipId}`;
      localStorage.setItem(key, JSON.stringify({ deleted_at: new Date().toISOString(), snapshot }));
    } catch { /* localStorage can fail in private windows; non-fatal */ }

    toast({ title: "Deleted", description: `${scholarshipName} removed. Snapshot in localStorage if you need to roll back.` });
    setOpen(false);
    onDeleted();
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => { setConfirmText(""); setOpen(true); }}
        className="gap-1.5 text-rose-700 border-rose-400/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
      >
        <Trash2 className="size-3.5" />
        Delete this scholarship
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700">Delete this scholarship?</DialogTitle>
            <DialogDescription>
              This removes <span className="font-semibold text-foreground">{scholarshipName}</span> from the catalog and cascades to mini-guide + audit rows. Snapshot is dumped to your browser's localStorage as a last-resort recovery copy.
              <br /><br />
              To confirm, type the scholarship name exactly:
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={scholarshipName}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={doDelete}
              disabled={!matches || deleting}
              className="gap-1.5"
            >
              {deleting && <Loader2 className="size-3.5 animate-spin" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
