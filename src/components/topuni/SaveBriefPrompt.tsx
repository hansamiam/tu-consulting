/**
 * SaveBriefPrompt
 *
 * Dialog that appears after a TopUni AI strategy brief finishes
 * generating, prompting the (anonymous) student to save their work
 * by signing up via magic link. The wedge: "Save my brief — get
 * deadline reminders" is a much stronger ask than "Sign up for an
 * account."
 *
 * Stashes the wizard's profile + the generated pathway into a
 * pending-account localStorage blob, then sends the magic-link email.
 * After the student clicks the link AuthCallback drains the blob into
 * their student_profiles + pathway_reports rows.
 *
 * Skipped when the student is already authed.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Check, Sparkles, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { setPendingAccount, type PendingAccountPayload } from "@/lib/pendingAccount";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-filled email from the wizard if available
  defaultEmail?: string;
  // The full payload to persist after magic-link verification
  payload: PendingAccountPayload;
  language?: "en" | "ru";
}

export function SaveBriefPrompt({ open, onOpenChange, defaultEmail, payload, language = "en" }: Props) {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const { user, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState<string>(defaultEmail ?? payload.profile.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already authed — nothing to do; the dialog should not have been shown
  if (user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setError(null);
    setSubmitting(true);

    // Stash the pending payload BEFORE triggering signup, so the magic
    // link returning into a fresh tab still has access to it via LS.
    setPendingAccount({
      ...payload,
      profile: { ...payload.profile, email: email.trim() },
      createdAt: Date.now(),
    });

    // Tell AuthCallback to send the user back to the AI dashboard
    try {
      sessionStorage.setItem("post_auth_redirect", isRu ? "/topuni-ai/ru" : "/topuni-ai");
    } catch { /* ignore */ }

    const { error: authErr } = await signInWithMagicLink(email.trim());
    setSubmitting(false);
    if (authErr) {
      setError(authErr);
      return;
    }
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-px w-6 bg-gold-dark" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
              {t("Keep your work", "Сохранить работу")}
            </span>
          </div>
          <DialogTitle className="font-heading text-xl tracking-tight">
            {t("Save your brief — and get deadline reminders.", "Сохраните брифинг — и получайте напоминания о дедлайнах.")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t(
              "Your brief, your saved scholarships, and your action-plan progress live on this device only. Sign up to make them permanent across devices, plus we'll email you when scholarship deadlines come up.",
              "Сейчас брифинг, сохранённые стипендии и прогресс плана хранятся только на этом устройстве. Зарегистрируйтесь — синхронизация на всех устройствах + напоминания о дедлайнах."
            )}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              <Check className="h-4 w-4" /> {t("Email sent", "Письмо отправлено")}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                `Check ${email} for the magic link. Click it and you're in — your brief and tracker move to your account automatically.`,
                `Проверьте ${email} — там ссылка для входа. Перейдите по ней, и ваш брифинг и список переедут на аккаунт автоматически.`
              )}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {t(
                "Don't see it? Check spam, or close and try again.",
                "Не видите? Проверьте спам или попробуйте ещё раз."
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider font-medium text-foreground">
                {t("Email", "Электронная почта")}
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="h-11"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-destructive leading-relaxed">{error}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t(
                "We'll email you a one-click link to verify. No password.",
                "Отправим ссылку для входа в один клик. Без пароля."
              )}
            </p>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                {t("Maybe later", "Позже")}
              </Button>
              <Button type="submit" variant="gold" disabled={submitting || !email.trim()} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("Sending…", "Отправляем…")}
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    {t("Send the link", "Отправить ссылку")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        <div className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-gold-dark" />
          {t(
            "What you get: deadline reminders, multi-device sync, the AI counselor with full context.",
            "Что вы получите: напоминания о дедлайнах, синхронизация на устройствах, AI-советник с полным контекстом."
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
