import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PreCallIntakeProps {
  sessionId: string;
  email?: string;
  onComplete: () => void;
}

export default function PreCallIntake({ sessionId, email, onComplete }: PreCallIntakeProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    intake_goals: "",
    intake_target_countries: "",
    intake_grade_year: "",
    intake_budget_usd: "",
    intake_biggest_blocker: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.intake_goals.trim() || !form.intake_target_countries.trim()) {
      toast.error("Tell us your goals and target countries so we can prep for the call.");
      return;
    }
    setSubmitting(true);
    try {
      // Match the most recent booking for this stripe session (or email fallback)
      const { error } = await supabase
        .from("bookings")
        .update({
          ...form,
          intake_completed_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", sessionId);

      if (error) throw error;
      toast.success("Got it. Now pick a time below — we'll come prepared.");
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save — but you can still book below. We'll ask on the call.");
      onComplete(); // never block the user
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-accent text-accent-foreground rounded-full h-7 w-7 inline-flex items-center justify-center text-sm font-bold">1</span>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Help us prep — 60 seconds
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5 ml-9">
        Your consultant reads this <em>before</em> the call. The more specific you are, the more value you get.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="goals">What's your #1 goal for this consultation? *</Label>
          <Textarea
            id="goals"
            placeholder="e.g. Get into a top-30 US CS program with full financial aid, or pivot from a gap year into Oxford PPE."
            rows={3}
            value={form.intake_goals}
            onChange={(e) => setForm({ ...form, intake_goals: e.target.value })}
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="countries">Target countries *</Label>
            <Input
              id="countries"
              placeholder="USA, UK, Canada…"
              value={form.intake_target_countries}
              onChange={(e) => setForm({ ...form, intake_target_countries: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="grade">Current grade / year</Label>
            <Select value={form.intake_grade_year} onValueChange={(v) => setForm({ ...form, intake_grade_year: v })}>
              <SelectTrigger id="grade"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grade-9">Grade 9 / Year 10</SelectItem>
                <SelectItem value="grade-10">Grade 10 / Year 11</SelectItem>
                <SelectItem value="grade-11">Grade 11 / Year 12</SelectItem>
                <SelectItem value="grade-12">Grade 12 / Year 13</SelectItem>
                <SelectItem value="gap-year">Gap year</SelectItem>
                <SelectItem value="undergrad">Undergraduate</SelectItem>
                <SelectItem value="postgrad">Postgraduate</SelectItem>
                <SelectItem value="parent">Parent / guardian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="budget">Annual budget (USD, all-in)</Label>
          <Select value={form.intake_budget_usd} onValueChange={(v) => setForm({ ...form, intake_budget_usd: v })}>
            <SelectTrigger id="budget"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="under-20k">Under $20k (need full aid)</SelectItem>
              <SelectItem value="20k-40k">$20k–$40k</SelectItem>
              <SelectItem value="40k-70k">$40k–$70k</SelectItem>
              <SelectItem value="70k-plus">$70k+</SelectItem>
              <SelectItem value="flexible">Flexible / depends on school</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="blocker">What's blocking you the most right now?</Label>
          <Textarea
            id="blocker"
            placeholder="e.g. Test scores, essay topic, school list, financial aid strategy, visa concerns…"
            rows={2}
            value={form.intake_biggest_blocker}
            onChange={(e) => setForm({ ...form, intake_biggest_blocker: e.target.value })}
          />
        </div>

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Continue to scheduling
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </form>
    </div>
  );
}
