-- 2026-05-20: Academy resources archive.
--
-- Members-only resource library accessible from /academy. Two pieces:
--
--   1. public.academy_resources — metadata rows (title, category,
--      file_path → storage key, language, access_tier, published).
--
--   2. storage.buckets row "academy-resources" — private bucket that
--      holds the actual files. Anonymous SELECT denied. Files are
--      served via the academy-resource-url edge function which mints
--      a 5-minute signed URL after checking the caller's subscription.
--
-- The bucket is private so we can't be scraped or hot-linked. The
-- edge function holds the access policy in one place (RLS on the
-- table covers metadata visibility; the function gates file delivery).
--
-- access_tier:
--   'free'   — visible to any signed-in user (no subscription needed)
--   'member' — requires subscriptions.is_active (pro / founding /
--              earned-trial active) — same gate the AI brief premium
--              tier uses.
--
-- Empty by design — admin uploads land here via /admin/academy/resources.

-- ─── Metadata table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_resources (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  title             text NOT NULL,
  description       text,

  -- Storage key inside the academy-resources bucket. NULL for
  -- "link-only" resources (external article, YouTube link, etc.) —
  -- when NULL, the row carries an external_url instead.
  file_path         text,
  external_url      text,
  file_size_bytes   bigint,
  mime_type         text,

  category          text,
  language          text NOT NULL DEFAULT 'en',
  access_tier       text NOT NULL DEFAULT 'member',
  is_published      boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,

  CONSTRAINT academy_resources_language_chk CHECK (language IN ('en','ru')),
  CONSTRAINT academy_resources_tier_chk CHECK (access_tier IN ('free','member')),
  -- Either a stored file or an external URL — one of them must exist.
  CONSTRAINT academy_resources_payload_chk CHECK (
    file_path IS NOT NULL OR external_url IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS academy_resources_published_idx
  ON public.academy_resources (sort_order, created_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS academy_resources_category_idx
  ON public.academy_resources (category)
  WHERE is_published = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_academy_resources_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_resources_touch_updated_at ON public.academy_resources;
CREATE TRIGGER academy_resources_touch_updated_at
  BEFORE UPDATE ON public.academy_resources
  FOR EACH ROW EXECUTE FUNCTION public.touch_academy_resources_updated_at();

ALTER TABLE public.academy_resources ENABLE ROW LEVEL SECURITY;

-- Public read of *published* rows. The file_path itself is harmless —
-- the actual file is gated by the storage bucket + edge function. We
-- need the row visible so the member list can render titles.
CREATE POLICY "Authenticated users can view published resources"
  ON public.academy_resources FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Admins see + manage everything.
CREATE POLICY "Admins can view all resources"
  ON public.academy_resources FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert resources"
  ON public.academy_resources FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update resources"
  ON public.academy_resources FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete resources"
  ON public.academy_resources FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.academy_resources IS
  'Members-only resource library shown under /academy. Files live in the academy-resources storage bucket; rows here are metadata. Access tier gates download in the academy-resource-url edge function.';

-- ─── Storage bucket ─────────────────────────────────────────────────
-- Private bucket — anon SELECT denied. Admins upload through the
-- /admin/academy/resources page (which writes under the user's JWT,
-- so the admin INSERT policy below gates the upload itself).
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-resources', 'academy-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — only admins can SELECT/INSERT/UPDATE/DELETE objects
-- in this bucket directly. Members get file content via the edge
-- function's signed URL (which uses service-role storage access).
DROP POLICY IF EXISTS "Admins manage academy resource files" ON storage.objects;
CREATE POLICY "Admins manage academy resource files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'academy-resources' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'academy-resources' AND public.has_role(auth.uid(), 'admin'));
