-- =============================================================================
-- First-class providers entity
-- =============================================================================
-- Until now `provider_name` was a free-text column on scholarships, with
-- `canonicalize_provider()` (20260507260000) collapsing aliases at write
-- time. That fixed name fragmentation but left every row provider-orphan:
--
--   * No way to query "all scholarships from Bill & Melinda Gates Foundation"
--     without a fragile string match.
--   * No place to attach provider-level metadata: trust tier, type
--     (government / foundation / university / corporation / NGO),
--     official website, logo, country of origin, established year.
--   * No SEO surface "/scholarships/by-provider/<slug>" — every Discover
--     row links into per-program pages, never an aggregator-style funder
--     page that ranks for "DAAD scholarships" / "Schwarzman Scholars".
--   * No way to weight match ranking by funder credibility — a
--     row from "Generic Scholarship Trust" surfaces equally to one
--     from a verified government program.
--
-- This migration introduces the `providers` table, an `upsert_provider()`
-- SECURITY DEFINER helper, a BEFORE INSERT/UPDATE trigger that links
-- every scholarship to its canonical provider, and a `refresh_provider_stats()`
-- function that recomputes aggregate stats (scholarships_count,
-- total_award_volume_usd, avg_completeness_score, next_deadline) on
-- demand or via cron.
--
-- Backfill walks every existing scholarships row to populate provider_id
-- and then runs refresh_provider_stats() so the view is hot from t=0.
-- =============================================================================

-- ─── Schema ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.providers (
  provider_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     text UNIQUE NOT NULL,
  canonical_name           text NOT NULL,
  provider_type            text,
  host_country             text,
  official_website         text,
  logo_url                 text,
  description              text,
  trust_tier               text NOT NULL DEFAULT 'unknown',
  scholarships_count       integer NOT NULL DEFAULT 0,
  active_scholarships_count integer NOT NULL DEFAULT 0,
  total_award_volume_usd   numeric NOT NULL DEFAULT 0,
  avg_completeness_score   numeric,
  next_deadline            date,
  established_year         smallint,
  created_at               timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at        timestamptz,
  CONSTRAINT providers_type_chk CHECK (
    provider_type IS NULL
    OR provider_type IN ('government','foundation','university','corporation','ngo','consortium','other')
  ),
  CONSTRAINT providers_trust_chk CHECK (
    trust_tier IN ('high','medium','low','unknown')
  )
);

COMMENT ON TABLE public.providers IS
  'Canonical provider entity. One row per funding organization. Fed by upsert_provider() + scholarships BEFORE-write trigger; aggregate stats refreshed by refresh_provider_stats() (cron + on demand).';

CREATE INDEX IF NOT EXISTS providers_trust_idx ON public.providers (trust_tier) WHERE trust_tier <> 'unknown';
CREATE INDEX IF NOT EXISTS providers_active_count_idx ON public.providers (active_scholarships_count DESC) WHERE active_scholarships_count > 0;

-- ─── Slugify helper ────────────────────────────────────────────────────
-- Lowercase, drop apostrophes, replace non-alphanumeric with hyphen,
-- collapse repeats, trim. Mirrors typical web slug conventions.
CREATE OR REPLACE FUNCTION public.provider_slug(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(p_name, '')), '[''’]', '', 'g'),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '-+',
      '-',
      'g'
    ),
    '-'
  );
$$;

GRANT EXECUTE ON FUNCTION public.provider_slug(text) TO anon, authenticated, service_role;

-- ─── upsert_provider — find-or-create by slug ──────────────────────────
-- Takes a raw provider name, runs canonicalize_provider() to collapse
-- aliases, derives a slug, and returns the provider_id (creating the
-- row on first sight). SECURITY DEFINER so it can write providers from
-- a scholarships trigger context where the calling role might not have
-- INSERT privileges on providers.
CREATE OR REPLACE FUNCTION public.upsert_provider(p_raw_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical text;
  v_slug text;
  v_id uuid;
BEGIN
  IF p_raw_name IS NULL OR length(btrim(p_raw_name)) = 0 THEN RETURN NULL; END IF;

  v_canonical := public.canonicalize_provider(p_raw_name);
  IF v_canonical IS NULL OR length(btrim(v_canonical)) = 0 THEN RETURN NULL; END IF;

  v_slug := public.provider_slug(v_canonical);
  IF v_slug IS NULL OR length(v_slug) = 0 THEN RETURN NULL; END IF;

  -- Atomic find-or-create.
  INSERT INTO public.providers (slug, canonical_name)
  VALUES (v_slug, v_canonical)
  ON CONFLICT (slug) DO UPDATE
    SET canonical_name = EXCLUDED.canonical_name
    WHERE public.providers.canonical_name <> EXCLUDED.canonical_name
  RETURNING provider_id INTO v_id;

  -- ON CONFLICT DO NOTHING path returns no row when the slug already
  -- existed AND the names matched — fall through to a SELECT.
  IF v_id IS NULL THEN
    SELECT provider_id INTO v_id FROM public.providers WHERE slug = v_slug LIMIT 1;
  END IF;

  RETURN v_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.upsert_provider(text) TO service_role;

-- ─── scholarships.provider_id column + FK + index ─────────────────────
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS provider_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'scholarships'
      AND constraint_name = 'scholarships_provider_fk'
  ) THEN
    ALTER TABLE public.scholarships
      ADD CONSTRAINT scholarships_provider_fk
      FOREIGN KEY (provider_id) REFERENCES public.providers(provider_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS scholarships_provider_idx ON public.scholarships (provider_id) WHERE provider_id IS NOT NULL;

-- ─── BEFORE INSERT/UPDATE trigger on scholarships ──────────────────────
-- Auto-link every row to its canonical provider. Only re-resolves when
-- provider_name actually changes (cheap on no-op updates). NULL or junk
-- provider names leave provider_id NULL.
CREATE OR REPLACE FUNCTION public.scholarships_link_provider()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only resolve when provider_name changed OR provider_id is missing.
  IF TG_OP = 'INSERT'
     OR NEW.provider_name IS DISTINCT FROM OLD.provider_name
     OR NEW.provider_id IS NULL THEN
    NEW.provider_id := public.upsert_provider(NEW.provider_name);
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS scholarships_link_provider ON public.scholarships;
CREATE TRIGGER scholarships_link_provider
  BEFORE INSERT OR UPDATE ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.scholarships_link_provider();

-- ─── refresh_provider_stats — aggregate stats from scholarships ─────────
-- Computes scholarships_count + active_scholarships_count + total funding
-- + avg completeness + nearest active deadline per provider. Idempotent;
-- safe to call from the daily cron AND on-demand after admin imports.
-- Providers with zero linked scholarships have their stats zeroed (no
-- DELETE — keeps the audit trail).
CREATE OR REPLACE FUNCTION public.refresh_provider_stats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH agg AS (
    SELECT
      s.provider_id,
      count(*)::integer AS scholarships_count,
      count(*) FILTER (
        WHERE s.lifecycle_status IN ('active','reopens_annually')
          OR s.lifecycle_status IS NULL
      )::integer AS active_count,
      sum(coalesce(s.estimated_total_value_usd, 0))::numeric AS total_value,
      avg(s.data_completeness_score)::numeric AS avg_completeness,
      min(
        CASE
          WHEN s.application_deadline >= current_date
            AND (s.lifecycle_status IN ('active','reopens_annually')
                 OR s.lifecycle_status IS NULL)
          THEN s.application_deadline
        END
      )::date AS next_active_deadline
    FROM public.scholarships s
    WHERE s.provider_id IS NOT NULL
    GROUP BY s.provider_id
  )
  UPDATE public.providers p
  SET scholarships_count        = coalesce(agg.scholarships_count, 0),
      active_scholarships_count = coalesce(agg.active_count, 0),
      total_award_volume_usd    = coalesce(agg.total_value, 0),
      avg_completeness_score    = agg.avg_completeness,
      next_deadline             = agg.next_active_deadline,
      last_refreshed_at         = now()
  FROM agg
  WHERE p.provider_id = agg.provider_id;

  -- Zero out providers that no longer have any linked rows.
  UPDATE public.providers p
  SET scholarships_count = 0,
      active_scholarships_count = 0,
      total_award_volume_usd = 0,
      avg_completeness_score = NULL,
      next_deadline = NULL,
      last_refreshed_at = now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.scholarships s WHERE s.provider_id = p.provider_id
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;

GRANT EXECUTE ON FUNCTION public.refresh_provider_stats() TO service_role;

-- ─── Backfill: link every existing row to its canonical provider ───────
-- Walk all scholarships rows, populate provider_id via upsert_provider().
-- Limited to rows with non-null provider_name; junk names stay NULL.
DO $$
DECLARE
  r record;
  v_id uuid;
BEGIN
  FOR r IN SELECT scholarship_id, provider_name FROM public.scholarships WHERE provider_name IS NOT NULL AND length(btrim(provider_name)) > 0 LOOP
    v_id := public.upsert_provider(r.provider_name);
    IF v_id IS NOT NULL THEN
      UPDATE public.scholarships SET provider_id = v_id WHERE scholarship_id = r.scholarship_id AND provider_id IS DISTINCT FROM v_id;
    END IF;
  END LOOP;
END $$;

-- Refresh aggregate stats so the table is immediately useful.
SELECT public.refresh_provider_stats();

-- ─── RLS: providers are public-read; admin-write ───────────────────────
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers_public_read" ON public.providers;
CREATE POLICY "providers_public_read"
  ON public.providers FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.providers TO anon, authenticated;
GRANT ALL ON public.providers TO service_role;
