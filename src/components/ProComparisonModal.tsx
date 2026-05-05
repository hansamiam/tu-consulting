import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Check, X, Loader2, ArrowRight, Lock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";

/* ProComparisonModal — opened from PremiumGate. Side-by-side feature
 * comparison so users see *exactly* what they unlock instead of a vague
 * "/pricing" redirect. Highlights the row that maps to the originating
 * gateId so the user's eye lands on the thing they were just blocked on.
 *
 * Routing: when user clicks "Upgrade", we call create-subscription-checkout
 * directly (same edge function used by the /pricing page) so they don't lose
 * context with a route jump. Stripe handles the auth redirect if not signed
 * in (gate-side) we still bounce to /pricing where the auth dialog opens.
 */

interface Row {
  /** unique id matching the gate.gateId so we can highlight the row */
  id: string;
  label: string;
  free: string | false;
  pro: string;
}

const ROWS: Row[] = [
  {
    id: "brief-funding-extra-matches",
    label: "Funding shortlist",
    free: "Top 3 matches",
    pro: "All ranked matches with per-factor match-score breakdown",
  },
  {
    id: "brief-pro-section-career-roi",
    label: "Career ROI breakdown",
    free: false,
    pro: "Salary ranges, employment rates, notable employers, 5–10 year alumni trajectories per top-3 university",
  },
  {
    id: "brief-pro-section-visa",
    label: "Visa & post-graduation pathway",
    free: false,
    pro: "Per-country student-visa difficulty for your nationality, post-study work, PR pathway",
  },
  {
    id: "brief-pro-section-monthly-budget",
    label: "Monthly budget breakdown",
    free: false,
    pro: "Realistic rent, food, transport, insurance per top-3 city — with scholarship coverage map",
  },
  {
    id: "counselor-free-limit",
    label: "TopUni Counselor",
    free: "5 messages",
    pro: "Unlimited messages with cross-session memory",
  },
  {
    id: "discover-strategy-notes",
    label: "Discover database",
    free: "Browse + match",
    pro: "Strategy notes (how-to-win, ideal candidate, rejection patterns) on every row",
  },
  {
    id: "live-workshops",
    label: "Live workshops with founders",
    free: false,
    pro: "Monthly with Yale · Schwarzman/Cambridge · Harvard alumni — recordings yours forever",
  },
  {
    id: "essay-critique",
    label: "Essay critique tool",
    free: "1 critique / week",
    pro: "Unlimited critiques + tone polish",
  },
  {
    id: "pdf-export",
    label: "Strategy report PDF",
    free: false,
    pro: "Downloadable, share-ready PDF for parents and counselors",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The gateId that triggered the modal — used to highlight the matching row. */
  gateId?: string;
}

export const ProComparisonModal = ({ open, onOpenChange, gateId }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasFiredOpen, setHasFiredOpen] = useState(false);

  useEffect(() => {
    if (open && !hasFiredOpen) {
      setHasFiredOpen(true);
      void track("pro_comparison_opened", { gate_id: gateId });
    }
    if (!open) setHasFiredOpen(false);
  }, [open, gateId, hasFiredOpen]);

  const startCheckout = async () => {
    void track("pro_comparison_upgrade_clicked", { gate_id: gateId });
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        sessionStorage.setItem("post_auth_redirect", "/pricing");
        navigate("/pricing");
        onOpenChange(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
        "create-subscription-checkout",
        { body: { tier: "founding", interval: "month" } },
      );
      if (error || !data?.url) {
        toast({
          title: "Couldn't start checkout",
          description: data?.error ?? error?.message ?? "Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast({ title: "Couldn't start checkout", description: (e as Error).message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-gold/10 via-background to-background px-6 sm:px-8 pt-7 pb-5 border-b border-border">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary mb-3">
            <Crown className="w-3 h-3" />
            TopUni Membership
          </div>
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="font-heading text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              What membership unlocks
            </DialogTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The same strategy you'd get from a $5,000+ private consultant — at $39/month, with a 30-day money-back guarantee.
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 sm:px-8 py-5 max-h-[55vh] overflow-y-auto">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 sm:gap-x-6 gap-y-1 items-start">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground pb-2">Feature</div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground text-center w-20 sm:w-24 pb-2">Free</div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gold-dark text-center w-32 sm:w-44 pb-2">Pro</div>

            {ROWS.map((r) => {
              const highlight = r.id === gateId;
              return (
                <motion.div
                  key={r.id}
                  className={`contents`}
                  initial={highlight ? { opacity: 0 } : false}
                  animate={highlight ? { opacity: 1 } : {}}
                >
                  <div className={`text-sm py-2.5 leading-snug ${highlight ? "font-semibold text-foreground" : "text-foreground/85"}`}>
                    {r.label}
                    {highlight && (
                      <span className="ml-2 text-[9px] uppercase tracking-[0.18em] font-bold text-gold-dark px-1.5 py-0.5 rounded bg-gold/10 align-middle">
                        you're here
                      </span>
                    )}
                  </div>
                  <div className={`text-[12px] py-2.5 text-center leading-snug ${r.free === false ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                    {r.free === false ? <X className="w-3.5 h-3.5 inline opacity-60" /> : r.free}
                  </div>
                  <div className={`text-[12px] py-2.5 leading-snug text-foreground/90 ${highlight ? "bg-gold/5 -mx-2 sm:-mx-4 px-2 sm:px-4 rounded" : ""}`}>
                    <Check className="w-3.5 h-3.5 inline text-gold-dark mr-1 -mt-0.5" />
                    {r.pro}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="px-6 sm:px-8 py-5 border-t border-border bg-card/50">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="font-heading text-2xl font-bold tabular-nums">
                $39<span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
              <div className="text-[11px] text-muted-foreground">30-day money-back guarantee · cancel anytime</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">Same outcome</div>
              <div className="text-xs text-muted-foreground line-through tabular-nums">$5,000+ consultant</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="gold"
              onClick={startCheckout}
              disabled={loading}
              className="gap-1.5 flex-1"
              size="lg"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Upgrade to Pro
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="lg"
              className="text-muted-foreground"
            >
              Continue free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
