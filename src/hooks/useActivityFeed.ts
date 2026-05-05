/**
 * useActivityFeed — synthesizes an in-app activity feed from data
 * the user already has access to. No new backend tables; everything
 * derives from:
 *   · saved_searches.last_alert_at  (matches the cron just emailed)
 *   · application_tracker rows joined with scholarships (deadlines,
 *     lifecycle changes, recently-updated soft fields)
 *   · scholarships.updated_at  (verifier or enrich cron touched it)
 *
 * "Last seen" lives in localStorage for v1 — cross-device sync would
 * need a student_profiles column; defer that until cross-device read
 * receipts actually matter. The unread count drops to zero on
 * markAllSeen() which the bell calls when its popover opens.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";

export type ActivityKind =
  | "saved_search_alert"   // saved-search-cron just emailed new matches
  | "deadline_imminent"    // tracked scholarship has a deadline in <= 7 days
  | "deadline_today"       // tracked scholarship deadline is today/tomorrow
  | "tracker_updated"      // tracked scholarship changed since last seen
  | "lifecycle_change"     // tracked scholarship reopened / closed
  | "brief_stale";         // user's profile changed after last brief generated

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  meta?: string;
  href?: string;
  occurredAt: string;       // ISO timestamp used for unread comparison
  scholarshipId?: string;
  searchId?: string;
}

const LS_KEY = "topuni-activity-last-seen";

const loadLastSeen = (): number => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return 0;
    const ts = Number.parseInt(raw, 10);
    return Number.isFinite(ts) ? ts : 0;
  } catch { return 0; }
};

const saveLastSeen = (ts: number) => {
  try { localStorage.setItem(LS_KEY, ts.toString()); } catch { /* ignore */ }
};

const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
};

interface SchLite {
  scholarship_id: string;
  scholarship_name: string;
  application_deadline: string | null;
  lifecycle_status: string | null;
  next_open_at: string | null;
  updated_at: string | null;
  host_country: string | null;
}

interface SavedSearchLite {
  id: string;
  name: string;
  last_alert_at: string | null;
}

interface ProfileFreshness {
  profile_updated_at: string | null;
  last_brief_generated_at: string | null;
}

export function useActivityFeed() {
  const { user } = useAuth();
  const tracker = useApplicationTracker();
  const [lastSeen, setLastSeen] = useState<number>(loadLastSeen);
  const [savedSearchAlerts, setSavedSearchAlerts] = useState<SavedSearchLite[]>([]);
  const [trackedScholarships, setTrackedScholarships] = useState<SchLite[]>([]);
  const [profileFreshness, setProfileFreshness] = useState<ProfileFreshness | null>(null);

  // Hydrate the data the feed synthesizes from. Single fetch on mount;
  // re-fetch if the tracked id set changes.
  const trackedIds = useMemo(
    () => Array.from(new Set([...tracker.shortlist, ...Object.keys(tracker.statusMap)])),
    [tracker.shortlist, tracker.statusMap],
  );
  const trackedKey = trackedIds.join(",");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [searchesRes, scholarshipsRes, profileRes] = await Promise.all([
        user?.id
          ? supabase
              .from("saved_searches")
              .select("id, name, last_alert_at")
              .eq("user_id", user.id)
              .not("last_alert_at", "is", null)
              .order("last_alert_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
        trackedIds.length > 0
          ? supabase
              .from("scholarships")
              .select("scholarship_id, scholarship_name, application_deadline, lifecycle_status, next_open_at, updated_at, host_country")
              .in("scholarship_id", trackedIds)
          : Promise.resolve({ data: [] }),
        // Profile freshness — compares user's profile-update time to
        // the last brief generation. If profile changed after brief
        // (with a 1-hour grace), the brief is stale and we surface
        // a "refresh your strategy" event in the bell.
        user?.id
          ? supabase
              .from("student_profiles")
              .select("updated_at, last_brief_generated_at")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      // saved_searches table may not exist yet (migration pending) — we
      // silently handle that by treating the result as empty.
      const searches = (searchesRes as { data: SavedSearchLite[] | null; error?: unknown }).data ?? [];
      const scholarships = (scholarshipsRes as { data: SchLite[] | null }).data ?? [];
      const profile = (profileRes as { data: { updated_at?: string; last_brief_generated_at?: string } | null }).data;
      setSavedSearchAlerts(searches);
      setTrackedScholarships(scholarships);
      setProfileFreshness(profile ? {
        profile_updated_at: profile.updated_at ?? null,
        last_brief_generated_at: profile.last_brief_generated_at ?? null,
      } : null);
    })();
    return () => { cancelled = true; };
  }, [user?.id, trackedKey]);

  const events = useMemo<ActivityEvent[]>(() => {
    const out: ActivityEvent[] = [];

    // 1. Saved-search alerts (one per search that fired)
    for (const s of savedSearchAlerts) {
      if (!s.last_alert_at) continue;
      out.push({
        id: `ss-${s.id}-${s.last_alert_at}`,
        kind: "saved_search_alert",
        title: `New matches for "${s.name}"`,
        meta: "Saved search digest",
        href: "/discover",
        occurredAt: s.last_alert_at,
        searchId: s.id,
      });
    }

    // 2. Tracked deadlines coming up
    for (const s of trackedScholarships) {
      const days = daysUntil(s.application_deadline);
      if (days === null) continue;
      if (days < 0) continue; // already past
      if (days <= 1) {
        out.push({
          id: `dl-${s.scholarship_id}-today`,
          kind: "deadline_today",
          title: `${days === 0 ? "Today" : "Tomorrow"}: ${s.scholarship_name}`,
          meta: s.host_country ?? "Deadline",
          href: `/scholarships/${s.scholarship_id}`,
          occurredAt: new Date(Date.now() - days * 86_400_000).toISOString(),
          scholarshipId: s.scholarship_id,
        });
      } else if (days <= 7) {
        out.push({
          id: `dl-${s.scholarship_id}-7d`,
          kind: "deadline_imminent",
          title: `${days} days: ${s.scholarship_name}`,
          meta: s.host_country ?? "Deadline",
          href: `/scholarships/${s.scholarship_id}`,
          occurredAt: new Date(Date.now() - (7 - days) * 86_400_000).toISOString(),
          scholarshipId: s.scholarship_id,
        });
      }
    }

    // 3. Lifecycle changes on tracked rows (recent reopenings / recent closes)
    for (const s of trackedScholarships) {
      if (s.lifecycle_status === "reopens_annually" && s.next_open_at) {
        const opensIn = daysUntil(s.next_open_at);
        if (opensIn !== null && opensIn >= 0 && opensIn <= 30) {
          out.push({
            id: `lc-${s.scholarship_id}-reopen`,
            kind: "lifecycle_change",
            title: `${s.scholarship_name} reopens in ${opensIn}d`,
            meta: "Annual cycle",
            href: `/scholarships/${s.scholarship_id}`,
            occurredAt: new Date().toISOString(),
            scholarshipId: s.scholarship_id,
          });
        }
      }
    }

    // 4. Brief staleness — only emit when (a) a brief was actually
    // generated previously, AND (b) the profile updated_at is newer
    // than the brief generated_at by more than a 1-hour grace window
    // (so wizard finalisation that updates profile + generates brief
    // in the same flow doesn't immediately fire a stale flag).
    if (profileFreshness?.last_brief_generated_at && profileFreshness.profile_updated_at) {
      const profileTs = new Date(profileFreshness.profile_updated_at).getTime();
      const briefTs = new Date(profileFreshness.last_brief_generated_at).getTime();
      const grace = 60 * 60 * 1000; // 1 hour
      if (profileTs > briefTs + grace) {
        out.push({
          id: `bs-${profileFreshness.last_brief_generated_at}`,
          kind: "brief_stale",
          title: "Your strategy brief is out of date",
          meta: "Profile changed since last generation",
          href: "/topuni-ai",
          occurredAt: profileFreshness.profile_updated_at,
        });
      }
    }

    // 5. Recently-updated tracked scholarships (verifier or enrich cron
    // touched the row in the last 14 days). Quiet signal — useful but
    // not urgent.
    const recentCutoff = Date.now() - 14 * 86_400_000;
    for (const s of trackedScholarships) {
      if (!s.updated_at) continue;
      const ts = new Date(s.updated_at).getTime();
      if (ts < recentCutoff) continue;
      if (ts < lastSeen) continue; // already seen
      out.push({
        id: `up-${s.scholarship_id}-${s.updated_at}`,
        kind: "tracker_updated",
        title: `${s.scholarship_name} was updated`,
        meta: "New strategy notes or details",
        href: `/scholarships/${s.scholarship_id}`,
        occurredAt: s.updated_at,
        scholarshipId: s.scholarship_id,
      });
    }

    // Sort newest first
    out.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return out;
  }, [savedSearchAlerts, trackedScholarships, profileFreshness, lastSeen]);

  // "Unread" = events whose occurredAt is newer than lastSeen.
  // Also includes deadline-driven events even if older, because urgency
  // recurs (a 7-day-out deadline today is still actionable tomorrow).
  const unreadCount = useMemo(() => {
    return events.filter((e) => {
      if (e.kind === "deadline_today" || e.kind === "deadline_imminent") return true;
      return new Date(e.occurredAt).getTime() > lastSeen;
    }).length;
  }, [events, lastSeen]);

  const markAllSeen = useCallback(() => {
    const ts = Date.now();
    setLastSeen(ts);
    saveLastSeen(ts);
  }, []);

  return { events, unreadCount, markAllSeen, lastSeen };
}
