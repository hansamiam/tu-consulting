// Auth callback page — handles magic link return + OAuth tokens.
//
// Beyond just signing the user in, this page is responsible for
// draining any pending-account payload (profile + brief) that the
// wizard stashed in localStorage before sending the magic-link email.
// Without this, the wizard's data would be lost on first auth.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { clearPendingAccount, getPendingAccount, type PendingAccountPayload } from "@/lib/pendingAccount";
import { clearPendingReferral, getPendingReferral } from "@/lib/referralCapture";
import { consumePostAuthRedirect } from "@/lib/postAuthRedirect";

const AuthCallback = () => {
  const navigate = useNavigate();
  // Detect language from the post-auth redirect target so Russian
  // users see a Russian status during the brief flash before navigate.
  // Peek without consuming — the consume happens later inside the effect.
  const isRu = (() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("topuni-post-auth-redirect-v1");
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { dest?: string };
      return typeof parsed.dest === "string" && /\/ru($|\/)/.test(parsed.dest);
    } catch { return false; }
  })();
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const [status, setStatus] = useState<string>(t("Signing you in…", "Входим в аккаунт…"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Give Supabase a tick to parse the hash + establish the session
      await new Promise((r) => setTimeout(r, 400));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        navigate("/", { replace: true });
        return;
      }

      // Drain pending account payload (set by SaveBriefPrompt before the
      // magic-link email was triggered). Best-effort — failures here
      // shouldn't block sign-in.
      const pending = getPendingAccount();
      if (pending) {
        setStatus(t("Saving your brief and profile…", "Сохраняем брифинг и профиль…"));
        try {
          await persistPendingAccount(data.session.user.id, pending);
        } catch (e) {
          console.warn("[AuthCallback] persist pending failed", e);
        }
        clearPendingAccount();
      }

      // Drain pending referral code (set by ReferralCaptor on any
      // landing page that had ?ref=CODE in the URL).
      const referralCode = getPendingReferral();
      if (referralCode) {
        setStatus(t("Linking your referral…", "Привязываем реферальный код…"));
        try {
          await supabase.functions.invoke("register-referral", {
            body: { code: referralCode },
          });
        } catch (e) {
          console.warn("[AuthCallback] register-referral failed", e);
        }
        clearPendingReferral();
      }

      // Cross-tab safe — localStorage survives the email-client opening
      // the magic link in a new tab. sessionStorage was per-tab and
      // silently lost the target on those flows.
      const dest = consumePostAuthRedirect() || "/account";
      navigate(dest, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;

/* ─── Persisters ─────────────────────────────────────────────────
   Upserts the wizard's profile into student_profiles and the cached
   pathway into pathway_reports. Numeric coercions are forgiving:
   "3.7" / 3.7 / "" all resolve sanely. */
async function persistPendingAccount(userId: string, p: PendingAccountPayload) {
  const profile = p.profile ?? {};

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };
  const intNum = (v: unknown): number | null => {
    const n = num(v);
    return n === null ? null : Math.round(n);
  };

  await supabase.from("student_profiles").upsert(
    {
      user_id: userId,
      full_name: profile.fullName ?? null,
      email: profile.email ?? null,
      nationality: profile.nationality ?? null,
      grade_level: profile.gradeLevel ?? null,
      gpa: num(profile.gpa),
      gpa_scale: num(profile.gpaScale),
      ielts: num(profile.ielts),
      toefl: num(profile.toefl),
      sat: intNum(profile.sat),
      target_countries: profile.targetCountries ?? null,
      major: profile.major ?? null,
      field_of_study: profile.fieldOfStudy ?? profile.major ?? null,
      budget: profile.budget ?? null,
      scholarship_needed: profile.scholarshipNeeded === "yes" ? true : profile.scholarshipNeeded === "no" ? false : null,
      timeline: profile.timeline ?? null,
      prestige_weight: intNum(profile.prestige),
      scholarship_weight: intNum(profile.scholarshipPriority),
      career_roi_weight: intNum(profile.careerRoi),
      visa_weight: intNum(profile.visaAccess),
      location_weight: intNum(profile.locationPref),
    },
    { onConflict: "user_id" },
  );

  if (p.pathway && p.pathway.content && p.pathway.content.length > 100) {
    await supabase.from("pathway_reports").upsert(
      {
        user_id: userId,
        profile_hash: p.pathway.profileHash || "pending",
        content: p.pathway.content,
        language: p.pathway.language || "en",
        report_grade: p.pathway.grade || "basic",
      },
      { onConflict: "user_id" },
    );
  }
}
