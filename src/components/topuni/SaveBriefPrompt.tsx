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
import { Loader2, Sparkles, Bookmark, Clock, Bot, Eye, EyeOff } from "lucide-react";
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
  /* Optional concrete user stats — when supplied, the dialog quantifies
     what the user actually has (and would lose) instead of generic copy.
     Each is independently optional: missing → falls back to the generic
     line for that bullet. */
  liveMatchCount?: number;
  savedCount?: number;
  /** Closest urgent saved-deadline summary, e.g. { name: "Schwarzman", days: 11 }.
   *  Shown when the user has any saved scholarship with a deadline in
   *  the next 30 days — the line lands as concrete loss-aversion. */
  closestUrgent?: { name: string; days: number } | null;
}

export function SaveBriefPrompt({
  open, onOpenChange, defaultEmail, payload, language = "en",
  liveMatchCount, savedCount, closestUrgent,
}: Props) {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const { user, signUpWithPassword, signInWithPassword } = useAuth();
  const [email, setEmail] = useState<string>(defaultEmail ?? payload.profile.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already authed — nothing to do; the dialog should not have been shown
  if (user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || submitting) return;
    if (password.length < 8) {
      setError(t("Password needs at least 8 characters.", "Пароль — минимум 8 символов."));
      return;
    }
    setError(null);
    setSubmitting(true);

    // Stash the pending payload BEFORE the auth call, so AuthContext's
    // post-sign-in drain can pick it up the moment SIGNED_IN fires.
    setPendingAccount({
      ...payload,
      profile: { ...payload.profile, email: email.trim() },
      createdAt: Date.now(),
    });

    // Try sign-up first. If the email already has an account, fall back
    // to sign-in with the same password — saves the user one click and
    // routes returning students into the same flow.
    let result = await signUpWithPassword(email.trim(), password);
    let confirmationPending = !!result.needsConfirmation;
    if (result.error && /already (registered|exists)|user.*exists/i.test(result.error)) {
      const r = await signInWithPassword(email.trim(), password);
      result = { error: r.error };
      confirmationPending = false;
    }
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (confirmationPending) {
      setError(t(
        "Account created — check your email to confirm. Your brief is saved and waiting.",
        "Аккаунт создан — подтвердите email. Брифинг сохранён и ждёт вас.",
      ));
      // Don't close — keep the message visible so the user knows what to do next.
      return;
    }
    // Drain runs from AuthContext; close the dialog so the dashboard
    // re-renders as authed.
    onOpenChange(false);
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
            {closestUrgent && closestUrgent.days <= 14
              ? t(
                  `${closestUrgent.name} closes in ${closestUrgent.days} day${closestUrgent.days === 1 ? "" : "s"} — don't lose it.`,
                  `${closestUrgent.name} закрывается через ${closestUrgent.days} дн. — не теряйте.`,
                )
              : t("Save your strategy report — and get deadline reminders.", "Сохраните отчёт — и получайте напоминания о дедлайнах.")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t(
              "Right now everything lives on this browser only — clear your cookies and it's gone. Pick an email + password and we'll keep your brief across devices plus remind you before each deadline.",
              "Сейчас всё хранится только в этом браузере — очистите cookies и оно пропадёт. Email + пароль — синхронизация на всех устройствах и напоминания за день до каждого дедлайна.",
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Concrete stats strip — shows the user EXACTLY what they have on
            this device. Loss aversion is much sharper than generic
            "save your work." Each item only renders if we have a real
            count; the strip itself hides if there's nothing to show. */}
        {(liveMatchCount || savedCount || closestUrgent) && (
          <div className="grid grid-cols-3 gap-2 -mx-1 mb-1">
            {typeof liveMatchCount === "number" && liveMatchCount > 0 && (
              <div className="flex flex-col items-start gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
                <p className="font-heading font-bold text-base text-foreground tabular-nums leading-none">{liveMatchCount}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold leading-snug">
                  {t("matches", "совпадений", )}
                </p>
              </div>
            )}
            {typeof savedCount === "number" && savedCount > 0 && (
              <div className="flex flex-col items-start gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <Bookmark className="w-3.5 h-3.5 text-gold-dark" />
                <p className="font-heading font-bold text-base text-foreground tabular-nums leading-none">{savedCount}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold leading-snug">
                  {t("saved", "сохранено")}
                </p>
              </div>
            )}
            {closestUrgent && closestUrgent.days >= 0 && closestUrgent.days <= 30 && (
              <div className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 ${
                closestUrgent.days <= 7
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}>
                <Clock className={`w-3.5 h-3.5 ${closestUrgent.days <= 7 ? "text-destructive" : "text-amber-700 dark:text-amber-500"}`} />
                <p className={`font-heading font-bold text-base tabular-nums leading-none ${
                  closestUrgent.days <= 7 ? "text-destructive" : "text-amber-700 dark:text-amber-500"
                }`}>
                  {closestUrgent.days === 0
                    ? t("Today", "Сегодня")
                    : closestUrgent.days === 1
                      ? t("1 day", "1 дн.")
                      : `${closestUrgent.days} ${t("days", "дн.")}`}
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold leading-snug">
                  {t("next deadline", "след. дедлайн")}
                </p>
              </div>
            )}
          </div>
        )}

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
              autoComplete="email"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-medium text-foreground">
              {t("Password", "Пароль")}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("Min 8 characters", "Минимум 8 символов")}
                className="h-11 pr-10"
                autoComplete="new-password"
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
          </div>
          {error && (
            <p className="text-xs text-destructive leading-relaxed">{error}</p>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(
              "Already have an account? Same email + password signs you in.",
              "Уже есть аккаунт? Тот же email и пароль — войдёте."
            )}
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Maybe later", "Позже")}
            </Button>
            <Button type="submit" variant="gold" disabled={submitting || !email.trim() || !password} className="gap-1.5">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Saving…", "Сохраняем…")}
                </>
              ) : (
                t("Save my report", "Сохранить отчёт")
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground/80 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <Clock className="w-3 h-3 text-gold-dark shrink-0 mt-0.5" />
            <span>{t("Deadline reminders before each scholarship closes.", "Напоминания за день до каждого дедлайна.")}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Bot className="w-3 h-3 text-gold-dark shrink-0 mt-0.5" />
            <span>{t("AI counselor with full memory of your profile + brief.", "AI-советник со всей вашей историей.")}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Sparkles className="w-3 h-3 text-gold-dark shrink-0 mt-0.5" />
            <span>{t("Brief + saved scholarships sync across every device.", "Брифинг и сохранённые стипендии — синхронно на всех устройствах.")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
