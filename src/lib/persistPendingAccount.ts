/* persistPendingAccount — extracted from AuthCallback so the password
 * sign-in / sign-up paths in AuthContext can run the same drain
 * (wizard profile + cached brief → student_profiles + pathway_reports)
 * without rerouting through /auth/callback.
 *
 * Numeric coercions are forgiving: "3.7" / 3.7 / "" all resolve sanely. */
import { supabase } from "@/integrations/supabase/client";
import type { PendingAccountPayload } from "@/lib/pendingAccount";

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const intNum = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

export async function persistPendingAccount(userId: string, p: PendingAccountPayload): Promise<void> {
  const profile = p.profile ?? {};
  // Language comes from the brief that the wizard just generated (the
  // toggle the user picked). Falls back to 'en' for older payloads.
  const language: "en" | "ru" = p.pathway?.language === "ru" ? "ru" : "en";

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
      language,
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
