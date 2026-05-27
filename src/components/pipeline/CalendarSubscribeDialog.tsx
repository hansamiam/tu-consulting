/* CalendarSubscribeDialog — surfaces the subscribable ICS calendar feed.
 *
 * Why this is high-leverage: once the student adds the feed to Apple
 * Calendar / Google Calendar / Outlook, every saved deadline becomes
 * a native-OS reminder. New deadlines saved later auto-appear via
 * the standard iCal refresh. Compounding retention surface that
 * survives even if the student stops opening our website.
 *
 * Auth model: the per-user feed token IS the auth (same pattern as
 * Google Calendar's secret-address feed). Token is revocable; this
 * dialog also exposes the rotate action for that case. */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Calendar, Copy, Check, RefreshCw, ExternalLink, Apple, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: "en" | "ru";
}

const SITE = typeof window !== "undefined" ? window.location.origin : "https://topuni.org";

export const CalendarSubscribeDialog = ({ open, onOpenChange, language = "en" }: Props) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch / mint the token on first open.
  useEffect(() => {
    if (!open) return;
    track("calendar_subscribe_opened", { language });
    if (token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_or_create_my_calendar_token");
      if (cancelled) return;
      if (error) {
        // Don't surface raw Postgres error codes / messages to the
        // user — they're confusing. Special-case the common auth
        // failure; everything else gets a generic try-again toast
        // with the raw message logged to console for debugging.
        if (error.message.includes("Not authenticated")) {
          toast.error(t("Sign in to subscribe to your deadlines.", "Войдите, чтобы подписаться на дедлайны."));
        } else {
          console.warn("[calendar-subscribe] token fetch failed", error);
          toast.error(t("Couldn't generate calendar link. Try again.", "Не удалось создать ссылку календаря. Попробуйте снова."));
        }
      } else if (typeof data === "string") {
        setToken(data);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const feedUrl = token ? `${SITE}/calendar.ics?token=${token}` : "";
  // webcal:// scheme = "subscribe to" rather than "download once" on
  // most desktop calendar clients (Apple, Outlook). Some browsers treat
  // it as a custom protocol and prompt the user to confirm — exactly
  // what we want.
  const webcalUrl = token ? `webcal://${SITE.replace(/^https?:\/\//, "")}/calendar.ics?token=${token}` : "";
  // Google Calendar deep link — adds the URL as a subscribed calendar.
  const googleUrl = token ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedUrl)}` : "";

  const copy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success(t("Feed URL copied", "URL ленты скопирован"));
      track("calendar_subscribe_clicked", { method: "copy_url" });
    } catch {
      toast.error(t("Couldn't copy — select and copy manually.", "Не удалось скопировать."));
    }
  };

  const rotate = async () => {
    if (!confirm(t(
      "Rotate token? Existing calendar subscribers will stop syncing until they re-add the new URL.",
      "Сменить токен? Текущие подписки перестанут синхронизироваться, пока вы не добавите новый URL.",
    ))) return;
    setRotating(true);
    const { data, error } = await supabase.rpc("rotate_my_calendar_token");
    setRotating(false);
    if (error) {
      console.warn("[calendar-subscribe] rotate failed", error);
      toast.error(t("Couldn't rotate the token. Try again.", "Не удалось сменить токен. Попробуйте снова."));
      return;
    }
    if (typeof data === "string") {
      setToken(data);
      track("calendar_token_rotated");
      toast.success(t("New token minted.", "Новый токен создан."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-gold-dark to-gold text-primary ring-1 ring-gold/40">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="font-heading text-lg tracking-tight">
                {t("Sync deadlines to your calendar", "Дедлайны в ваш календарь")}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {t(
              "Subscribe once and every saved scholarship deadline appears in Apple Calendar, Google Calendar, or Outlook — with 7-day and 1-day reminders. New saves sync automatically.",
              "Подпишитесь один раз — все сохранённые дедлайны появятся в Apple Calendar, Google Calendar или Outlook, с напоминаниями за 7 и 1 день. Новые добавления синхронизируются автоматически.",
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("Preparing your feed…", "Готовим вашу ленту…")}
          </div>
        ) : token ? (
          <>
            {/* Feed URL — read-only-looking input + copy button */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                {t("Your private feed URL", "Ваш приватный URL ленты")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] text-foreground/85 break-all leading-relaxed font-mono select-all">
                  {feedUrl}
                </code>
                <Button size="sm" variant="outline" className="shrink-0 h-8" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-2 leading-snug">
                {t(
                  "Anyone with this URL can read your deadline list. Don't share it.",
                  "Любой с этим URL может читать ваши дедлайны. Не делитесь им.",
                )}
              </p>
            </div>

            {/* One-click subscribe shortcuts per OS */}
            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              <Button
                asChild
                variant="outline"
                className="justify-start gap-2 h-auto py-2.5"
                onClick={() => track("calendar_subscribe_clicked", { method: "webcal" })}
              >
                <a href={webcalUrl} target="_blank" rel="noopener noreferrer">
                  <Apple className="h-4 w-4 shrink-0" />
                  <span className="text-left">
                    <span className="block text-xs font-semibold">{t("Apple Calendar", "Apple Calendar")}</span>
                    <span className="block text-[10px] text-muted-foreground">{t("One-click subscribe", "Подписаться")}</span>
                  </span>
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="justify-start gap-2 h-auto py-2.5"
                onClick={() => track("calendar_subscribe_clicked", { method: "google" })}
              >
                <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="text-left">
                    <span className="block text-xs font-semibold">{t("Google Calendar", "Google Calendar")}</span>
                    <span className="block text-[10px] text-muted-foreground">{t("Add via URL", "Добавить по URL")}</span>
                  </span>
                </a>
              </Button>
            </div>

            {/* Manual instructions for everyone else */}
            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1.5">
                <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                {t("Outlook / other clients", "Outlook / другие клиенты")}
              </summary>
              <ol className="mt-2 ml-5 list-decimal text-xs text-muted-foreground leading-relaxed space-y-1">
                <li>{t("Copy the feed URL above.", "Скопируйте URL ленты выше.")}</li>
                <li>{t("Open your calendar app's \"Add calendar from URL\" / \"Subscribe by URL\" option.", "Откройте опцию «Добавить календарь по URL» в вашем приложении.")}</li>
                <li>{t("Paste and confirm. Your deadlines will appear within minutes.", "Вставьте URL и подтвердите. Дедлайны появятся через несколько минут.")}</li>
              </ol>
            </details>

            {/* Rotate (footer) */}
            <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/60">
              <button
                onClick={() => void rotate()}
                disabled={rotating}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {rotating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {t("Rotate token", "Сменить токен")}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-6">
            {t(
              "Couldn't generate a feed token. Sign in and try again, or DM @top_uni_consulting on Instagram.",
              "Не удалось создать токен. Войдите и попробуйте снова или напишите @top_uni_consulting в Instagram.",
            )}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
