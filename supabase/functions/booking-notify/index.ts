// Logs a booking event to student_interactions for the funnel dashboard.
// Receipt is already uploaded directly from the client to storage; we just need
// a server-side audit trail that's queryable by admins.
import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson, respondError } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

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
      return respondError(400, "consultation_type required", corsHeaders);
    }

    const supabase = createServiceClient();

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
      return respondError(500, bookingErr.message, corsHeaders);
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

    return respondJson(200, { success: true, booking_id: booking.id }, corsHeaders);
  } catch (e) {
    console.error("booking-notify error:", e);
    return respondError(500, String(e), corsHeaders);
  }
});
