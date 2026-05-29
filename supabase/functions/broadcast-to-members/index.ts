// broadcast-to-members
//
// Ad-hoc broadcast surface used by /admin/notices. Two callers:
//
//   1. Admin clicks "Send broadcast" in /admin/notices — frontend
//      invokes this function with body { subject, body_markdown, kind,
//      segment }. The function INSERTs a row into broadcast_notices,
//      enumerates matching subscribers, and fan-outs the
//      announcement-generic template. Returns the broadcast row + count.
//
//   2. (Future) Internal callers (a "schedule change" cron, a launch
//      automation) can invoke with their own subject/body without going
//      through the admin UI.
//
// Segment values supported in v1:
//   - "all_members"     : subscriptions.status in (active, trialing)
//   - "needs_funding"   : ability_to_pay = 'full_scholarship_only'
//                         (joined via student_profiles)
//   - "english_weak"    : englishScore < 6.5 in student_profiles
//
// Authn: requireAdminOrService — the admin UI uses the caller's JWT;
// service-role / cron callers use the dispatch token.

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/clients.ts";
import { requireAdminOrService } from "../_shared/auth.ts";

interface BroadcastBody {
  subject: string;
  body_markdown: string;
  kind?: "emergency" | "workshop" | "announcement" | "product";
  segment?: "all_members" | "needs_funding" | "english_weak";
}

async function resolveAudience(
  admin: ReturnType<typeof createServiceClient>,
  segment: NonNullable<BroadcastBody["segment"]>,
): Promise<{ email: string; user_id: string | null }[]> {
  // Base set: active or trialing subscribers.
  const { data: base, error } = await admin
    .from("subscriptions")
    .select("email, user_id")
    .in("status", ["active", "trialing"]);
  if (error) {
    console.error("[broadcast-to-members] base audience load failed", error);
    return [];
  }
  const baseRows = (base ?? []).filter((r) => !!r.email);
  if (segment === "all_members") return baseRows;

  // Narrow by joining student_profiles. Cast through any to dodge
  // gen:types drift for newer columns until the types file refreshes.
  // deno-lint-ignore no-explicit-any
  const db = admin as any;
  const userIds = baseRows.map((r) => r.user_id).filter(Boolean) as string[];
  if (userIds.length === 0) return [];

  const { data: profiles } = await db
    .from("student_profiles")
    .select("user_id, ability_to_pay, english_score")
    .in("user_id", userIds);

  const passUserIds = new Set<string>(
    (profiles ?? [])
      .filter((p: { ability_to_pay?: string | null; english_score?: number | null }) => {
        if (segment === "needs_funding") return p.ability_to_pay === "full_scholarship_only";
        if (segment === "english_weak") {
          return typeof p.english_score === "number" && p.english_score < 6.5;
        }
        return false;
      })
      .map((p: { user_id: string }) => p.user_id),
  );

  return baseRows.filter((r) => r.user_id && passUserIds.has(r.user_id));
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;

  const auth = await requireAdminOrService(req);
  if (!auth.ok) return respondError(401, auth.reason ?? "unauthorized", corsHeaders);

  let body: BroadcastBody;
  try {
    body = await req.json();
  } catch {
    return respondError(400, "invalid JSON body", corsHeaders);
  }

  if (!body.subject || !body.body_markdown) {
    return respondError(400, "subject and body_markdown are required", corsHeaders);
  }

  const kind = body.kind ?? "announcement";
  const segment = body.segment ?? "all_members";
  const admin = createServiceClient();

  // Insert the broadcast row first — gives us an ID we can hand back
  // to the caller and a place to stamp final fan_out_count on success.
  const { data: noticeRow, error: insertErr } = await admin
    .from("broadcast_notices")
    .insert({
      kind,
      subject: body.subject,
      body_markdown: body.body_markdown,
      segment,
      created_by: auth.userId ?? null,
    })
    .select("id")
    .single();

  if (insertErr || !noticeRow) {
    console.error("[broadcast-to-members] notice insert failed", insertErr);
    return respondError(500, "could not log broadcast", corsHeaders);
  }

  const audience = await resolveAudience(admin, segment);

  let queued = 0;
  for (const m of audience) {
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: m.email,
          templateName: "announcement-generic",
          // One per (broadcast, recipient) pair. Stripe-style retries
          // (or admin double-clicks) can't double-send.
          idempotencyKey: `broadcast-${noticeRow.id}-${m.email}`,
          templateData: {
            subject: body.subject,
            bodyMarkdown: body.body_markdown,
            kind,
            language: "en",
          },
        },
      });
      queued++;
    } catch (e) {
      console.warn("[broadcast-to-members] enqueue failed", m.email, e);
    }
  }

  await admin
    .from("broadcast_notices")
    .update({ sent_at: new Date().toISOString(), fan_out_count: queued })
    .eq("id", noticeRow.id);

  return respondJson(
    { ok: true, broadcast_id: noticeRow.id, audience_size: audience.length, queued },
    200,
    corsHeaders,
  );
});
