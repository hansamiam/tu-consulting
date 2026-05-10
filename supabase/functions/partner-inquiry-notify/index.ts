// Persists a partnership-form submission to partner_inquiries, mirrors a
// funnel event into student_interactions, and (if Resend is configured)
// sends two transactional emails: a lead-alert to the team and an
// acknowledgement to the institution. Email send is fail-soft — a missing
// RESEND_API_KEY or a Resend error never breaks the form. Called from
// /topuni-ai/partners (EN + RU). The form data is low-risk and public, so
// we accept anon callers and rely on the table's "Anyone can submit" RLS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Environment-driven email config. All optional — if RESEND_API_KEY is
// unset, the function still writes the row and returns success; the user
// just doesn't get an email yet. Set these in Supabase secrets once the
// domain is verified in Resend:
//   RESEND_API_KEY                 — re_xxx from resend.com/api-keys
//   PARTNER_INQUIRY_FROM_EMAIL     — verified sender, e.g. partnerships@topuni.org
//   PARTNER_INQUIRY_NOTIFY_EMAIL   — internal team inbox, e.g. samuel@topuni.org
const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface InquiryRow {
  id: string;
  institution_name: string;
  region: string;
  contact_email: string;
  message: string | null;
  language: string;
}

const escape = (s: string | null | undefined): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function sendEmail(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const resp = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      tags: [{ name: "purpose", value: "partner_inquiry" }],
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Resend ${resp.status}: ${body.slice(0, 300)}`);
  }
}

function teamAlertHtml(r: InquiryRow): string {
  return `
    <h2 style="margin:0 0 12px;font-family:system-ui">New partner inquiry — ${escape(r.institution_name)}</h2>
    <p style="margin:0 0 8px"><strong>Institution:</strong> ${escape(r.institution_name)}</p>
    <p style="margin:0 0 8px"><strong>Region:</strong> ${escape(r.region)}</p>
    <p style="margin:0 0 8px"><strong>Contact:</strong> <a href="mailto:${escape(r.contact_email)}">${escape(r.contact_email)}</a></p>
    <p style="margin:0 0 8px"><strong>Language:</strong> ${escape(r.language)}</p>
    ${r.message ? `<p style="margin:16px 0 8px"><strong>Message:</strong></p><blockquote style="border-left:3px solid #ccc;padding:0 12px;margin:0;color:#333">${escape(r.message).replace(/\n/g, "<br>")}</blockquote>` : ""}
    <p style="margin:24px 0 0;color:#666;font-size:12px">Triage at /admin/partner-inquiries · inquiry id ${escape(r.id)}</p>
  `;
}

function teamAlertText(r: InquiryRow): string {
  return [
    `New partner inquiry — ${r.institution_name}`,
    ``,
    `Institution: ${r.institution_name}`,
    `Region: ${r.region}`,
    `Contact: ${r.contact_email}`,
    `Language: ${r.language}`,
    r.message ? `\nMessage:\n${r.message}` : ``,
    ``,
    `Triage at /admin/partner-inquiries · inquiry id ${r.id}`,
  ].join("\n");
}

function ackHtml(r: InquiryRow): string {
  if (r.language === "ru") {
    return `
      <p>Здравствуйте,</p>
      <p>Спасибо за интерес к партнёрству с TopUni. Мы получили вашу заявку от <strong>${escape(r.institution_name)}</strong> и свяжемся с вами в течение 48 часов.</p>
      <p>А пока — если хотите, посмотрите наш материал для партнёров: <a href="https://topuni.org/topuni-ai/partners">topuni.org/topuni-ai/partners</a></p>
      <p>С уважением,<br>Команда TopUni</p>
    `;
  }
  return `
    <p>Hi there,</p>
    <p>Thanks for your interest in partnering with TopUni. We received your inquiry from <strong>${escape(r.institution_name)}</strong> and will be in touch within 48 hours.</p>
    <p>In the meantime, feel free to explore our partner overview at <a href="https://topuni.org/topuni-ai/partners">topuni.org/topuni-ai/partners</a>.</p>
    <p>Best,<br>The TopUni team</p>
  `;
}

function ackText(r: InquiryRow): string {
  if (r.language === "ru") {
    return [
      `Здравствуйте,`,
      ``,
      `Спасибо за интерес к партнёрству с TopUni. Мы получили вашу заявку от ${r.institution_name} и свяжемся с вами в течение 48 часов.`,
      ``,
      `А пока — посмотрите наш материал для партнёров: https://topuni.org/topuni-ai/partners`,
      ``,
      `С уважением,`,
      `Команда TopUni`,
    ].join("\n");
  }
  return [
    `Hi there,`,
    ``,
    `Thanks for your interest in partnering with TopUni. We received your inquiry from ${r.institution_name} and will be in touch within 48 hours.`,
    ``,
    `In the meantime, feel free to explore our partner overview at https://topuni.org/topuni-ai/partners.`,
    ``,
    `Best,`,
    `The TopUni team`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      institution_name,
      region,
      contact_email,
      message,
      language,
      source_path,
    } = body;

    if (!institution_name || !region || !contact_email) {
      return new Response(
        JSON.stringify({ error: "institution_name, region, and contact_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: inquiry, error: insertErr } = await supabase
      .from("partner_inquiries")
      .insert({
        institution_name,
        region,
        contact_email,
        message: message || null,
        language: language === "ru" ? "ru" : "en",
        source_path: source_path || null,
        user_agent: req.headers.get("user-agent"),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("partner_inquiries insert failed:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("student_interactions").insert({
      event_type: "partner_inquiry_submitted",
      event_data: {
        inquiry_id: inquiry.id,
        institution_name,
        region,
        language: inquiry.language,
      },
    });

    // ─── Fire-and-forget email sends — never block the response ─────────
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("PARTNER_INQUIRY_FROM_EMAIL");
    const notifyEmail = Deno.env.get("PARTNER_INQUIRY_NOTIFY_EMAIL");
    if (apiKey && fromEmail) {
      const row: InquiryRow = inquiry as InquiryRow;
      const sends: Array<Promise<void>> = [];
      if (notifyEmail) {
        sends.push(
          sendEmail({
            apiKey,
            from: fromEmail,
            to: notifyEmail,
            subject: `New partner inquiry — ${row.institution_name} (${row.region})`,
            html: teamAlertHtml(row),
            text: teamAlertText(row),
            replyTo: row.contact_email,
          }).catch((e) => {
            console.error("team alert email failed:", e);
          }),
        );
      }
      sends.push(
        sendEmail({
          apiKey,
          from: fromEmail,
          to: row.contact_email,
          subject: row.language === "ru"
            ? "Мы получили вашу заявку — TopUni"
            : "We received your partnership inquiry — TopUni",
          html: ackHtml(row),
          text: ackText(row),
        }).catch((e) => {
          console.error("acknowledgement email failed:", e);
        }),
      );
      await Promise.all(sends);
    } else {
      console.warn(
        "Email send skipped — RESEND_API_KEY or PARTNER_INQUIRY_FROM_EMAIL not set. " +
        "Inquiry persisted only.",
      );
    }

    return new Response(
      JSON.stringify({ success: true, inquiry_id: inquiry.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("partner-inquiry-notify error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
