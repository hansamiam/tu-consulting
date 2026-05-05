/**
 * ActivityBell — bell icon + dropdown with the user's pending in-app
 * activity (deadline reminders, saved-search match digests, tracked-
 * scholarship updates, lifecycle reopens). Auto-hides for anon users
 * since most events require tracker / saved-search data to exist.
 *
 * Click → popover opens → markAllSeen() → unread count drops to zero.
 * Each event is a link; clicking navigates.
 *
 * Sits in DiscoverAppBar / global Navigation — single bell across the
 * product, the canonical "what's new for me" surface.
 */
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, BookmarkCheck, RefreshCcw, Inbox, ArrowRight, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityFeed, type ActivityEvent } from "@/hooks/useActivityFeed";
import { formatDistanceToNow } from "date-fns";

const ICON_FOR: Record<ActivityEvent["kind"], React.ComponentType<{ className?: string }>> = {
  saved_search_alert: BookmarkCheck,
  deadline_imminent: Calendar,
  deadline_today: Calendar,
  tracker_updated: RefreshCcw,
  lifecycle_change: RefreshCcw,
  brief_stale: Sparkles,
};

const TONE_FOR: Record<ActivityEvent["kind"], string> = {
  saved_search_alert: "text-gold-dark",
  deadline_imminent: "text-amber-700 dark:text-amber-400",
  deadline_today: "text-destructive",
  tracker_updated: "text-muted-foreground",
  lifecycle_change: "text-muted-foreground",
  brief_stale: "text-gold-dark",
};

interface Props {
  language?: "en" | "ru";
  /** Visual emphasis on the trigger when on a dark/overlay nav. */
  variant?: "default" | "overlay";
}

export const ActivityBell = ({ language = "en", variant = "default" }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, unreadCount, markAllSeen } = useActivityFeed();
  const ru = language === "ru";

  // Anon users have nothing to show — hide the bell entirely so the nav
  // doesn't read as "you're missing something" before sign-in.
  if (!user) return null;

  const triggerCls = variant === "overlay"
    ? "text-primary-foreground/80 hover:text-primary-foreground"
    : "text-muted-foreground hover:text-foreground";

  return (
    <Popover onOpenChange={(o) => { if (o) markAllSeen(); }}>
      <PopoverTrigger asChild>
        <button
          aria-label={ru ? "Уведомления" : "Notifications"}
          className={`relative inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-foreground/[0.05] transition-colors ${triggerCls}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-gold text-primary text-[10px] font-bold tabular-nums shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border bg-canvas-soft/50">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {ru ? "Активность" : "Activity"}
          </p>
          <p className="text-sm font-heading font-semibold text-foreground mt-0.5 leading-tight">
            {events.length === 0
              ? ru ? "Всё спокойно — новых событий нет" : "All caught up"
              : ru ? `${events.length} ${events.length === 1 ? "обновление" : "обновлений"}` : `${events.length} ${events.length === 1 ? "update" : "updates"}`}
          </p>
        </div>
        {events.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Inbox className="h-7 w-7 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {ru
                ? "Сохраните стипендию или запрос — мы сообщим о новых совпадениях и приближающихся дедлайнах."
                : "Save a scholarship or a search — we'll surface new matches and approaching deadlines here."}
            </p>
          </div>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto">
            {events.slice(0, 20).map((evt) => {
              const Icon = ICON_FOR[evt.kind];
              const tone = TONE_FOR[evt.kind];
              return (
                <li key={evt.id} className="border-b border-border/50 last:border-0">
                  <button
                    onClick={() => { if (evt.href) navigate(evt.href); }}
                    className="w-full text-left px-4 py-3 hover:bg-foreground/[0.025] transition-colors flex gap-2.5 items-start"
                  >
                    <span className={`mt-0.5 ${tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground leading-snug truncate">
                        {evt.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {evt.meta && <span>{evt.meta}</span>}
                        {evt.meta && <span className="mx-1.5">·</span>}
                        <span>{formatDistanceToNow(new Date(evt.occurredAt), { addSuffix: true })}</span>
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 mt-1.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
