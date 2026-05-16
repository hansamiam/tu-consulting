import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ENV, EDGE_FUNCTIONS_URL } from "@/lib/env";

/* Bilingual unsubscribe surface. Detects language from the
 * ?lang=ru URL param (added by RU-language transactional emails)
 * or falls back to the browser's locale. The token-based unsub
 * flow is unchanged. */

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  // Language: explicit param wins, then nav locale, then English.
  const langParam = (params.get("lang") || "").toLowerCase();
  const isRu = langParam === "ru" ||
    (!langParam && typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().startsWith("ru"));
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const [state, setState] = useState<"loading" | "valid" | "used" | "invalid" | "done" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const url = `${EDGE_FUNCTIONS_URL}/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: ENV.SUPABASE_PUBLISHABLE_KEY } })
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
        <h1 className="text-2xl font-bold">{t("Email preferences", "Настройки рассылки")}</h1>
        {state === "loading" && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p>{t("Checking your link…", "Проверяем ссылку…")}</p>
          </div>
        )}
        {state === "valid" && (
          <>
            <p>
              {isRu
                ? <>Отписать {email ? <strong>{email}</strong> : "этот адрес"} от писем TopUni?</>
                : <>Unsubscribe {email ? <strong>{email}</strong> : "this address"} from TopUni emails?</>}
            </p>
            <Button onClick={confirm} className="w-full">
              {t("Confirm unsubscribe", "Отписаться")}
            </Button>
          </>
        )}
        {state === "used" && (
          <p>{t("You're already unsubscribed. No further emails will be sent.", "Вы уже отписаны. Письма больше не будут приходить.")}</p>
        )}
        {state === "done" && (
          <p className="inline-flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400">
            <Check className="w-4 h-4" />
            {t("Done. You won't receive emails from us anymore.", "Готово. Письма от нас больше не будут приходить.")}
          </p>
        )}
        {state === "invalid" && (
          <p>{t("This link is invalid or expired.", "Эта ссылка недействительна или истекла.")}</p>
        )}
        {state === "error" && (
          <>
            <p>{t("Something went wrong. Please try again.", "Что-то пошло не так. Попробуйте снова.")}</p>
            <Button onClick={confirm} variant="outline" className="w-full">
              {t("Retry", "Повторить")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
