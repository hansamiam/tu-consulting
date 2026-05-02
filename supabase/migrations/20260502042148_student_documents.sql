-- ─── Student documents — transcript / draft / reference upload ───────
-- A storage bucket + a metadata table the counselor reads from. Once
-- a student uploads a transcript, the AI counselor sees the extracted
-- text in its case context — advice becomes genuinely personalised
-- (cite GPA, courses, references) instead of "tell me about your
-- transcript".
--
-- Privacy model: bucket is private; objects keyed by user_id; RLS
-- restricts both metadata and storage operations to the owner.

-- ─── Storage bucket ───────────────────────────────────────────────
-- Create the bucket. NOT public — every read goes through a signed
-- URL or the storage RLS-aware client.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10 * 1024 * 1024,                                -- 10 MB cap
  ARRAY[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/heic',
    'text/plain', 'application/rtf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS — owner-only on objects keyed by `{user_id}/...`
DROP POLICY IF EXISTS "Owner reads own documents" ON storage.objects;
CREATE POLICY "Owner reads own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Owner writes own documents" ON storage.objects;
CREATE POLICY "Owner writes own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Owner updates own documents" ON storage.objects;
CREATE POLICY "Owner updates own documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Owner deletes own documents" ON storage.objects;
CREATE POLICY "Owner deletes own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Metadata table ───────────────────────────────────────────────
-- One row per uploaded document. Keeps cached extracted_text so the
-- counselor reads from this row instead of re-fetching + re-parsing
-- on every chat turn.
CREATE TABLE IF NOT EXISTS public.student_documents (
  document_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Storage object path within the bucket: `{user_id}/{filename}`
  storage_path    text NOT NULL,
  filename        text NOT NULL,
  mime_type       text,
  size_bytes      bigint,
  -- Categorisation — drives how the counselor talks about it
  kind            text NOT NULL CHECK (kind IN (
    'transcript', 'essay_draft', 'reference_letter', 'cv', 'test_score', 'other'
  )),
  -- Optional human title ("Fall 2026 transcript") — defaults to filename
  title           text,
  -- Extracted text + parse status
  extracted_text  text,
  parse_status    text NOT NULL DEFAULT 'pending'
    CHECK (parse_status IN ('pending', 'parsing', 'ready', 'failed', 'unsupported')),
  parse_error     text,
  parsed_at       timestamptz,
  -- Whether the user wants this fed into the counselor's context.
  -- Default true; the user can toggle off without deleting the file.
  use_in_counselor boolean NOT NULL DEFAULT true,
  -- Lifecycle
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_docs_user        ON public.student_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_student_docs_user_kind   ON public.student_documents(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_student_docs_in_chat     ON public.student_documents(user_id) WHERE use_in_counselor = true AND parse_status = 'ready';
CREATE INDEX IF NOT EXISTS idx_student_docs_pending     ON public.student_documents(parse_status) WHERE parse_status IN ('pending', 'parsing');

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self read documents"
  ON public.student_documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Self manage documents"
  ON public.student_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at maintenance
DROP TRIGGER IF EXISTS trg_student_docs_updated ON public.student_documents;
CREATE TRIGGER trg_student_docs_updated
  BEFORE UPDATE ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
