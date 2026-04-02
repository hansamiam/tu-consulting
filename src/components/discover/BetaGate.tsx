import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

const BETA_PASSWORD = "topuni2026";

interface BetaGateProps {
  children: React.ReactNode;
}

export const BetaGate = ({ children }: BetaGateProps) => {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem("discover_beta_unlocked") === "true";
  });
  const [showDialog, setShowDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleUnlock = () => {
    if (password === BETA_PASSWORD) {
      sessionStorage.setItem("discover_beta_unlocked", "true");
      setUnlocked(true);
      setShowDialog(false);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <>
      <div
        className="relative cursor-pointer group"
        onClick={() => setShowDialog(true)}
      >
        {/* Blurred preview */}
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl">
          <div className="text-center space-y-3 p-6">
            <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-gold" />
            </div>
            <h3 className="font-semibold text-foreground">Beta Features</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              These analytics and visualizations are in beta testing. Click to enter access code.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" />
              Beta Access
            </DialogTitle>
            <DialogDescription>
              Enter the beta access code to unlock advanced analytics and visualizations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Access code"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-xs text-destructive">Incorrect access code. Please try again.</p>
            )}
            <Button variant="gold" className="w-full" onClick={handleUnlock}>
              Unlock Beta Features
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
