// Auth callback page — handles magic link return + OAuth tokens
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auth-helpers parse the hash automatically; just redirect after a tick.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      const dest = sessionStorage.getItem("post_auth_redirect") || "/account";
      sessionStorage.removeItem("post_auth_redirect");
      navigate(data.session ? dest : "/", { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
