/**
 * SavedSearchControls — pair of UI affordances inside the Discover
 * filters sidebar:
 *   1. "Save this search" — opens a dialog to name + alert-toggle
 *      the current filter state; persists via useSavedSearches.
 *   2. "Saved" dropdown — lists existing saved searches; clicking one
 *      applies its filters; per-row × deletes; per-row bell toggles
 *      alert_enabled.
 *
 * Authed users only — anon users see a sign-in nudge in place of the
 * dropdown. Save button is disabled when no filters are active.
 */
import { useState } from "react";
import { Bookmark, BookmarkPlus, Bell, BellOff, Loader2, Trash2, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { toast } from "sonner";

interface Props {
  /** Current filter blob to save. */
  filters: Record<string, unknown>;
  /** True when at least one filter differs from default — drives the
   * Save button disabled state. */
  hasActiveFilters: boolean;
  /** Apply a saved-search blob back into Discover state. */
  onApply: (filters: Record<string, unknown>) => void;
}

export const SavedSearchControls = ({ filters, hasActiveFilters, onApply }: Props) => {
  const { searches, isAuthed, create, remove, setAlertEnabled } = useSavedSearches();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [alertEnabled, setAlertEnabledLocal] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await create({ name: name.trim(), filters, alertEnabled });
      toast.success("Search saved" + (alertEnabled ? " · alerts on" : ""));
      setSaveOpen(false);
      setName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't save";
      toast.error(/duplicate/i.test(msg) ? "You already have a search with that name" : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 justify-center"
          onClick={() => setSaveOpen(true)}
          disabled={!isAuthed || !hasActiveFilters}
          title={!isAuthed ? "Sign in to save searches" : !hasActiveFilters ? "Tune some filters first" : undefined}
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save search
        </Button>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1"
              disabled={!isAuthed || searches.length === 0}
              title={!isAuthed ? "Sign in to view saved searches" : searches.length === 0 ? "No saved searches yet" : undefined}
            >
              <Bookmark className="h-3.5 w-3.5" />
              {searches.length > 0 && <span className="tabular-nums">{searches.length}</span>}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-1.5">
            {searches.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">No saved searches yet.</p>
            ) : (
              <ul className="space-y-0.5 max-h-72 overflow-y-auto">
                {searches.map((s) => (
                  <li
                    key={s.id}
                    className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-foreground/[0.04] transition-colors"
                  >
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => {
                        onApply(s.filters);
                        setMenuOpen(false);
                        toast.success(`Loaded "${s.name}"`);
                      }}
                    >
                      <p className="text-[13px] font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.alert_enabled
                          ? s.last_alert_at
                            ? `Last alert ${new Date(s.last_alert_at).toLocaleDateString()}`
                            : "Alerts on · awaiting first match"
                          : "Alerts paused"}
                      </p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAlertEnabled(s.id, !s.alert_enabled).catch(() => toast.error("Couldn't update")); }}
                      title={s.alert_enabled ? "Pause alerts" : "Resume alerts"}
                      className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
                    >
                      {s.alert_enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${s.name}"?`)) remove(s.id).catch(() => toast.error("Couldn't delete")); }}
                      className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={(o) => { setSaveOpen(o); if (!o) setName(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg leading-tight">Save this search</DialogTitle>
            <DialogDescription className="text-sm">
              Name it so future-you remembers what it's for.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="ss-name" className="text-xs uppercase tracking-[0.16em] font-semibold text-muted-foreground">Name</Label>
              <Input
                id="ss-name"
                autoFocus
                placeholder="e.g. PhD scholarships in Germany"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                className="mt-1.5"
              />
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/40 p-3">
              <div className="flex-1 min-w-0">
                <Label htmlFor="ss-alert" className="text-sm font-medium cursor-pointer">Email me when new matches appear</Label>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                  Daily digest, max one email per saved search per day. We respect your nudge pause from /account.
                </p>
              </div>
              <Switch id="ss-alert" checked={alertEnabled} onCheckedChange={setAlertEnabledLocal} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setSaveOpen(false)} className="text-muted-foreground gap-1">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button variant="gold" onClick={submit} disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
