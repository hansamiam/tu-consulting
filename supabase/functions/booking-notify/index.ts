// Logs a booking event to student_interactions for the funnel dashboard.
// Receipt is already uploaded directly from the client to storage; we just need
// a server-side audit trail that's queryable by admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      consultation_type,
      is_consultation,
      original_price,
      discount,
      final_price,
      promo_code,
      language,
      receipt_path,
      contact_email,
      contact_name,
      contact_phone,
    } = body;

    if (!consultation_type) {
      return new Response(JSON.stringify({ error: "consultation_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        consultation_type,
        is_consultation: !!is_consultation,
        original_price,
        discount: discount || 0,
        final_price,
        promo_code,
        language: language || "en",
        receipt_path,
        contact_email,
        contact_name,
        contact_phone,
        status: "pending_review",
      })
      .select()
      .single();

    if (bookingErr) {
      console.error("Booking insert failed:", bookingErr);
      return new Response(JSON.stringify({ error: bookingErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mirror to interactions for funnel analytics
    await supabase.from("student_interactions").insert({
      event_type: "booking_completed",
      event_data: {
        booking_id: booking.id,
        consultation_type,
        final_price,
        promo_code,
        had_receipt: !!receipt_path,
      },
    });

    return new Response(JSON.stringify({ success: true, booking_id: booking.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("booking-notify error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
