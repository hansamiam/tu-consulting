-- ─── User state in Postgres (was: 8 localStorage keys) ───────────────
-- Architectural fix: stop storing meaningful student state in
-- localStorage where it can't survive device changes, drives no
-- analytics, and can't trigger backend jobs (deadline reminders, etc).
--
-- Four tables. Each scoped to the auth user, RLS enforces "see only your
-- own rows", anon users can't read or write — they continue to use
-- localStorage via the sync hooks until they sign up.
--
-- The hooks (useStudentProfile, useApplicationTracker, etc) are
-- offline-first: they read/write localStorage immediately, then
-- debounce-mirror to DB when authed. Multi-device users see merged
-- state on next login.

-- ─── 1. Student profile ────────────────────────────────────────────
-- One row per authed user. Replaces the WizardData / Profile state
-- that lives in Discover/TopUniAI's component state today.
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name            text,
  email                text,
  nationality          text,
  grade_level          text,
  gpa                  numeric,
  gpa_scale            numeric,
  ielts                numeric,
  toefl                integer,
  sat                  integer,
  target_countries     text[],
  major                text,
  field_of_study       text,
  budget               text,
  scholarship_needed   boolean,
  timeline             text,
  -- Priority weights from the wizard (1-5)
  prestige_weight      smallint,
  scholarship_weight   smallint,
  career_roi_weight    smallint,
  visa_weight          smallint,
  location_weight      smallint,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_nationality ON public.student_profiles(nationality);

-- ─── 2. Application tracker ────────────────────────────────────────
-- Replaces topuni-app-status, topuni-app-notes, topuni-shortlist,
-- topuni-hidden in localStorage. One row per (user, scholarship) pair.
-- Status NULL = the user just shortlisted/hidden/noted but hasn't
-- decided to apply yet.
CREATE TABLE IF NOT EXISTS public.application_tracker (
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id       uuid NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  status               text CHECK (status IS NULL OR status IN
                          ('researching','drafting','submitted','decision','rejected','accepted')),
  notes                text,
  shortlisted          boolean NOT NULL DEFAULT false,
  hidden               boolean NOT NULL DEFAULT false,
  status_changed_at    timestamptz,
  reminder_sent_at     timestamptz,  -- last time we emailed a deadline reminder
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scholarship_id)
);

CREATE INDEX IF NOT EXISTS idx_app_tracker_user ON public.application_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_app_tracker_status ON public.application_tracker(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_tracker_shortlist ON public.application_tracker(user_id) WHERE shortlisted = true;
-- For deadline-reminder cron — find users with active applications whose deadline is approaching
CREATE INDEX IF NOT EXISTS idx_app_tracker_active ON public.application_tracker(user_id, scholarship_id)
  WHERE status IN ('researching','drafting','submitted');

-- ─── 3. Action-plan task completion ────────────────────────────────
-- Replaces topuni-tasks-done. Keyed by stable hash of the task text
-- (same key that the AI report generates client-side). Per-user.
CREATE TABLE IF NOT EXISTS public.student_tasks (
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key             text NOT NULL,
  task_text            text,                              -- the actual task text at time of completion (audit)
  completed_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_student_tasks_user ON public.student_tasks(user_id);

-- ─── 4. Cached pathway reports ─────────────────────────────────────
-- Replaces topuni-pathway-cache localStorage. Keyed by user, with a
-- profile_hash so we know when to invalidate (if the student edits
-- their profile, the hash changes, the cached report is stale).
-- Multiple profile-hash variants kept per user (limit enforced via
-- index strategy; for now we keep one row per user, latest wins).
CREATE TABLE IF NOT EXISTS public.pathway_reports (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_hash         text NOT NULL,
  content              text NOT NULL,
  language             text NOT NULL DEFAULT 'en',
  report_grade         text NOT NULL DEFAULT 'basic',     -- 'basic' | 'premium'
  retrieval_method     text,                               -- 'pgvector_rag' | 'fallback_country_filter'
  generated_at         timestamptz NOT NULL DEFAULT now(),
  token_count          integer
);

-- ─── RLS: users see only their own rows ─────────────────────────────
ALTER TABLE public.student_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathway_reports     ENABLE ROW LEVEL SECURITY;

-- Generic "self-only" policy generator
CREATE POLICY "self read profile"     ON public.student_profiles    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self write profile"    ON public.student_profiles    FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "self read tracker"     ON public.application_tracker FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self write tracker"    ON public.application_tracker FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "self read tasks"       ON public.student_tasks       FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self write tasks"      ON public.student_tasks       FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "self read pathway"     ON public.pathway_reports     FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "self write pathway"    ON public.pathway_reports     FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── updated_at maintenance triggers ───────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_profiles_updated ON public.student_profiles;
CREATE TRIGGER trg_student_profiles_updated
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_app_tracker_updated ON public.application_tracker;
CREATE TRIGGER trg_app_tracker_updated
  BEFORE UPDATE ON public.application_tracker
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Also update status_changed_at when status changes
CREATE OR REPLACE FUNCTION public.touch_status_changed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_tracker_status_changed ON public.application_tracker;
CREATE TRIGGER trg_app_tracker_status_changed
  BEFORE UPDATE ON public.application_tracker
  FOR EACH ROW EXECUTE FUNCTION public.touch_status_changed_at();
