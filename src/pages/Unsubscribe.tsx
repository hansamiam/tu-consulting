import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "valid" | "used" | "invalid" | "done" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(r => r.json())
      .then(d => {
        if (d.email) setEmail(d.email);
        if (d.alreadyUnsubscribed || d.used) setState("used");
        else if (d.valid) setState("valid");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setState("loading");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setState(error ? "error" : "done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border rounded-lg p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Email preferences</h1>
        {state === "loading" && <p className="text-muted-foreground">Checking your link…</p>}
        {state === "valid" && (
          <>
            <p>Unsubscribe {email ? <strong>{email}</strong> : "this address"} from TopUni emails?</p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}
        {state === "used" && <p>You're already unsubscribed. No further emails will be sent.</p>}
        {state === "done" && <p>✓ Done. You won't receive emails from us anymore.</p>}
        {state === "invalid" && <p>This link is invalid or expired.</p>}
        {state === "error" && <p>Something went wrong. Please try again later.</p>}
      </div>
    </div>
  );
}
