// calendar-feed
//
// Subscribable iCalendar (ICS) feed of a user's tracked scholarship
// deadlines. Authenticates by per-user secret token (32-char base32,
// stored in calendar_subscriptions.feed_token). Anyone with the token
// can read the feed — but the token is private to the owner and
// rotatable via rotate_my_calendar_token().
//
// Why this matters strategically: once a student adds the feed to their
// Apple / Google / Outlook calendar, every saved scholarship deadline
// becomes a native-OS notification — and new deadlines saved later
// auto-appear in their calendar via the standard iCal refresh cadence
// (Apple: ~15 min, Google: hours, Outlook: 24h). Compounding retention
// surface that survives even if the student stops opening our website.
//
// URL: https://topuni.org/calendar.ics?token=<feed_token>
// (Vercel rewrite forwards to this fn — see vercel.json)
//
// Output content-type: text/calendar; charset=utf-8
//
// Cache: short s-maxage (5 min) so deadline edits propagate quickly.
// Calendar clients ignore Cache-Control; this is for our edge.

import { createServiceClient } from "../_shared/clients.ts";

const SITE = "https://topuni.org";
const PRODID = "-//TopUni//Scholarship Deadlines//EN";

const calHeaders = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Cache-Control": "private, max-age=60, s-maxage=300",
  "Access-Control-Allow-Origin": "*",
  // Suggest a sensible filename if the user does open the URL directly
  "Content-Disposition": 'inline; filename="topuni-deadlines.ics"',
};

interface TrackerRow {
  scholarship_id: string;
  status: string | null;
  scholarships: {
    scholarship_name: string | null;
    application_deadline: string | null;   // YYYY-MM-DD (DATE)
    host_country: string | null;
    coverage_type: string | null;
    award_amount_text: string | null;
    source_url: string | null;
    official_url: string | null;
    verification_status: string | null;
  } | null;
}

/* ──────────────────────────────────────────────────────────────────
   ICS escaping & line folding
   RFC 5545: backslash, comma, semicolon, newline must be escaped in
   text values; lines must be folded at 75 octets with "\r\n " prefix.
   ────────────────────────────────────────────────────────────────── */
const escText = (s: string): string =>
  (s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

function fold(line: string): string {
  // RFC 5545: lines must not exceed 75 octets, excluding CRLF.
  // Continuation lines start with a single linear-whitespace octet
  // (space) which does not consume source — only the next 74 source
  // chars fit before the next fold.
  //
  // The previous loop subtracted 1 from chunk.length on every
  // continuation iteration, leaving the source pointer one short.
  // Worst case: a source line of length 75 + 73*N + 1 (e.g. 76, 149,
  // 222, …) terminated with a 1-char trailing chunk that advanced
  // the pointer by 0 → infinite loop → 504 on the calendar feed.
  // Any scholarship description ≥76 chars after escaping would hit it.
  if (line.length <= 75) return line;
  const out: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) {
    out.push(" " + line.slice(i, i + 74));
  }
  return out.join("\r\n");
}

function fmtDate(d: string): string {
  // YYYYMMDD — for VALUE=DATE all-day events
  return d.slice(0, 10).replace(/-/g, "");
}

function fmtDateTimeUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function addDays(yyyymmdd: string, n: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return (
    dt.getUTCFullYear().toString() +
    String(dt.getUTCMonth() + 1).padStart(2, "0") +
    String(dt.getUTCDate()).padStart(2, "0")
  );
}

function coverageLabel(c: string | null): string {
  if (c === "full_ride") return "Full ride";
  if (c === "tuition_only") return "Tuition only";
  if (c === "stipend") return "Stipend";
  return "Funded";
}

function buildVEvent(row: TrackerRow, nowStamp: string): string {
  const sch = row.scholarships;
  if (!sch || !sch.application_deadline) return "";

  const start = fmtDate(sch.application_deadline);
  // RFC 5545: DTEND for VALUE=DATE is exclusive — the deadline day
  // itself shows up by ending on the next day.
  const end = addDays(sch.application_deadline, 1);

  const name = sch.scholarship_name ?? "Scholarship deadline";
  const country = sch.host_country ?? "";
  const coverage = coverageLabel(sch.coverage_type);
  const award = sch.award_amount_text?.trim() ?? "";

  // Stable UID — same scholarship always produces the same event,
  // so calendar clients update in place if the deadline shifts
  // rather than creating duplicates.
  const uid = `scholarship-${row.scholarship_id}@topuni.org`;

  const detailUrl = `${SITE}/scholarships/${row.scholarship_id}`;
  const externalUrl = sch.source_url ?? sch.official_url ?? "";

  const summary = `Deadline · ${name}`;

  const descLines = [
    `${name}`,
    country ? `Country: ${country}` : "",
    `Coverage: ${coverage}${award ? ` · ${award}` : ""}`,
    "",
    `View on TopUni: ${detailUrl}`,
    externalUrl ? `Apply at: ${externalUrl}` : "",
    "",
    "Tracked via TopUni — your subscribable scholarship calendar.",
  ].filter(Boolean).join("\n");

  // CATEGORIES: useful for users who want to color-code by status.
  const categories = ["TopUni", "Scholarship deadline", row.status ?? "shortlisted"]
    .map(escText).join(",");

  const lines = [
    "BEGIN:VEVENT",
    fold(`UID:${uid}`),
    fold(`DTSTAMP:${nowStamp}`),
    fold(`DTSTART;VALUE=DATE:${start}`),
    fold(`DTEND;VALUE=DATE:${end}`),
    fold(`SUMMARY:${escText(summary)}`),
    fold(`DESCRIPTION:${escText(descLines)}`),
    fold(`URL:${detailUrl}`),
    fold(`CATEGORIES:${categories}`),
    "TRANSP:TRANSPARENT",
    // 7-day reminder
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    fold(`DESCRIPTION:Deadline in 7 days · ${escText(name)}`),
    "TRIGGER:-P7D",
    "END:VALARM",
    // 1-day reminder
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    fold(`DESCRIPTION:Deadline tomorrow · ${escText(name)}`),
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
  ];

  return lines.join("\r\n");
}

Deno.serve(async (req) => {
  // Calendar feed responds with text/calendar (RFC 5545), not JSON —
  // shared respondJson doesn't apply. OPTIONS preflight is custom too
  // (204 status with calendar-specific headers), so kept inline.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: calHeaders });
  }

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim().toUpperCase();

  if (!token || token.length < 16 || token.length > 64) {
    return new Response("Invalid token", { status: 400 });
  }

  const supa = createServiceClient();

  const { data: sub, error: subErr } = await supa
    .from("calendar_subscriptions")
    .select("user_id, fetch_count")
    .eq("feed_token", token)
    .is("revoked_at", null)
    .maybeSingle<{ user_id: string; fetch_count: number }>();

  if (subErr) {
    console.error("[calendar-feed] sub lookup", subErr);
    return new Response("Lookup failed", { status: 500 });
  }
  if (!sub) {
    return new Response("Token not found or revoked", { status: 404 });
  }

  // Pull tracked rows joined with scholarship metadata. Skip the
  // statuses we never want on a calendar (rejected/accepted are done;
  // hidden is the user's "not interested" pile).
  const { data: rows, error: rowsErr } = await supa
    .from("application_tracker")
    .select(`
      scholarship_id,
      status,
      hidden,
      scholarships:scholarship_id (
        scholarship_name,
        application_deadline,
        host_country,
        coverage_type,
        award_amount_text,
        source_url,
        official_url,
        verification_status
      )
    `)
    .eq("user_id", sub.user_id)
    .returns<(TrackerRow & { hidden: boolean })[]>();

  if (rowsErr) {
    console.error("[calendar-feed] tracker query", rowsErr);
    return new Response("Query failed", { status: 500 });
  }

  const nowStamp = fmtDateTimeUTC(new Date());

  const events = (rows ?? [])
    .filter((r) => !r.hidden)
    .filter((r) => r.status !== "rejected" && r.status !== "accepted")
    .filter((r) => !!r.scholarships?.application_deadline)
    // Skip pending / broken — never expose un-vetted deadlines as
    // OS-level reminders. NULL verification status is the legacy
    // value and is treated as visible (matches the rest of the app).
    .filter((r) => {
      const v = r.scholarships?.verification_status;
      return v == null || v === "verified" || v === "stale";
    })
    .map((r) => buildVEvent(r, nowStamp))
    .filter(Boolean);

  // Calendar header — X-WR-CALNAME and X-WR-CALDESC are non-standard
  // but every major client uses them as the displayed feed name /
  // description. REFRESH-INTERVAL hints at the polling cadence.
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:TopUni — Scholarship deadlines",
    "X-WR-CALDESC:Your tracked scholarship deadlines from TopUni. Auto-updates as you save more.",
    "X-WR-TIMEZONE:UTC",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  // Fire-and-forget access bookkeeping. Don't block response on this.
  (async () => {
    try {
      await supa
        .from("calendar_subscriptions")
        .update({
          last_accessed_at: new Date().toISOString(),
          fetch_count: (sub.fetch_count ?? 0) + 1,
        })
        .eq("feed_token", token);
    } catch (e) {
      console.warn("[calendar-feed] bookkeeping failed", e);
    }
  })();

  return new Response(ics, { status: 200, headers: calHeaders });
});
