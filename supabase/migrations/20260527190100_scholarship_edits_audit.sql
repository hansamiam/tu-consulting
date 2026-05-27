-- Audit log for inline admin edits made from the public scholarship
-- detail page. One row per field-change Save. Insert-only — never
-- updated, never deleted (deletes via scholarship CASCADE only).
--
-- Read access is restricted to admins so we can answer "who changed
-- this and when?" without exposing edit traffic publicly.

CREATE TABLE IF NOT EXISTS public.scholarship_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE,
  editor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  editor_email text NOT NULL,
  field_name text NOT NULL,
  value_before jsonb,
  value_after jsonb,
  edited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scholarship_edits_scholarship_id_edited_at_idx
  ON public.scholarship_edits (scholarship_id, edited_at DESC);

CREATE INDEX IF NOT EXISTS scholarship_edits_editor_user_id_idx
  ON public.scholarship_edits (editor_user_id);

ALTER TABLE public.scholarship_edits ENABLE ROW LEVEL SECURITY;

-- Admins read all rows.
DROP POLICY IF EXISTS "Admins read scholarship_edits" ON public.scholarship_edits;
CREATE POLICY "Admins read scholarship_edits"
  ON public.scholarship_edits
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins insert (the audit row goes in alongside the scholarships UPDATE
-- from the same admin session). editor_user_id is auth.uid() — the WITH CHECK
-- enforces that so admins can't fabricate edits as another user.
DROP POLICY IF EXISTS "Admins insert scholarship_edits" ON public.scholarship_edits;
CREATE POLICY "Admins insert scholarship_edits"
  ON public.scholarship_edits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND editor_user_id = auth.uid()
  );

-- No UPDATE / DELETE policies. The audit log is append-only.

GRANT SELECT, INSERT ON TABLE public.scholarship_edits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scholarship_edits TO service_role;

COMMENT ON TABLE public.scholarship_edits IS
  'Append-only audit log of inline admin edits to scholarships rows + mini-guide JSONB. One row per Save action per field.';
