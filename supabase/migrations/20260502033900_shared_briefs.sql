-- ─── Shareable strategy briefs ────────────────────────────────────────
-- Wedge: every generated brief becomes a public URL the student can
-- share with parents/counselors. Each shared page has TopUni branding +
-- a "Build yours" CTA → inbound traffic from each share. Signing up
-- makes briefs permanent and editable; anon briefs auto-expire after
-- 30 days, which converts to either signup or churn.

CREATE TABLE IF NOT EXISTS public.shared_briefs (
  brief_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Short URL slug (8 chars base62). Indexed UNIQUE; collision retry
  -- handled in the edge function with bounded attempts.
  slug                  text NOT NULL UNIQUE,
  -- Raw markdown of the AI report — same shape ReportRenderer consumes.
  content               text NOT NULL,
  language              text NOT NULL DEFAULT 'en',
  report_grade          text NOT NULL DEFAULT 'basic',
  -- Profile snapshot (denormalized so the brief renders identically
  -- even if the student's profile changes later). Selected fields only;
  -- we don't snapshot sensitive data like email or test scores.
  profile_first_name    text,
  profile_grade_level   text,
  profile_major         text,
  profile_target_countries text[],
  -- Ownership
  created_by_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Lifecycle
  expires_at            timestamptz,            -- NULL = never expires (authed users)
  view_count            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- Privacy: false hides from public read (used when the user revokes a share)
  is_public             boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_shared_briefs_slug         ON public.shared_briefs(slug);
CREATE INDEX IF NOT EXISTS idx_shared_briefs_user         ON public.shared_briefs(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_briefs_expires      ON public.shared_briefs(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.shared_briefs ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can fetch a public, non-expired brief by slug.
-- Slug is 8 chars random — sufficiently unguessable for a "share link".
CREATE POLICY "Public read live briefs"
  ON public.shared_briefs FOR SELECT
  USING (
    is_public = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Owner manage: authed users can update / delete their own briefs
-- (revoke, edit privacy flag, hard-delete).
CREATE POLICY "Owner manages brief"
  ON public.shared_briefs FOR ALL
  TO authenticated
  USING (auth.uid() = created_by_user_id)
  WITH CHECK (auth.uid() = created_by_user_id);

-- ─── view_count incrementer ────────────────────────────────────────
-- Public RPC the brief page calls on render. Cheap UPDATE; no auth.
-- Returns nothing (we don't want to leak rows that don't exist via
-- distinguishable error responses).
CREATE OR REPLACE FUNCTION public.increment_brief_view(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_briefs
     SET view_count = view_count + 1
   WHERE slug = p_slug
     AND is_public = true
     AND (expires_at IS NULL OR expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_brief_view(text) TO anon, authenticated;

-- ─── Cleanup of expired briefs ─────────────────────────────────────
-- Run weekly via pg_cron — soft-delete by setting is_public=false so
-- the row is preserved for audit, but no longer surfaces.
CREATE OR REPLACE FUNCTION public.expire_old_shared_briefs()
RETURNS integer
LANGUAGE sql
AS $$
  WITH expired AS (
    UPDATE public.shared_briefs
       SET is_public = false
     WHERE is_public = true
       AND expires_at IS NOT NULL
       AND expires_at < now()
    RETURNING brief_id
  )
  SELECT count(*)::integer FROM expired;
$$;
