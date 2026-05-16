// Calendly webhook → updates bookings table with scheduling/cancellation/no-show events.
// Calendly Free tier doesn't sign webhooks, so we use a shared-secret query param.
// Set CALENDLY_WEBHOOK_SECRET in Supabase secrets, then register webhook URL:
//   https://<project>.supabase.co/functions/v1/calendly-webhook?secret=<SECRET>
//
// Subscribe to events: invitee.created, invitee.canceled, invitee_no_show.created

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

Deno.serve(async (req: Request) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  try {
    // Auth via shared secret
    const url = new URL(req.url);
    const expected = Deno.env.get("CALENDLY_WEBHOOK_SECRET");
    if (!expected || url.searchParams.get("secret") !== expected) {
      return new Response("unauthorized", { status: 401, headers: corsHeaders });
    }

    const payload = await req.json();
    const event = payload?.event as string | undefined;
    const p = payload?.payload ?? {};
    const inviteeUri: string | undefined = p?.uri;
    const eventUri: string | undefined = p?.scheduled_event?.uri;
    const inviteeEmail: string | undefined = p?.email;
    const startTime: string | undefined = p?.scheduled_event?.start_time;
    const meetingUrl: string | undefined = p?.scheduled_event?.location?.join_url;

    console.log("[calendly-webhook]", event, { inviteeUri, inviteeEmail, startTime });

    if (!event || !inviteeEmail) {
      return respondJson(200, { ok: true, ignored: true }, corsHeaders);
    }

    const supabase = createServiceClient();

    // Find most recent paid booking for this email that doesn't have a calendly event yet
    // (or matches the same invitee_uri for updates)
    const { data: matches } = await supabase
      .from("bookings")
      .select("id, calendly_invitee_uri, status, created_at")
      .eq("contact_email", inviteeEmail)
      .order("created_at", { ascending: false })
      .limit(5);

    let target = matches?.find((b: any) => b.calendly_invitee_uri === inviteeUri);
    if (!target) {
      target = matches?.find((b: any) => !b.calendly_invitee_uri && (b.status === "paid" || b.status === "pending_review"));
    }

    if (!target) {
      console.warn("[calendly-webhook] no matching booking for", inviteeEmail);
      return respondJson(200, { ok: true, matched: false }, corsHeaders);
    }

    const updates: Record<string, unknown> = {};
    if (event === "invitee.created") {
      updates.calendly_invitee_uri = inviteeUri;
      updates.calendly_event_uri = eventUri;
      updates.calendly_scheduled_at = startTime;
      updates.calendly_meeting_url = meetingUrl;
      updates.calendly_status = "scheduled";
    } else if (event === "invitee.canceled") {
      updates.calendly_status = "canceled";
      updates.calendly_canceled_at = new Date().toISOString();
    } else if (event === "invitee_no_show.created") {
      updates.calendly_status = "no_show";
      updates.no_show_at = new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("bookings").update(updates).eq("id", target.id);
      if (error) throw error;
    }

    // Fire transactional emails (don't block on failure)
    try {
      const SITE = "https://topuni.org";
      if (event === "invitee.created") {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: inviteeEmail,
            idempotencyKey: `booking-confirm-${target.id}`,
            templateData: {
              name: p?.name,
              consultationType: "consultation",
              bookingUrl: `${SITE}/offerings`,
              intakeUrl: `${SITE}/thank-you?booking=${target.id}`,
            },
          },
        });
      } else if (event === "invitee_no_show.created") {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "no-show-recovery",
            recipientEmail: inviteeEmail,
            idempotencyKey: `no-show-${target.id}`,
            templateData: { name: p?.name, rebookUrl: `${SITE}/offerings` },
          },
        });
        await supabase.from("bookings").update({ rebook_email_sent_at: new Date().toISOString() }).eq("id", target.id);
      }
    } catch (e) {
      console.error("[calendly-webhook] email send failed", e);
    }

    return respondJson(200, { ok: true, booking_id: target.id, event }, corsHeaders);
  } catch (err) {
    console.error("[calendly-webhook] error", err);
    return respondJson(500, { error: err instanceof Error ? err.message : "unknown" }, corsHeaders);
  }
});
