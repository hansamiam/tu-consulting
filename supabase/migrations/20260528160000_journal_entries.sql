-- 2026-05-28: Journal entries (TopUni Journal articles).
--
-- Same shape rationale as academy_resources: admin-managed editorial
-- rows, public read of *published* only, RLS via has_role('admin'). No
-- storage bucket — body lives inline as text (paragraph-array JSON);
-- hero image is a plain URL (Unsplash, Supabase storage public bucket,
-- whatever).
--
-- Surfaces:
--   · /admin/journal           — CRUD page
--   · /blog                    — index of published entries
--   · /blog/:slug              — single article (falls back to the
--                                static src/data/blogArticles.ts list)
--
-- Schema notes:
--   · content is text[] (Postgres array) — each element is one
--     paragraph. **bold** syntax is the same convention BlogArticle.tsx
--     already renders for the static articles, so the admin can paste
--     the same shape they'd write by hand.
--   · slug is unique per language so EN + RU translations of the same
--     piece can share the human slug ("admissions-checklist") and we
--     resolve by (slug, language) on the public side.
--   · published_at is set automatically the first time is_published
--     flips true (drives JSON-LD datePublished + sort order).

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  published_at      timestamptz,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  slug              text NOT NULL,
  language          text NOT NULL DEFAULT 'en',

  title             text NOT NULL,
  excerpt           text,
  category          text,
  read_time         text,
  hero_image_url    text,
  content           text[] NOT NULL DEFAULT '{}',

  is_published      boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,

  CONSTRAINT journal_entries_language_chk CHECK (language IN ('en','ru')),
  CONSTRAINT journal_entries_slug_shape_chk CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  CONSTRAINT journal_entries_slug_lang_unique UNIQUE (slug, language)
);

CREATE INDEX IF NOT EXISTS journal_entries_published_idx
  ON public.journal_entries (sort_order, published_at DESC NULLS LAST, created_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS journal_entries_lang_idx
  ON public.journal_entries (language)
  WHERE is_published = true;

-- updated_at touch
CREATE OR REPLACE FUNCTION public.touch_journal_entries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  -- First time we flip is_published true, stamp published_at. Don't
  -- overwrite on re-publish (un-publish then re-publish keeps the
  -- original publish date — same model many CMSes use).
  IF NEW.is_published = true AND OLD.is_published = false AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_entries_touch_updated_at ON public.journal_entries;
CREATE TRIGGER journal_entries_touch_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_journal_entries_updated_at();

-- Same trigger needs to fire on INSERT too — somebody creating an
-- entry with is_published=true at create time should still get a
-- published_at. Separate function so the OLD-row check in the update
-- trigger doesn't choke on INSERT.
CREATE OR REPLACE FUNCTION public.stamp_journal_entries_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_published = true AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_entries_stamp_published_at_insert ON public.journal_entries;
CREATE TRIGGER journal_entries_stamp_published_at_insert
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.stamp_journal_entries_published_at();

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Public can SELECT published rows. Anonymous reads allowed — the
-- whole point of a blog is to be indexable.
CREATE POLICY "Anyone can view published journal entries"
  ON public.journal_entries FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Admins see + manage everything.
CREATE POLICY "Admins can view all journal entries"
  ON public.journal_entries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert journal entries"
  ON public.journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update journal entries"
  ON public.journal_entries FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete journal entries"
  ON public.journal_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Explicit grants — the published-row SELECT policy is moot without
-- the table-level SELECT GRANT to anon (per the "check table grants
-- before debugging RLS" memory).
GRANT SELECT ON public.journal_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;

COMMENT ON TABLE public.journal_entries IS
  'TopUni Journal articles. Admin-managed at /admin/journal. Published rows render at /blog and /blog/:slug. Static src/data/blogArticles.ts remains as a fallback source for legacy URLs.';
