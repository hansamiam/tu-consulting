// Scheduled email scanner — runs every 5 min via pg_cron.
// Sends 24h reminder, 1h reminder, and post-call upsell based on bookings.calendly_scheduled_at.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://topuni.org";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const now = Date.now();
  const in24h = new Date(now + 24 * 3600 * 1000);
  const in23h = new Date(now + 23 * 3600 * 1000);
  const in1h = new Date(now + 60 * 60 * 1000);
  const in30min = new Date(now + 30 * 60 * 1000);
  const past1h = new Date(now - 60 * 60 * 1000);
  const past3h = new Date(now - 3 * 3600 * 1000);

  let results = { reminder24h: 0, reminder1h: 0, postCall: 0 };

  // 24h reminders: scheduled between now+23h and now+24h, not yet sent
  const { data: r24 } = await supabase
    .from("bookings")
    .select("id, contact_email, contact_name, calendly_meeting_url, calendly_scheduled_at, intake_completed_at")
    .eq("calendly_status", "scheduled")
    .is("reminder_24h_sent_at", null)
    .gte("calendly_scheduled_at", in23h.toISOString())
    .lte("calendly_scheduled_at", in24h.toISOString());

  for (const b of r24 ?? []) {
    if (!b.contact_email) continue;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "booking-reminder-24h",
        recipientEmail: b.contact_email,
        idempotencyKey: `r24h-${b.id}`,
        templateData: {
          name: b.contact_name,
          scheduledAt: new Date(b.calendly_scheduled_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
          meetingUrl: b.calendly_meeting_url,
          intakeCompleted: !!b.intake_completed_at,
          intakeUrl: `${SITE}/thank-you?booking=${b.id}`,
        },
      },
    });
    await supabase.from("bookings").update({ reminder_24h_sent_at: new Date().toISOString() }).eq("id", b.id);
    results.reminder24h++;
  }

  // 1h reminders
  const { data: r1 } = await supabase
    .from("bookings")
    .select("id, contact_email, contact_name, calendly_meeting_url")
    .eq("calendly_status", "scheduled")
    .is("reminder_1h_sent_at", null)
    .gte("calendly_scheduled_at", in30min.toISOString())
    .lte("calendly_scheduled_at", in1h.toISOString());

  for (const b of r1 ?? []) {
    if (!b.contact_email) continue;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "booking-reminder-1h",
        recipientEmail: b.contact_email,
        idempotencyKey: `r1h-${b.id}`,
        templateData: { name: b.contact_name, meetingUrl: b.calendly_meeting_url },
      },
    });
    await supabase.from("bookings").update({ reminder_1h_sent_at: new Date().toISOString() }).eq("id", b.id);
    results.reminder1h++;
  }

  // Post-call upsell: scheduled 1-3h ago, status still 'scheduled' (not no-show), no rebook email
  const { data: pc } = await supabase
    .from("bookings")
    .select("id, contact_email, contact_name")
    .eq("calendly_status", "scheduled")
    .is("rebook_email_sent_at", null)
    .gte("calendly_scheduled_at", past3h.toISOString())
    .lte("calendly_scheduled_at", past1h.toISOString());

  for (const b of pc ?? []) {
    if (!b.contact_email) continue;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "post-call-upsell",
        recipientEmail: b.contact_email,
        idempotencyKey: `postcall-${b.id}`,
        templateData: {
          name: b.contact_name,
          packageUrl: `${SITE}/offerings`,
          promoCode: "POSTCALL200",
        },
      },
    });
    await supabase.from("bookings").update({ rebook_email_sent_at: new Date().toISOString() }).eq("id", b.id);
    results.postCall++;
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
