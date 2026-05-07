// Auth callback page — handles magic link return + OAuth tokens.
//
// Beyond just signing the user in, this page is responsible for
// draining any pending-account payload (profile + brief) that the
// wizard stashed in localStorage before sending the magic-link email.
// Without this, the wizard's data would be lost on first auth.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { clearPendingAccount, getPendingAccount } from "@/lib/pendingAccount";
import { clearPendingReferral, getPendingReferral } from "@/lib/referralCapture";
import { consumePostAuthRedirect } from "@/lib/postAuthRedirect";
import { persistPendingAccount } from "@/lib/persistPendingAccount";

const AuthCallback = () => {
  const navigate = useNavigate();
  // Detect language from the post-auth redirect target so Russian
  // users see a Russian status during the brief flash before navigate.
  // Peek without consuming — the consume happens later inside the effect.
  const isRu = (() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("topuni-post-auth-redirect-v1");
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { dest?: string };
      return typeof parsed.dest === "string" && /\/ru($|\/)/.test(parsed.dest);
    } catch { return false; }
  })();
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const [status, setStatus] = useState<string>(t("Signing you in…", "Входим в аккаунт…"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Wait for Supabase to parse the hash + establish a session.
      // Previously this was a fixed 400 ms sleep; on a slow connection
      // the session hadn't arrived yet and the page bounced the user to
      // "/" with the pending-account drain skipped — wizard profile +
      // brief never persisted. Subscribe to onAuthStateChange so we
      // continue the moment SIGNED_IN fires, with a 6 s safety net.
      const session = await new Promise<Session | null>((resolve) => {
        let done = false;
        const finish = (s: Session | null) => { if (done) return; done = true; resolve(s); };
        // Peek synchronously — if the SDK already has a session we
        // don't need to wait for an event.
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) finish(data.session);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
          if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && s) finish(s);
        });
        // Safety net — bail after 6 s so we never wedge here forever.
        setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          sub.subscription.unsubscribe();
          finish(data.session ?? null);
        }, 6000);
      });
      if (cancelled) return;

      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      const data = { session };

      // Drain pending account payload (set by SaveBriefPrompt before the
      // magic-link email was triggered). Best-effort — failures here
      // shouldn't block sign-in.
      const pending = getPendingAccount();
      if (pending) {
        setStatus(t("Saving your brief and profile…", "Сохраняем брифинг и профиль…"));
        try {
          await persistPendingAccount(data.session.user.id, pending);
        } catch (e) {
          console.warn("[AuthCallback] persist pending failed", e);
        }
        clearPendingAccount();
      }

      // Drain pending referral code (set by ReferralCaptor on any
      // landing page that had ?ref=CODE in the URL).
      const referralCode = getPendingReferral();
      if (referralCode) {
        setStatus(t("Linking your referral…", "Привязываем реферальный код…"));
        try {
          await supabase.functions.invoke("register-referral", {
            body: { code: referralCode },
          });
        } catch (e) {
          console.warn("[AuthCallback] register-referral failed", e);
        }
        clearPendingReferral();
      }

      // Cross-tab safe — localStorage survives the email-client opening
      // the magic link in a new tab. sessionStorage was per-tab and
      // silently lost the target on those flows.
      const dest = consumePostAuthRedirect() || "/account";
      navigate(dest, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
