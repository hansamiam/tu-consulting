// Lets users complete their profile (full name + country) to earn a milestone toward the 5-day Pro trial.
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTrackMilestone } from "@/hooks/use-track-milestone";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const ProfileCompletionCard = () => {
  const { user } = useAuth();
  const { track } = useTrackMilestone();
  const [fullName, setFullName] = useState("");
  const [countryHint, setCountryHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, country_hint, onboarding_completed_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setCountryHint(data.country_hint ?? "");
          if (data.onboarding_completed_at) setCompleted(true);
        }
      });
  }, [user]);

  if (!user || completed) return null;

  const handleSave = async () => {
    if (!fullName.trim() || !countryHint.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        country_hint: countryHint.trim(),
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    setLoading(false);

    if (error) {
      toast.error("Couldn't save. Try again.");
      return;
    }
    setCompleted(true);
    toast.success("Profile saved!");
    track("profile_completed", { country: countryHint.trim() });
  };

  return (
    <Card className="p-6 border-gold/30 bg-gold/5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Complete your profile</h2>
          <p className="text-sm text-muted-foreground">
            One step closer to unlocking your 5-day Pro trial.
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fn">Full name</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ch">Country</Label>
          <Input id="ch" value={countryHint} onChange={(e) => setCountryHint(e.target.value)} placeholder="e.g. Kyrgyzstan" />
        </div>
      </div>
      <Button onClick={handleSave} disabled={loading} className="mt-4 gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Save profile
      </Button>
    </Card>
  );
};
