import { supabase } from "@/integrations/supabase/client";

// Lightweight anonymized analytics tracker
// Logs events to student_interactions table for internal intelligence

let sessionId: string | null = null;

const getSessionId = (): string => {
  if (!sessionId) {
    sessionId = sessionStorage.getItem("tu_session_id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("tu_session_id", sessionId);
    }
  }
  return sessionId;
};

const getDeviceType = (): string => {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
};

const getCountryHint = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

// Debounce rapid-fire events
const recentEvents = new Map<string, number>();
const DEBOUNCE_MS = 2000;

export const trackEvent = async (
  eventType: string,
  eventData?: Record<string, unknown>
) => {
  try {
    // Debounce: skip if same event type fired within 2s
    const key = `${eventType}:${JSON.stringify(eventData || {})}`;
    const now = Date.now();
    const last = recentEvents.get(key);
    if (last && now - last < DEBOUNCE_MS) return;
    recentEvents.set(key, now);

    // Keep map clean
    if (recentEvents.size > 100) {
      const cutoff = now - 10000;
      for (const [k, v] of recentEvents) {
        if (v < cutoff) recentEvents.delete(k);
      }
    }

    await supabase.from("student_interactions").insert([{
      event_type: eventType,
      event_data: eventData || {},
      session_id: getSessionId(),
      device_type: getDeviceType(),
      country_hint: getCountryHint(),
    }]);
  } catch {
    // Silent fail — analytics should never break the app
  }
};

// Pre-built event helpers
export const trackPageView = (page: string) =>
  trackEvent("page_view", { page });

export const trackFilterUsage = (filterName: string, filterValue: string) =>
  trackEvent("filter_used", { filter: filterName, value: filterValue });

export const trackSearch = (query: string, resultCount: number) =>
  trackEvent("search", { query: query.slice(0, 50), results: resultCount });

export const trackToolUsage = (tool: string, action?: string) =>
  trackEvent("tool_used", { tool, action });

export const trackAIInteraction = (feature: string, action: string) =>
  trackEvent("ai_interaction", { feature, action });

export const trackUniversityView = (universityId: string, universityName: string) =>
  trackEvent("university_view", { university_id: universityId, name: universityName });

export const trackReportGenerated = (grade: "basic" | "premium") =>
  trackEvent("report_generated", { grade });
