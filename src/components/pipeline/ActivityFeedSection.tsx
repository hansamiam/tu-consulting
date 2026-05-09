/**
 * ActivityFeedSection — bell-feed integrated into Workspace.
 *
 * The standalone ActivityBell in the nav was redundant once saved-search
 * alerts and tracker state both moved to Workspace. This section
 * surfaces the same events (saved-search hits, imminent deadlines,
 * tracker updates, lifecycle changes, brief-stale) at the top of
 * /pipeline so users see what changed since their last visit without
 * clicking a separate bell.
 *
 * Compact by default — collapses to a one-line "X updates" pill when
 * there's nothing urgent. Renders nothing for anon users.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useActivityFeed } from "@/hooks/useActivityFeed";

interface Props {
  language?: "en" | "ru";
}

export const ActivityFeedSection = ({ language = "en" }: Props) => {
  const navigate = useNavigate();
  const { events, unreadCount, markAllSeen } = useActivityFeed();
  const [open, setOpen] = useState(unreadCount > 0);
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);

  if (events.length === 0) return null;

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markAllSeen();
  };

  const titleText =
    unreadCount > 0
      ? t(`${unreadCount} update${unreadCount === 1 ? "" : "s"}`, `${unreadCount} ${unreadCount === 1 ? "обновление" : "обновлений"}`)
      : t(`${events.length} update${events.length === 1 ? "" : "s"}`, `${events.length} обновлений`);

  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-4 pb-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-foreground/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`relative inline-flex items-center justify-center h-8 w-8 rounded-md ${unreadCount > 0 ? "bg-gold/15 text-gold-dark" : "bg-muted text-muted-foreground"}`}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{titleText}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t(
                "Saved-search hits, deadline reminders, tracked-row changes — all in one place.",
                "Найденные совпадения, дедлайны, изменения по сохранённым строкам — в одном месте.",
              )}
            </p>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <ul className="mt-3 bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {events.slice(0, 8).map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  if (e.href) navigate(e.href);
                }}
                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <span className="shrink-0 mt-0.5">
                  {e.kind === "saved_search_alert" ? (
                    <Sparkles className="h-3.5 w-3.5 text-gold-dark" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/40 mt-1.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground font-medium leading-snug">{e.title}</p>
                  {e.meta && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{e.meta}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
          {events.length > 8 && (
            <li className="px-4 py-2.5 text-[11px] text-muted-foreground bg-muted/20">
              + {events.length - 8} {t("more", "ещё")}
            </li>
          )}
        </ul>
      )}
    </section>
  );
};
