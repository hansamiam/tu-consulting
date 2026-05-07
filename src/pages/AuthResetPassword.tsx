/* /auth/reset-password — landing page the password-reset email link
 * sends the user to. Supabase has already established a temporary
 * session by the time this page mounts (the URL fragment carries the
 * recovery tokens), so we can call updateUser({ password }) directly
 * to set the new password.
 *
 * After success, the user is signed in with the new password and we
 * redirect them to /account. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";

const MIN_PASSWORD = 8;
// Reset links are short-lived (Supabase default ~1h). If the recovery
// session hasn't established within this window the link is almost
// certainly expired/malformed; show an actionable error rather than
// spinning forever.
const RECOVERY_TIMEOUT_MS = 8000;

interface Props { language?: "en" | "ru"; }

const AuthResetPassword = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Wait for Supabase to parse the recovery hash + establish the session.
  useEffect(() => {
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (ok) setReady(true);
      else setExpired(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") settle(true);
    });
    // Also handle the case where the session is already restored
    // (refresh after navigating here).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) settle(true);
    });
    // Failsafe: if neither auth event nor existing session resolves
    // within the timeout, the recovery token is invalid/expired and the
    // page would otherwise stay on the spinner indefinitely.
    const timer = setTimeout(() => settle(false), RECOVERY_TIMEOUT_MS);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      toast.error(t(`Password needs at least ${MIN_PASSWORD} characters.`,
        `Минимум ${MIN_PASSWORD} символов в пароле.`));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Password updated. You're signed in.",
      "Пароль обновлён. Вы вошли в аккаунт."));
    navigate(ru ? "/account/ru" : "/account", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />
      <main className="max-w-md mx-auto px-5 py-16">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
          {t("Set a new password", "Установить новый пароль")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("Pick a password you'll remember. You'll be signed in right after.",
            "Выберите запоминающийся пароль. После сохранения вы сразу войдёте.")}
        </p>

        {expired ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-semibold text-destructive mb-1">
                {t("This reset link has expired", "Срок ссылки истёк")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "Reset links are valid for about an hour. Request a new one and check your email — newer links override older ones.",
                  "Ссылки действуют около часа. Запросите новую и проверьте почту — новая ссылка отменяет старые.",
                )}
              </p>
            </div>
            <Button
              onClick={() => navigate(ru ? "/account/ru" : "/account", { replace: true })}
              className="w-full h-11"
            >
              {t("Request a new reset link", "Запросить новую ссылку")}
            </Button>
          </div>
        ) : !ready ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("Verifying reset link…", "Проверяем ссылку…")}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("New password", "Новый пароль")}
                required
                minLength={MIN_PASSWORD}
                autoComplete="new-password"
                className="h-11 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={showPassword
                  ? t("Hide password", "Скрыть пароль")
                  : t("Show password", "Показать пароль")}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t(`At least ${MIN_PASSWORD} characters.`,
                `Минимум ${MIN_PASSWORD} символов.`)}
            </p>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                t("Set new password", "Сохранить пароль")}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
};

export default AuthResetPassword;
