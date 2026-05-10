-- =============================================================================
-- Make sure every registry slug has a matching providers row
-- =============================================================================
-- The link_scholarships_to_registry passes only succeed when both
-- providers.slug AND provider_authoritative_facts.provider_slug exist
-- with the same value. Many registry slugs (asian-development-bank-japan,
-- swedish-institute, manaaki-new-zealand, etc.) don't have a matching
-- providers row, so the JOIN drops every candidate scholarship even
-- when its name clearly matches a registry funder.
--
-- This migration inserts a providers row for every registry slug that's
-- missing one, then re-runs the name-pattern linker so the gap closes.
-- =============================================================================

-- Insert any missing providers rows. canonical_name is best-effort —
-- prettify the slug; admin can refine later.
INSERT INTO public.providers (slug, canonical_name, created_at)
SELECT
  paf.provider_slug,
  initcap(replace(paf.provider_slug, '-', ' ')),
  now()
FROM public.provider_authoritative_facts paf
WHERE NOT EXISTS (
  SELECT 1 FROM public.providers p WHERE p.slug = paf.provider_slug
)
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.providers p WHERE p.slug IN (SELECT provider_slug FROM public.provider_authoritative_facts);
  RAISE NOTICE '[seed_providers] providers with registry slug after seed: % (target 22)', v_count;
END $$;

-- Re-run the linker with all registry slugs now backed by a providers row.
DO $$
DECLARE v_step int;
BEGIN
  WITH mappings(slug, name_pattern) AS (
    VALUES
      ('chevening',                          'chevening'),
      ('commonwealth-scholarship-commission','commonwealth\s+(scholar|master|shared|distance|phd|profess)'),
      ('daad',                               '\mdaad\M|deutscher akademischer'),
      ('fulbright-program',                  'fulbright'),
      ('rhodes-trust',                       'rhodes\s+(scholar|trust)'),
      ('schwarzman-scholars',                'schwarzman'),
      ('knight-hennessy-scholars',           'knight[\s\-]hennessy|knight\s+hennessy'),
      ('gates-cambridge-trust',              'gates\s+cambridge|gates\s+scholarsh'),
      ('marshall-aid-commemoration-commission','marshall\s+scholar|^marshall\b'),
      ('mext-japan',                         '\mmext\b|japanese\s+government|monbukagakusho'),
      ('mastercard-foundation',              'mastercard\s+foundation|mastercard\s+scholar'),
      ('aga-khan-foundation',                'aga\s+khan'),
      ('eiffel-excellence-scholarship-program','eiffel|france\s+excellence'),
      ('manaaki-new-zealand',                'manaaki|new\s+zealand\s+(scholar|government|aid|development)'),
      ('swedish-institute',                  'swedish\s+institute|^si\s+scholarship|sisgp'),
      ('hubert-humphrey-fellowship-program', 'humphrey'),
      ('asian-development-bank-japan',       'asian\s+development\s+bank|adb[\s\-‐–]?(japan|jsp)|adb\-jsp'),
      ('british-council',                    'british\s+council'),
      ('australia-awards',                   'australia\s+award'),
      ('erasmus-mundus',                     'erasmus\s+mundus|^erasmus\b')
  ),
  candidates AS (
    SELECT DISTINCT ON (s.scholarship_id)
      s.scholarship_id, p.provider_id
    FROM public.scholarships s
    CROSS JOIN LATERAL (
      SELECT m.slug
      FROM mappings m
      WHERE s.scholarship_name ~* m.name_pattern
         OR (s.provider_name IS NOT NULL AND s.provider_name ~* m.name_pattern)
      LIMIT 1
    ) match_slug
    JOIN public.providers p ON p.slug = match_slug.slug
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
    WHERE s.verification_status <> 'broken'
    ORDER BY s.scholarship_id, p.created_at ASC
  )
  UPDATE public.scholarships s
  SET provider_id = c.provider_id
  FROM candidates c
  WHERE s.scholarship_id = c.scholarship_id
    AND s.provider_id IS DISTINCT FROM c.provider_id;
  GET DIAGNOSTICS v_step = ROW_COUNT;
  RAISE NOTICE '[seed_providers_link] rows linked after seed: %', v_step;
END $$;

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.scholarships s
  WHERE s.provider_id IN (
    SELECT p.provider_id FROM public.providers p
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  );
  RAISE NOTICE '[seed_providers_after] scholarships linked: % / 213', v_count;
END $$;
