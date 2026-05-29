// UpcomingWorkshopsTeaser — public-readable list of the next 3 published
// workshops (title + date + kind label only — no Zoom link). Sells the
// "every 2 weeks" cadence the Pricing page promises by showing concrete
// scheduled sessions. Self-hides when no upcoming rows exist (avoids the
// "shrug" empty state).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

interface Props { language?: "en" | "ru"; }

interface UpcomingRow {
  id: string;
  title: string;
  kind: string;
  scheduled_for: string;
  summary: string | null;
}

const KIND_LABEL_EN: Record<string, string> = {
  workshop: "Workshop",
  office_hours: "Office hours",
  guide: "Guide",
};

const KIND_LABEL_RU: Record<string, string> = {
  workshop: "Воркшоп",
  office_hours: "Office hours",
  guide: "Гайд",
};

export const UpcomingWorkshopsTeaser = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, r: string) => (ru ? r : en);
  const [rows, setRows] = useState<UpcomingRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("academy_workshops")
        .select("id, title, kind, scheduled_for, summary")
        .eq("is_published", true)
        .gt("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(3);
      if (data) setRows(data as UpcomingRow[]);
    })();
  }, []);

  if (rows.length === 0) return null;

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(ru ? "ru-RU" : "en-US", {
        weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 pt-6 pb-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-dark font-semibold mb-3 text-center">
        {t("Upcoming live sessions", "Ближайшие сессии")}
      </p>
      <h2 className="font-heading text-2xl sm:text-3xl font-bold mb-5 text-center tracking-tight">
        {t("Every two weeks, on the calendar", "Каждые две недели, по расписанию")}
      </h2>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border border-border/70 bg-card p-4 flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gold-dark shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {(ru ? KIND_LABEL_RU : KIND_LABEL_EN)[r.kind] ?? r.kind}
              </p>
              <p className="font-medium text-foreground text-sm sm:text-base mt-0.5">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fmt(r.scheduled_for)}</p>
              {r.summary && <p className="text-xs text-muted-foreground mt-1 leading-snug">{r.summary}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground text-center mt-3">
        {t(
          "Members get the Zoom link by email 24h before each session.",
          "Участники получают ссылку Zoom за 24 часа до сессии.",
        )}
      </p>
    </section>
  );
};
