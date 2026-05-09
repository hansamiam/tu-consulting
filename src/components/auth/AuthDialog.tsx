import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { setPostAuthRedirect, consumePostAuthRedirect } from "@/lib/postAuthRedirect";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  language?: "en" | "ru";
  /** Initial mode — defaults to "signin". Pass "signup" when the prompt
   *  is wedged into a flow that's clearly creating a new account
   *  (SaveBriefPrompt, founding-member CTA, etc.). */
  initialMode?: "signin" | "signup";
};

type Mode = "signin" | "signup" | "reset";

const MIN_PASSWORD = 8;

/* AuthDialog — primary auth surface. Two paths only: Google OAuth
 * (top option, cleanest first-tap) or email + password.
 *
 * Three modes share the dialog:
 *   · signin → email + password
 *   · signup → email + password (with min-length hint)
 *   · reset  → email only, sends Supabase reset email
 */
export const AuthDialog = ({
  open,
  onOpenChange,
  title,
  description,
  language = "en",
  initialMode = "signin",
}: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const { signInWithPassword, signUpWithPassword, sendPasswordReset, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    if (mode === "reset") {
      const { error } = await sendPasswordReset(email.trim());
      setLoading(false);
      if (error) { toast.error(error); return; }
      setResetSent(true);
      return;
    }

    if (!password) { setLoading(false); return; }
    if (mode === "signup" && password.length < MIN_PASSWORD) {
      toast.error(t(`Password needs at least ${MIN_PASSWORD} characters.`, `Минимум ${MIN_PASSWORD} символов в пароле.`));
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      // If email-confirmation is required the user round-trips through
      // /auth/callback after clicking the email link. Pre-set a Russian
      // redirect so they land back on the same locale they signed up
      // from instead of defaulting to English /account.
      if (ru) {
        const existing = consumePostAuthRedirect();
        if (existing) setPostAuthRedirect(existing);
        else setPostAuthRedirect(window.location.pathname || "/account/ru");
      }
      const { error, needsConfirmation } = await signUpWithPassword(email.trim(), password);
      setLoading(false);
      if (error) { toast.error(error); return; }
      if (needsConfirmation) {
        toast.success(
          t("Account created — check your email to confirm and finish signing in.",
            "Аккаунт создан — проверьте email для подтверждения."),
        );
      } else {
        toast.success(t("Account created — you're signed in.", "Аккаунт создан — вы вошли."));
      }
      onOpenChange(false);
      return;
    }

    const { error } = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (error) {
      if (/invalid (login|credentials)/i.test(error)) {
        toast.error(
          t("Wrong email or password. New here? Switch to Sign up.",
            "Неверный email или пароль. Новый аккаунт? Переключитесь на Регистрацию."),
        );
      } else {
        toast.error(error);
      }
      return;
    }
    onOpenChange(false);
  };

  const handleGoogle = async () => {
    // Preserve the language the user is currently in. Without this a
    // Russian visitor signing in via Google from /account/ru lands on
    // /account (English) post-OAuth because AuthCallback's default is
    // English. Only set if no other surface (Pricing, SaveBriefPrompt)
    // has already claimed the redirect — peek-and-restore so we don't
    // clobber an existing claim.
    const existing = consumePostAuthRedirect();
    if (existing) {
      setPostAuthRedirect(existing);
    } else if (ru) {
      setPostAuthRedirect(window.location.pathname || "/account/ru");
    }
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error);
      setLoading(false);
    }
  };

  const titleByMode = {
    signin: t("Sign in to continue", "Войдите, чтобы продолжить"),
    signup: t("Create your TopUni account", "Создать аккаунт TopUni"),
    reset:  t("Reset your password", "Сброс пароля"),
  }[mode];

  const descByMode = {
    signin: t("Email and password — no email round-trip.", "Email и пароль — без писем."),
    signup: t("Pick a password you'll remember. We'll save your brief and pipeline to your account.", "Выберите пароль. Брифинг и воронка сохранятся в вашем аккаунте."),
    reset:  t("Enter your email; we'll send a link to set a new password.", "Введите email — пришлём ссылку для нового пароля."),
  }[mode];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? titleByMode}</DialogTitle>
          <DialogDescription>{description ?? descByMode}</DialogDescription>
        </DialogHeader>

        {resetSent ? (
          <div className="text-center py-6 space-y-2">
            <p className="font-semibold text-foreground">{t("Check your email", "Проверьте почту")}</p>
            <p className="text-sm text-muted-foreground">
              {ru
                ? <>Мы отправили ссылку для сброса пароля на <strong>{email}</strong>.</>
                : <>We sent a password-reset link to <strong>{email}</strong>.</>}
            </p>
            <Button variant="ghost" size="sm" onClick={() => { setMode("signin"); reset(); }} className="text-muted-foreground mt-2">
              {t("Back to sign in", "Назад к входу")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2"
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {t("Continue with Google", "Войти через Google")}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">{t("or", "или")}</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="h-11"
              />
              {mode !== "reset" && (
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t("Password", "Пароль")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "signup" ? MIN_PASSWORD : undefined}
                    disabled={loading}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t("Hide password", "Скрыть пароль") : t("Show password", "Показать пароль")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <p className="text-[11px] text-muted-foreground">
                  {t(`At least ${MIN_PASSWORD} characters.`, `Минимум ${MIN_PASSWORD} символов.`)}
                </p>
              )}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  mode === "signin" ? t("Sign in", "Войти") :
                  mode === "signup" ? t("Create account", "Создать аккаунт") :
                                      t("Send reset link", "Отправить ссылку")}
              </Button>
            </form>

            <div className="flex items-center justify-between text-xs">
              {mode === "signin" ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setPassword(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("New here? Sign up", "Новый аккаунт? Регистрация")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("reset"); setPassword(""); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("Forgot password?", "Забыли пароль?")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setPassword(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  {t("Already have an account? Sign in", "Уже есть аккаунт? Войти")}
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {ru
                ? <>Продолжая, вы соглашаетесь с <a href="/public-offer" className="underline">условиями</a> и <a href="/privacy-policy" className="underline">политикой конфиденциальности</a>.</>
                : <>By continuing you agree to our <a href="/public-offer" className="underline">Terms</a> and <a href="/privacy-policy" className="underline">Privacy Policy</a>.</>}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
