// FirstWeekActivationCard — renders only on the Stripe-success landing
// (?subscribed=1). Three CTAs that collapse the "I just paid, what now?"
// gap into a 30-second activation moment. Reads the next published
// workshop from academy_workshops so RSVP is concrete, not abstract.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, BookOpen, FileText } from "lucide-react";

interface Props { language?: "en" | "ru"; }

interface NextWorkshop {
  title: string;
  scheduled_for: string;
  kind: string;
}

export const FirstWeekActivationCard = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const [next, setNext] = useState<NextWorkshop | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("academy_workshops")
        .select("title, scheduled_for, kind")
        .eq("is_published", true)
        .gt("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) setNext(data as NextWorkshop);
    })();
  }, []);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(ru ? "ru-RU" : "en-US", {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <section className="rounded-lg border border-gold/40 bg-gold/5 p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold-dark font-semibold mb-2">
        {t("Your first week", "Ваша первая неделя")}
      </p>
      <h2 className="font-heading text-lg sm:text-xl font-bold mb-4 text-foreground">
        {t("Three things to do right now", "Три шага прямо сейчас")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          to={ru ? "/academy/ru" : "/academy"}
          className="flex flex-col gap-1 rounded-md bg-background p-3 border border-border/70 hover:border-gold-dark/60 transition"
        >
          <Calendar className="w-4 h-4 text-gold-dark" />
          <p className="text-xs font-semibold">{t("Next workshop", "Ближайший воркшоп")}</p>
          {next ? (
            <p className="text-xs text-muted-foreground leading-snug">
              <span className="text-foreground font-medium">{next.title}</span><br />
              {fmtDate(next.scheduled_for)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground leading-snug">
              {t("Calendar opens when the next session is scheduled.", "Когда добавим следующую сессию — появится в календаре.")}
            </p>
          )}
        </Link>
        <Link
          to={ru ? "/discover/ru" : "/discover"}
          className="flex flex-col gap-1 rounded-md bg-background p-3 border border-border/70 hover:border-gold-dark/60 transition"
        >
          <BookOpen className="w-4 h-4 text-gold-dark" />
          <p className="text-xs font-semibold">{t("Save 5 scholarships", "Сохрани 5 стипендий")}</p>
          <p className="text-xs text-muted-foreground leading-snug">
            {t("Members who win save 5+ in their first week.", "Победители сохраняют 5+ в первую неделю.")}
          </p>
        </Link>
        <Link
          to={ru ? "/topuni-ai/ru" : "/topuni-ai"}
          className="flex flex-col gap-1 rounded-md bg-background p-3 border border-border/70 hover:border-gold-dark/60 transition"
        >
          <FileText className="w-4 h-4 text-gold-dark" />
          <p className="text-xs font-semibold">{t("Read your strategy", "Прочитай стратегию")}</p>
          <p className="text-xs text-muted-foreground leading-snug">
            {t("Your AI strategy report is on the dashboard.", "Ваш AI-отчёт уже в дашборде.")}
          </p>
        </Link>
      </div>
    </section>
  );
};
