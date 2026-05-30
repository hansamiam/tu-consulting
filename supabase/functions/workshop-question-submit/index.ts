// workshop-question-submit
//
// Members submit a question for an upcoming workshop / office hour.
// Inserts into workshop_questions, then sends two emails via the
// workshop-question-received template:
//   1. confirmation back to the member ("got it, in the queue")
//   2. notify-the-team copy to the founder address
//
// Auth: caller must be authenticated. We do NOT check membership tier
// here — the FAQ promise extends "direct line to submit questions" to
// the member surface, and gating membership is enforced at the UI
// level by hiding the form on /account when not subscribed.

import { CORS_HEADERS_BASIC as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondError, respondJson } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

const FOUNDER_EMAIL = "samuel.shn.han@gmail.com";

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return respondError(405, "POST only", corsHeaders);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return respondError(401, "Authorization header required", corsHeaders);
  }
  const userClient = createUserClient(authHeader);
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return respondError(401, "Invalid session", corsHeaders);

  let body: { question?: string; workshopId?: string };
  try { body = await req.json(); }
  catch { return respondError(400, "invalid JSON body", corsHeaders); }

  const question = (body.question ?? "").trim();
  if (question.length < 5) {
    return respondError(400, "question must be at least 5 characters", corsHeaders);
  }
  if (question.length > 2000) {
    return respondError(400, "question too long (max 2000 chars)", corsHeaders);
  }

  const admin = createServiceClient();

  // Insert via the user's own JWT so the existing RLS policy applies.
  const { data: row, error: insertErr } = await userClient
    .from("workshop_questions")
    .insert({
      user_id: user.id,
      question,
      workshop_id: body.workshopId ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !row) {
    console.error("[workshop-question-submit] insert failed", insertErr);
    return respondError(500, "could not save question", corsHeaders);
  }

  // Resolve workshop title for the email body (best-effort, non-fatal).
  let workshopTitle: string | undefined;
  if (body.workshopId) {
    const { data: ws } = await admin
      .from("academy_workshops")
      .select("title")
      .eq("id", body.workshopId)
      .maybeSingle();
    workshopTitle = ws?.title ?? undefined;
  }

  // Fan-out: confirm to member + notify the team.
  for (const target of [
    { to: user.email!, forFounder: false, idem: `wq-${row.id}-member` },
    { to: FOUNDER_EMAIL, forFounder: true,  idem: `wq-${row.id}-founder` },
  ]) {
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          recipientEmail: target.to,
          templateName: "workshop-question-received",
          idempotencyKey: target.idem,
          templateData: {
            memberEmail: user.email,
            question,
            workshopTitle,
            forFounder: target.forFounder,
            language: "en",
          },
        },
      });
    } catch (e) {
      console.warn("[workshop-question-submit] enqueue failed", target.to, e);
    }
  }

  return respondJson(200, { ok: true, question_id: row.id }, corsHeaders);
});
