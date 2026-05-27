-- Storage bucket for admin-uploaded scholarship cover images.
--
-- Public read so the cover image renders for anonymous Discover
-- visitors without a signed URL. Admins-only write/delete via the
-- has_role() RLS check used everywhere else in the project.
--
-- We deliberately don't bind file size / mime here — RLS is enough,
-- and Samuel can drop a clearly-too-big file once before we tighten.

INSERT INTO storage.buckets (id, name, public)
VALUES ('scholarship-covers', 'scholarship-covers', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- storage.objects already has RLS enabled at the storage schema level.
-- We add bucket-scoped policies for our use case.

DROP POLICY IF EXISTS "Public read scholarship covers" ON storage.objects;
CREATE POLICY "Public read scholarship covers"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'scholarship-covers');

DROP POLICY IF EXISTS "Admins write scholarship covers" ON storage.objects;
CREATE POLICY "Admins write scholarship covers"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scholarship-covers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins update scholarship covers" ON storage.objects;
CREATE POLICY "Admins update scholarship covers"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'scholarship-covers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'scholarship-covers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins delete scholarship covers" ON storage.objects;
CREATE POLICY "Admins delete scholarship covers"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scholarship-covers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
