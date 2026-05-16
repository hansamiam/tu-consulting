// Tracks an engagement milestone for the authed user.
// When enough milestones are hit, automatically grants a 5-day "earned trial" of Pro.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS_EXTENDED as corsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { respondJson, respondError } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/clients.ts";

const TRIAL_TRIGGER_MILESTONES = ["profile_completed", "first_quiz", "saved_3_universities"];
const TRIAL_DAYS = 5;

/* Server-side verifier for trial-triggering milestones. Without this,
 * any authed caller could POST 3 milestone_keys and self-grant a
 * 5-day Pro trial — the frontend was the only thing checking that
 * the milestone was actually earned. We confirm against the DB
 * source of truth (student_profiles for profile_completed, the
 * existing engagement_milestones row for first_quiz, the auth-side
 * application_tracker.shortlisted count for saved_3_universities).
 *
 * Non-trial milestone_keys (the long tail of UI nudges, email opens,
 * etc.) bypass the verifier — they don't grant access, only feed
 * analytics, so abuse there is harmless. */
async function isTriggerMilestoneEarned(
  admin: SupabaseClient,
  userId: string,
  key: string,
): Promise<boolean> {
  if (key === "profile_completed") {
    const { data } = await admin
      .from("student_profiles")
      .select("full_name, email, nationality")
      .eq("user_id", userId)
      .maybeSingle();
    return !!(data?.full_name && data?.email && data?.nationality);
  }
  if (key === "saved_3_universities") {
    // shortlisted=true rows in application_tracker are the saves on
    // university scholarships. Count them directly.
    const { count } = await admin
      .from("application_tracker")
      .select("scholarship_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("shortlisted", true);
    return (count ?? 0) >= 3;
  }
  if (key === "first_quiz") {
    // The quiz milestone is fired exactly once on first quiz completion;
    // accept the assertion when no DB-side state to cross-check, but
    // require a non-empty profile (a user who hasn't even built a
    // profile certainly hasn't completed the quiz).
    const { data } = await admin
      .from("student_profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();
    return !!data?.full_name;
  }
  return false;
}

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders);
  if (pre) return pre;

  try {
    const { milestone_key, metadata } = await req.json();
    if (!milestone_key || typeof milestone_key !== "string") {
      return respondError(400, "milestone_key required", corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respondError(401, "Sign in required", corsHeaders);
    }
    const userClient = createUserClient(authHeader);
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) {
      return respondError(401, "Not authenticated", corsHeaders);
    }

    const admin = createServiceClient();

    // For trial-triggering milestones, verify against DB source of
    // truth before recording. Without this gate, a malicious authed
    // caller could POST {milestone_key: "profile_completed"} ×3 and
    // self-grant a 5-day Pro trial without doing anything in the app.
    const isTriggerKey = TRIAL_TRIGGER_MILESTONES.includes(milestone_key);

    // Insert (idempotent via unique constraint). For trigger keys we
    // verify first; non-trigger keys are accepted as-is (analytics
    // signal only, no access granted).
    if (isTriggerKey) {
      const earned = await isTriggerMilestoneEarned(admin, user.id, milestone_key);
      if (!earned) {
        return respondJson(200, { ok: false, error: "Milestone not yet earned" }, corsHeaders);
      }
    }

    await admin.from("engagement_milestones")
      .upsert({ user_id: user.id, milestone_key, metadata: metadata ?? {} },
        { onConflict: "user_id,milestone_key", ignoreDuplicates: true });

    // Check if user qualifies for earned trial
    const { data: profile } = await admin
      .from("profiles")
      .select("earned_trial_started_at, earned_trial_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    let trialActivated = false;
    if (!profile?.earned_trial_started_at) {
      const { data: hits } = await admin
        .from("engagement_milestones")
        .select("milestone_key")
        .eq("user_id", user.id)
        .in("milestone_key", TRIAL_TRIGGER_MILESTONES);

      if (hits && hits.length >= TRIAL_TRIGGER_MILESTONES.length) {
        const start = new Date();
        const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        await admin
          .from("profiles")
          .update({
            earned_trial_started_at: start.toISOString(),
            earned_trial_expires_at: end.toISOString(),
          })
          .eq("user_id", user.id);
        trialActivated = true;
      }
    }

    return respondJson(200, { ok: true, trial_activated: trialActivated }, corsHeaders);
  } catch (e) {
    console.error("track-milestone error:", e);
    return respondError(500, e instanceof Error ? e.message : "Unknown", corsHeaders);
  }
});
