-- Re-apply missing tables on the new Supabase project.
-- The new project (bsfldtpemfxhnkdzccib) is missing the v2 user-state,
-- documents, and counselor-chat tables that were only ever applied to
-- the previous project. All statements are IF NOT EXISTS / idempotent
-- so this is safe to re-run.

-- Shared updated_at trigger fn (idempotent)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ─── student_profiles, application_tracker, student_tasks, pathway_reports ───
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, email text, nationality text, grade_level text,
  gpa numeric, gpa_scale numeric, ielts numeric, toefl integer, sat integer,
  target_countries text[], major text, field_of_study text, budget text,
  scholarship_needed boolean, timeline text,
  prestige_weight smallint, scholarship_weight smallint, career_roi_weight smallint,
  visa_weight smallint, location_weight smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_nationality ON public.student_profiles(nationality);

CREATE TABLE IF NOT EXISTS public.application_tracker (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  status text CHECK (status IS NULL OR status IN
    ('researching','drafting','submitted','decision','rejected','accepted')),
  notes text,
  shortlisted boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  status_changed_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scholarship_id)
);
CREATE INDEX IF NOT EXISTS idx_app_tracker_user ON public.application_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_app_tracker_status ON public.application_tracker(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_tracker_shortlist ON public.application_tracker(user_id) WHERE shortlisted = true;
CREATE INDEX IF NOT EXISTS idx_app_tracker_active ON public.application_tracker(user_id, scholarship_id)
  WHERE status IN ('researching','drafting','submitted');

CREATE TABLE IF NOT EXISTS public.student_tasks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  task_text text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_key)
);
CREATE INDEX IF NOT EXISTS idx_student_tasks_user ON public.student_tasks(user_id);

CREATE TABLE IF NOT EXISTS public.pathway_reports (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_hash text NOT NULL,
  content text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  report_grade text NOT NULL DEFAULT 'basic',
  retrieval_method text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  token_count integer
);

ALTER TABLE public.student_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathway_reports     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "self read profile"  ON public.student_profiles    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "self write profile" ON public.student_profiles    FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "self read tracker"  ON public.application_tracker FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "self write tracker" ON public.application_tracker FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "self read tasks"    ON public.student_tasks       FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "self write tasks"   ON public.student_tasks       FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "self read pathway"  ON public.pathway_reports     FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "self write pathway" ON public.pathway_reports     FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_student_profiles_updated ON public.student_profiles;
CREATE TRIGGER trg_student_profiles_updated BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_app_tracker_updated ON public.application_tracker;
CREATE TRIGGER trg_app_tracker_updated BEFORE UPDATE ON public.application_tracker
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.touch_status_changed_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.status_changed_at = now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_app_tracker_status_changed ON public.application_tracker;
CREATE TRIGGER trg_app_tracker_status_changed BEFORE UPDATE ON public.application_tracker
  FOR EACH ROW EXECUTE FUNCTION public.touch_status_changed_at();

-- ─── student_documents (+ storage bucket) ───
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-documents','student-documents', false, 10*1024*1024,
  ARRAY['application/pdf','image/png','image/jpeg','image/webp','image/heic',
        'text/plain','application/rtf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Owner reads own documents"   ON storage.objects;
CREATE POLICY "Owner reads own documents"   ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Owner writes own documents"  ON storage.objects;
CREATE POLICY "Owner writes own documents"  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Owner updates own documents" ON storage.objects;
CREATE POLICY "Owner updates own documents" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Owner deletes own documents" ON storage.objects;
CREATE POLICY "Owner deletes own documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE TABLE IF NOT EXISTS public.student_documents (
  document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  size_bytes bigint,
  kind text NOT NULL CHECK (kind IN ('transcript','essay_draft','reference_letter','cv','test_score','other')),
  title text,
  extracted_text text,
  parse_status text NOT NULL DEFAULT 'pending'
    CHECK (parse_status IN ('pending','parsing','ready','failed','unsupported')),
  parse_error text,
  parsed_at timestamptz,
  use_in_counselor boolean NOT NULL DEFAULT true,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_docs_user      ON public.student_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_student_docs_user_kind ON public.student_documents(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_student_docs_in_chat   ON public.student_documents(user_id) WHERE use_in_counselor = true AND parse_status = 'ready';
CREATE INDEX IF NOT EXISTS idx_student_docs_pending   ON public.student_documents(parse_status) WHERE parse_status IN ('pending','parsing');

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Self read documents"   ON public.student_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Self manage documents" ON public.student_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_student_docs_updated ON public.student_documents;
CREATE TRIGGER trg_student_docs_updated BEFORE UPDATE ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── counselor_sessions / counselor_messages ───
CREATE TABLE IF NOT EXISTS public.counselor_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_counselor_sessions_user
  ON public.counselor_sessions(user_id, last_message_at DESC) WHERE archived = false;

CREATE TABLE IF NOT EXISTS public.counselor_messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.counselor_sessions(session_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_counselor_messages_session ON public.counselor_messages(session_id, created_at);

ALTER TABLE public.counselor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Self read sessions"  ON public.counselor_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Self write sessions" ON public.counselor_sessions FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Self read messages"  ON public.counselor_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Self write messages" ON public.counselor_messages FOR ALL    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.touch_session_on_message()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.counselor_sessions
     SET last_message_at = NEW.created_at, message_count = message_count + 1
   WHERE session_id = NEW.session_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_touch_session_on_message ON public.counselor_messages;
CREATE TRIGGER trg_touch_session_on_message AFTER INSERT ON public.counselor_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_session_on_message();
