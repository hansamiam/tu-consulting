import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  language?: "en" | "ru";
};

export const AuthDialog = ({
  open,
  onOpenChange,
  title,
  description,
  language = "en",
}: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const { signInWithMagicLink, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await signInWithMagicLink(email.trim());
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSent(false); setEmail(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t("Sign in to continue", "Войдите, чтобы продолжить")}</DialogTitle>
          <DialogDescription>
            {description ?? t("We'll email you a one-tap link. No password needed.", "Отправим ссылку на email — войти в один клик. Пароль не нужен.")}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <h3 className="font-semibold text-lg">{t("Check your email", "Проверьте почту")}</h3>
            <p className="text-sm text-muted-foreground">
              {ru
                ? <>Мы отправили ссылку для входа на <strong>{email}</strong>. Нажмите её — и вы внутри.</>
                : <>We sent a sign-in link to <strong>{email}</strong>. Click it and you're in.</>}
            </p>
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

            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
              <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {t("Send magic link", "Отправить ссылку для входа")}
              </Button>
            </form>

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
