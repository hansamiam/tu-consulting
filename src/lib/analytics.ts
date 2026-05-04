/**
 * Lightweight client-side event tracker. Fire-and-forget — never await,
 * never let analytics failures bubble into UX.
 *
 * Events go straight to public.analytics_events via the Supabase JS
 * client. Anon users get a stable browser id from localStorage so the
 * pre-signup → post-signup funnel can be stitched server-side later.
 *
 * Don't use this for anything that's NOT a product/funnel event (errors,
 * server traces, etc.) — those have their own surfaces.
 */
import { supabase } from "@/integrations/supabase/client";

export type EventName =
  | "brief_generation_started"
  | "brief_generation_completed"
  | "brief_viewed_full"
  | "gate_seen"
  | "gate_upgrade_clicked"
  | "pro_comparison_opened"
  | "pro_comparison_upgrade_clicked"
  | "counselor_message_sent"
  | "counselor_message_blocked"
  | "signup_started"
  | "payment_completed"
  | "scholarship_saved"
  | "scholarship_unsaved"
  | "scholarship_detail_opened"
  | "checklist_item_toggled"
  | "section_regenerated"
  | "share_brief_minted"
  | "deep_dive_opened";

const ANON_ID_KEY = "topuni-anon-id";

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      // Crypto.randomUUID is available in all the browsers we support.
      id = crypto.randomUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    // Private mode / no storage → ephemeral session id. Acceptable degradation.
    return "ephemeral-" + Math.random().toString(36).slice(2, 14);
  }
}

/**
 * Fire an event. Resolves to { ok: true } on success or { ok: false, reason }
 * on failure. NEVER throws — the caller never has to wrap in try/catch.
 */
export async function track(
  event: EventName,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    // Resolve user_id from current session. supabase.auth.getUser() returns
    // synchronously from cache after the first call, so we don't add latency.
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const anonId = userId ? null : getAnonId();
    const path = typeof window !== "undefined" ? window.location.pathname : null;

    const { error } = await supabase
      .from("analytics_events")
      .insert({
        user_id: userId,
        anon_id: anonId,
        event_name: event,
        metadata: metadata ?? null,
        path,
      });

    if (error) {
      // Don't toast or log loudly — analytics failures should be invisible.
      console.debug("[analytics] insert failed", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}
