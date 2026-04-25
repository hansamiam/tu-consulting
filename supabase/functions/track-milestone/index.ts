// Tracks an engagement milestone for the authed user.
// When enough milestones are hit, automatically grants a 5-day "earned trial" of Pro.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRIAL_TRIGGER_MILESTONES = ["profile_completed", "first_quiz", "saved_3_universities"];
const TRIAL_DAYS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { milestone_key, metadata } = await req.json();
    if (!milestone_key || typeof milestone_key !== "string") {
      return new Response(JSON.stringify({ error: "milestone_key required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert (idempotent via unique constraint)
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

    return new Response(JSON.stringify({ ok: true, trial_activated: trialActivated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-milestone error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
