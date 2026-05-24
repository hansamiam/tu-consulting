-- 2026-05-24: student_profiles.language — fix lifecycle email localization gap.
--
-- lifecycle-emails-cron (+ saved-searches-cron, scholarship-deadline-cron,
-- check-subscription) previously hardcoded userLang = "en" with a comment
-- noting student_profiles has no language column. CIS members who completed
-- the Russian wizard / sign-up flow still received English emails despite
-- bilingual templates. This adds the column so the cron can thread the
-- user's language preference through.
--
-- New rows from persistPendingAccount + DiscoverProfileGate writes will
-- carry the wizard's chosen language; older rows default to 'en' and can
-- be updated when the user next round-trips through the profile flow.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'ru'));

COMMENT ON COLUMN public.student_profiles.language IS
  'Preferred UI/email language. Set from the wizard language toggle on profile upsert. Used by lifecycle-emails-cron + friends to pick EN/RU template branch.';
