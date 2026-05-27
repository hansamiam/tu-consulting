import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/adminMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

/**
 * Floating admin button (bottom-left of Discover). Clicking opens a
 * minimal form to create a new scholarship row with only the fields
 * that have to be set before inline-edit can take over. Everything
 * else inherits its column default.
 *
 * After insert, calls onCreated with the new row's scholarship_id so
 * the parent can open it in the detail dialog immediately — admin
 * fills the rest via inline edits.
 */

const COVERAGE_OPTIONS = [
  { value: "full_ride", label: "Full ride" },
  { value: "full_tuition", label: "Full tuition" },
  { value: "tuition_only", label: "Tuition only" },
  { value: "stipend", label: "Stipend" },
  { value: "partial", label: "Partial" },
  { value: "unknown", label: "Unknown (fill in later)" },
];

interface Props {
  onCreated: (scholarshipId: string) => void;
}

export const NewScholarshipButton = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    scholarship_name: "",
    provider_name: "",
    host_country: "",
    official_url: "",
    coverage_type: "unknown",
  });

  if (!isAdminUser(user)) return null;

  const canSubmit = form.scholarship_name.trim().length > 0 && form.coverage_type.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("scholarships")
      .insert({
        scholarship_name: form.scholarship_name.trim(),
        provider_name: form.provider_name.trim() || null,
        host_country: form.host_country.trim() || null,
        official_url: form.official_url.trim() || null,
        coverage_type: form.coverage_type,
        is_published: false,
      } as never)
      .select("scholarship_id")
      .maybeSingle();
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not create", description: error.message, variant: "destructive" });
      return;
    }
    const newId = (data as { scholarship_id?: string } | null)?.scholarship_id;
    if (!newId) {
      toast({ title: "Created but no id returned", description: "Refresh to find the row.", variant: "destructive" });
      return;
    }
    toast({ title: "Created", description: "Now fill in the rest in edit mode." });
    setOpen(false);
    setForm({ scholarship_name: "", provider_name: "", host_country: "", official_url: "", coverage_type: "unknown" });
    onCreated(newId);
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          type="button"
          size="sm"
          onClick={() => setOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 gap-1.5"
        >
          <Plus className="size-3.5" />
          New scholarship
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new scholarship</DialogTitle>
            <DialogDescription>
              Only name + coverage are required. Everything else (eligibility, deadline, mini-guide…) you fill in afterwards via edit mode on the detail page. Row starts unpublished — flip is_published later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Scholarship name *">
              <Input
                value={form.scholarship_name}
                onChange={(e) => setForm({ ...form, scholarship_name: e.target.value })}
                placeholder="e.g. Nazarbayev University Undergraduate Scholarship"
                autoFocus
              />
            </Field>
            <Field label="Provider">
              <Input
                value={form.provider_name}
                onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
                placeholder="e.g. Nazarbayev University"
              />
            </Field>
            <Field label="Host country">
              <Input
                value={form.host_country}
                onChange={(e) => setForm({ ...form, host_country: e.target.value })}
                placeholder="e.g. Kazakhstan"
              />
            </Field>
            <Field label="Official URL">
              <Input
                type="url"
                value={form.official_url}
                onChange={(e) => setForm({ ...form, official_url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Coverage type *">
              <Select value={form.coverage_type} onValueChange={(v) => setForm({ ...form, coverage_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVERAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={!canSubmit || submitting} className="gap-1.5">
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              Create & open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="text-[12px]">{label}</Label>
    {children}
  </div>
);
