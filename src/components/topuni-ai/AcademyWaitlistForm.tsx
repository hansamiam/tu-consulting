/* AcademyWaitlistForm — Discover v1 F12 brief-end signup.
 *
 * Single-line email form rendered at the bottom of the AI brief output
 * (after the 5 sections render). Calls the enroll-academy-waitlist edge
 * function; surfaces three states inline: idle / submitting / done.
 *
 * The submitted state is sticky — once the user signs up we keep the
 * "you're on the list" message visible so they don't think the form
 * vanished. localStorage flag prevents the form from re-appearing on
 * subsequent brief loads for the same email/source pair.
 *
 * Bilingual EN/RU. Date-free copy per plan F12: "transparency over
 * over-promising."
 *
 * Component is self-contained — parent only passes the `source` enum
 * value (which surface called it). Other waitlist surfaces use
 * different source values pointing at the same edge function.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

type Lang = "en" | "ru";
type Source =
  | "brief_end"
  | "discover_save"
  | "detail_sheet"
  | "hero_cta"
  | "expired_banner"
  | "manual";

interface Props {
  /** Where this form is rendered. Funnels analytics in the table. */
  source: Source;
  /** Optional pre-filled name (passed from the brief generator's profile). */
  defaultFullName?: string;
  /** Optional profile snapshot the backend stores for cohort assembly. */
  profileSnapshot?: Record<string, unknown>;
  /** Optional UUID linking back to the brief's match_run for funnel attribution. */
  matchRunId?: string;
  /** Optional UUID of the scholarship that triggered the CTA (detail-sheet path). */
  referringScholarshipId?: string;
  lang?: Lang;
  className?: string;
}

interface EnrollResponse {
  ok?: boolean;
  waitlist_id?: string;
  already_subscribed?: boolean;
  error?: string;
}

const COPY = {
  en: {
    headline: "Get notified when Top Uni Academy opens",
    sub: "Async cohorts, live group strategy, no date promised. We'll email when we open.",
    placeholder: "you@example.com",
    cta: "Join waitlist",
    submitting: "Joining…",
    done: "You're on the list. We'll email when we open.",
    alreadyDone: "You're already on the list.",
    invalidEmail: "Enter a valid email.",
    networkError: "Couldn't reach the server. Try again in a moment.",
  },
  ru: {
    headline: "Сообщим, когда Top Uni Academy откроется",
    sub: "Асинхронные когорты, живая стратегия в группах. Даты пока нет. Напишем, когда откроем.",
    placeholder: "you@example.com",
    cta: "В лист ожидания",
    submitting: "Записываем…",
    done: "Вы в списке. Напишем, когда откроем.",
    alreadyDone: "Вы уже в списке.",
    invalidEmail: "Введите корректный email.",
    networkError: "Не удалось связаться с сервером. Попробуйте ещё раз.",
  },
} as const;

const STORAGE_KEY_PREFIX = "topuni:academy-waitlist:";

function isValidEmail(email: string): boolean {
  if (!email || email.length < 5 || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const AcademyWaitlistForm = ({
  source,
  defaultFullName,
  profileSnapshot,
  matchRunId,
  referringScholarshipId,
  lang = "en",
  className = "",
}: Props) => {
  const c = COPY[lang === "ru" ? "ru" : "en"];
  const storageKey = `${STORAGE_KEY_PREFIX}${source}`;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "already">("idle");
  const [error, setError] = useState<string | null>(null);

  // Sticky-done: if this browser already signed up via this source,
  // skip the form entirely. Doesn't prevent re-signing via other sources
  // (each surface gets its own funnel slot in the table).
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") setState("already");
    } catch { /* private mode etc. — fall through */ }
  }, [storageKey]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError(c.invalidEmail);
      return;
    }
    setState("submitting");
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke<EnrollResponse>(
        "enroll-academy-waitlist",
        {
          body: {
            email: trimmed,
            source,
            full_name: defaultFullName,
            profile_snapshot: profileSnapshot,
            match_run_id: matchRunId,
            referring_scholarship_id: referringScholarshipId,
            language: lang,
          },
        },
      );
      if (invokeErr || !data?.ok) {
        setError(data?.error ?? c.networkError);
        setState("idle");
        return;
      }
      try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
      setState(data.already_subscribed ? "already" : "done");
    } catch {
      setError(c.networkError);
      setState("idle");
    }
  };

  if (state === "done" || state === "already") {
    return (
      <div
        className={[
          "rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4",
          "flex items-center gap-3",
          className,
        ].join(" ")}
      >
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
        <p className="text-sm text-emerald-900 dark:text-emerald-100">
          {state === "already" ? c.alreadyDone : c.done}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={[
        "rounded-xl border border-border/60 bg-muted/30 px-5 py-4 space-y-3",
        className,
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-semibold leading-tight">{c.headline}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">{c.sub}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={c.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={state === "submitting"}
          className="flex-1"
          aria-label={c.placeholder}
        />
        <Button type="submit" disabled={state === "submitting"} className="shrink-0">
          {state === "submitting" ? c.submitting : c.cta}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </form>
  );
};

export default AcademyWaitlistForm;
