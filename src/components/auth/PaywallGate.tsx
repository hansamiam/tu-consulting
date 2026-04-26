// PaywallGate — wraps premium content with a soft preview + Founding upgrade CTA.
import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Lock, Crown } from "lucide-react";

type Props = {
  children: ReactNode;
  feature: string;
  description?: string;
  showPreview?: boolean;
};

export const PaywallGate = ({ children, feature, description, showPreview = true }: Props) => {
  const { user, subscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  if (subscription.is_active) return <>{children}</>;

  const handleUpgrade = () => {
    if (!user) {
      sessionStorage.setItem("post_auth_redirect", "/pricing");
      setAuthOpen(true);
      return;
    }
    navigate("/pricing");
  };

  return (
    <div className="relative">
      {showPreview && (
        <div className="pointer-events-none select-none blur-sm opacity-50 max-h-[400px] overflow-hidden">
          {children}
        </div>
      )}
      <div className={`${showPreview ? "absolute inset-0" : ""} flex items-center justify-center p-6`}>
        <div className="bg-background/95 backdrop-blur-md border border-gold/30 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-gold" />
          </div>
          <h3 className="font-bold text-lg mb-1">{feature} is a Founding Member feature</h3>
          <p className="text-sm text-muted-foreground mb-5">
            {description ||
              "Founding members lock in $9/mo forever and unlock everything as it ships — Scholarship Finder, Academy, Prep Premium, and monthly office hours."}
          </p>
          <Button onClick={handleUpgrade} variant="gold" className="w-full gap-2">
            <Crown className="w-4 h-4" /> Become a Founding Member — $9/mo
          </Button>
          {!user && (
            <p className="text-xs text-muted-foreground mt-3">
              Already a member?{" "}
              <button onClick={() => setAuthOpen(true)} className="underline">Sign in</button>
            </p>
          )}
        </div>
      </div>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to continue"
        description="One-tap sign in. We'll redirect you to membership options."
      />
    </div>
  );
};
