/**
 * CurrentCohort — member-facing section on /academy.
 *
 * Renders the "current cohort" — the open/in_progress cohort whose window
 * includes now (or starts in the next 30 days). Shows the cohort name,
 * dates, and next 3 events. Members see the full calendar; non-members
 * see a teaser CTA pointing at the membership upgrade.
 *
 * RLS does the gating server-side:
 *   - public.cohorts: SELECT allowed for any non-draft cohort
 *   - public.cohort_events: SELECT gated by has_active_membership(auth.uid())
 *
 * So even if a non-member's request reaches the events query, they get
 * an empty result. The component falls through to the teaser UI in that
 * case. We also check `subscription` from useAuth to short-circuit the
 * extra query for known non-members.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, Lock, ExternalLink, Users } from "lucide-react";

// Cast through any until npm run gen:types regenerates database.types.ts
// after PR #63 (B1 v2 cohorts schema) lands.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface CohortRow {
  cohort_id: string;
  slug: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
}

interface EventRow {
  event_id: string;
  kind: "group_call" | "workshop" | "office_hours" | "external";
  title: string;
  starts_at: string;
  ends_at: string;
  meeting_url: string | null;
}

interface Props {
  language?: "en" | "ru";
}

const t = (en: string, ru: string, isRu: boolean) => (isRu ? ru : en);

const KIND_LABEL = {
  en: {
    group_call: "Group call",
    workshop: "Workshop",
    office_hours: "Office hours",
    external: "Guest speaker",
  },
  ru: {
    group_call: "Групповой звонок",
    workshop: "Воркшоп",
    office_hours: "Office hours",
    external: "Гостевой спикер",
  },
} as const;

function formatEventTime(iso: string, isRu: boolean): string {
  try {
    return new Date(iso).toLocaleString(isRu ? "ru-RU" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateRange(start: string, end: string, isRu: boolean): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const locale = isRu ? "ru-RU" : "en-US";
  try {
    return `${new Date(start).toLocaleDateString(locale, opts)} → ${new Date(end).toLocaleDateString(locale, opts)}`;
  } catch {
    return `${start} → ${end}`;
  }
}

const CurrentCohort = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const { subscription } = useAuth();
  const hasMembership =
    !!subscription && ["active", "trialing"].includes(subscription.status ?? "");

  const [cohort, setCohort] = useState<CohortRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Lookup window mirrors stripe-webhook's queueCohortWelcomeEmail:
      // open/in_progress + ends_at >= now + starts_at <= now+60d.
      const now = new Date().toISOString();
      const horizon = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
      const { data: cohortRow, error: cohortErr } = await db
        .from("cohorts")
        .select("cohort_id, slug, name, description, starts_at, ends_at")
        .in("status", ["open", "in_progress"])
        .gte("ends_at", now)
        .lte("starts_at", horizon)
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (cohortErr || !cohortRow) {
        setCohort(null);
        setEvents([]);
        setLoading(false);
        return;
      }
      setCohort(cohortRow as CohortRow);

      // Events for this cohort, upcoming only, next 3. RLS gates this
      // for non-members — they'll get [] and we'll skip the calendar UI.
      const { data: evRows } = await db
        .from("cohort_events")
        .select("event_id, kind, title, starts_at, ends_at, meeting_url")
        .eq("cohort_id", cohortRow.cohort_id)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true })
        .limit(3);
      if (cancelled) return;
      setEvents((evRows ?? []) as EventRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-14">
        <div className="animate-pulse bg-card border border-border rounded-2xl p-8 h-48" />
      </div>
    );
  }

  // No current cohort + no upcoming cohort within 60 days — section hides.
  // This is the "transition gap" state between cycles; nothing to show.
  if (!cohort) return null;

  const dateRange = formatDateRange(cohort.starts_at, cohort.ends_at, isRu);

  return (
    <section className="max-w-3xl mx-auto px-4 pt-6 pb-14">
      <div className="mb-8 text-center">
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
          {t("Current cohort", "Текущая когорта", isRu)}
        </p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {cohort.name}
        </h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
          {dateRange}
        </p>
      </div>

      {cohort.description && (
        <p className="text-foreground/80 text-base leading-relaxed text-center max-w-2xl mx-auto mb-8">
          {cohort.description}
        </p>
      )}

      {hasMembership ? (
        events.length > 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-gold-dark" />
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {t("Next sessions", "Ближайшие сессии", isRu)}
              </h3>
            </div>
            <ul className="space-y-3">
              {events.map((ev) => (
                <li
                  key={ev.event_id}
                  className="flex items-start justify-between gap-4 border-b border-border last:border-0 pb-3 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
                      {KIND_LABEL[isRu ? "ru" : "en"][ev.kind]}
                    </p>
                    <p className="text-foreground font-medium text-sm leading-snug">
                      {ev.title}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {formatEventTime(ev.starts_at, isRu)}
                    </p>
                  </div>
                  {ev.meeting_url && (
                    <a
                      href={ev.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:text-gold transition-colors whitespace-nowrap mt-1"
                    >
                      {t("Join", "Войти", isRu)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs mt-5 text-center">
              {t(
                "You'll get reminder emails 24h and 1h before each session.",
                "Получите напоминания за 24 часа и за час до каждой сессии.",
                isRu,
              )}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <Users className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground/80 text-sm">
              {t(
                "Cohort kicks off soon. Calendar lands here as soon as the schedule is set — we'll also email you 24h and 1h before each session.",
                "Когорта стартует скоро. Расписание появится здесь сразу, как будет готово — также пришлём напоминания за 24 часа и за час до каждой сессии.",
                isRu,
              )}
            </p>
          </div>
        )
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground/80 text-sm mb-4">
            {t(
              "Members unlock the full cohort calendar and join the live calls + workshops.",
              "Подписчики получают полное расписание когорты и могут присоединиться к живым звонкам и воркшопам.",
              isRu,
            )}
          </p>
          <Button asChild>
            <a href={isRu ? "/pricing/ru" : "/pricing"}>
              {t("See membership →", "Подписка →", isRu)}
            </a>
          </Button>
        </div>
      )}
    </section>
  );
};

export default CurrentCohort;
