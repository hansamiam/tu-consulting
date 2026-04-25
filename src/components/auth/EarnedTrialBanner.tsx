// Shows on top of the page when the user has an active earned 5-day Pro trial.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const DISMISS_KEY = "tu_trial_banner_dismissed_at";

export const EarnedTrialBanner = () => {
  const { subscription, user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem(DISMISS_KEY);
    // Re-show if dismissed >24h ago
    if (d && Date.now() - Number(d) < 24 * 60 * 60 * 1000) setDismissed(true);
  }, []);

  if (!user) return null;
  if (!subscription.earned_trial_active) return null;
  // If already on a paid tier, no need to advertise the trial
  if (subscription.tier !== "free") return null;
  if (dismissed) return null;

  const exp = subscription.earned_trial_expires_at
    ? new Date(subscription.earned_trial_expires_at)
    : null;
  const daysLeft = exp
    ? Math.max(0, Math.ceil((exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  if (daysLeft === 0) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-gold/15 via-primary/10 to-gold/15 border-b border-gold/30">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-gold shrink-0" />
          <span>
            <strong>You've unlocked 5-day Pro access.</strong>{" "}
            <span className="text-muted-foreground">
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left.
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate("/pricing")} className="h-8">
            Keep Pro after trial
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-background/50"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
