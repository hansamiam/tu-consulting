// ComingSoon — generic placeholder page for features not yet polished.
// Captures interest in waitlist_emails so we know what to ship next.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Hourglass, ArrowLeft, Loader2, Crown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Props = {
  /** What the feature is called, e.g. "AI Tutor" */
  title: string;
  /** One-line value prop describing what users will get */
  description: string;
  /** Tag stored with the email so we know what they're waiting for, e.g. "prep-tutor" */
  featureTag: string;
  /** Optional path to go back to (defaults to /prep/dashboard) */
  backTo?: string;
  backLabel?: string;
};

const ComingSoon = ({
  title,
  description,
  featureTag,
  backTo = "/prep/dashboard",
  backLabel = "Back to Prep",
}: Props) => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("waitlist_emails")
      .insert({ email: `${email}|${featureTag}` });
    setSubmitting(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error("Couldn't add you to the waitlist. Try again.");
      return;
    }
    setSubmitted(true);
    toast.success("You're on the list — we'll email you when it launches.");
  };

  return (
    <div className="min-h-[70vh] flex items-start justify-center p-4 sm:p-8">
      <Card className="max-w-xl w-full p-8 sm:p-10 mt-8 sm:mt-16 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-5">
          <Hourglass className="w-6 h-6 text-gold" />
        </div>
        <Badge className="bg-muted text-foreground border-0 mb-3">In production</Badge>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>

        {subscription.is_active ? (
          <div className="rounded-xl bg-gold/5 border border-gold/20 p-4 text-sm text-foreground">
            <Crown className="inline w-4 h-4 text-gold mr-1" />
            You're a Founding Member — you'll get this automatically the moment it ships.
          </div>
        ) : submitted ? (
          <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 text-sm flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-green-600" /> You're on the waitlist.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 max-w-sm mx-auto">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Notify me when it ships"}
            </Button>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="text-xs text-muted-foreground underline w-full"
            >
              Or skip the line — become a Founding Member ($9/mo, locked forever)
            </button>
          </form>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="mt-6 gap-2 text-muted-foreground"
          onClick={() => navigate(backTo)}
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Button>
      </Card>
    </div>
  );
};

export default ComingSoon;
