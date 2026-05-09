-- =============================================================================
-- Link scholarships → providers → registry by name match
-- =============================================================================
-- Audit (310000) showed only 13/213 scholarships link to a registry-tracked
-- funder. The path is scholarship.provider_id → providers.slug →
-- provider_authoritative_facts.provider_slug. The break is most likely at
-- the providers table — the slug values weren't seeded to match the
-- registry slugs the famous-funder migration seeded (chevening,
-- commonwealth-scholarship-commission, daad, etc.).
--
-- This migration:
--   1. Audits how many providers slugs already match registry slugs
--   2. For every registry slug, finds providers whose name suggests that
--      funder and aligns their slug to the registry's expected value
--   3. Backfills scholarships.provider_id for rows that match a registry
--      funder by scholarship_name pattern but lack provider_id
-- =============================================================================

-- ─── Audit BEFORE ───
DO $$
DECLARE
  v_provs_total int;
  v_provs_with_paf_slug int;
  v_schols_with_paf_provider int;
BEGIN
  SELECT count(*) INTO v_provs_total FROM public.providers;
  SELECT count(*) INTO v_provs_with_paf_slug
  FROM public.providers p WHERE p.slug IN (SELECT provider_slug FROM public.provider_authoritative_facts);
  SELECT count(*) INTO v_schols_with_paf_provider
  FROM public.scholarships s
  WHERE s.provider_id IN (
    SELECT p.provider_id FROM public.providers p
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  );
  RAISE NOTICE '[link_before] providers total: % | with registry slug: % | scholarships linked: %',
    v_provs_total, v_provs_with_paf_slug, v_schols_with_paf_provider;
END $$;

-- ─── 1. Skip provider-slug realignment ─────
-- Multiple providers can match the same registry slug (Commonwealth has
-- a separate row for each track), and forcing them onto the same slug
-- violates providers_slug_key UNIQUE. Backfilling scholarships.provider_id
-- in step 2 below is the actual leverage point — that's what makes
-- verify-scholarship find the canonical_url.

-- ─── 2. Backfill scholarships.provider_id from name pattern ────────
-- For rows that lack provider_id but whose scholarship_name clearly
-- comes from a registry-tracked funder, link them up.
DO $$
DECLARE v_count int := 0; v_step int;
BEGIN
  WITH mappings(slug, name_pattern) AS (
    VALUES
      ('chevening',                          'chevening'),
      ('commonwealth-scholarship-commission','^commonwealth\s+'),
      ('daad',                               '^daad\b|deutscher akademischer'),
      ('fulbright-program',                  'fulbright'),
      ('rhodes-trust',                       'rhodes\s+scholar|rhodes\s+trust'),
      ('schwarzman-scholars',                'schwarzman'),
      ('knight-hennessy-scholars',           'knight[\s\-]hennessy'),
      ('gates-cambridge-trust',              'gates\s+cambridge'),
      ('marshall-aid-commemoration-commission','marshall\s+scholar'),
      ('mext-japan',                         'mext\b|^japanese\s+government'),
      ('mastercard-foundation',              'mastercard\s+foundation'),
      ('aga-khan-foundation',                '^aga\s+khan|akf\s+isp'),
      ('eiffel-excellence-scholarship-program','eiffel|france\s+excellence'),
      ('manaaki-new-zealand',                'manaaki|new\s+zealand'),
      ('swedish-institute',                  'swedish\s+institute|^si\s+scholarship'),
      ('hubert-humphrey-fellowship-program', 'humphrey'),
      ('asian-development-bank-japan',       'asian\s+development\s+bank|adb[\s-]?japan|adb\s+jsp|adb-jsp'),
      ('british-council',                    'british\s+council'),
      ('australia-awards',                   'australia\s+awards'),
      ('erasmus-mundus',                     'erasmus\s+mundus|^erasmus\b')
  ),
  -- Build candidates: each scholarship matched to one registry slug; the
  -- registry slug must already exist on a providers.slug row OR we skip
  -- it (the link is a no-op without a provider row). Pick the providers
  -- row with the highest provider stats when multiple share the slug.
  candidates AS (
    SELECT DISTINCT ON (s.scholarship_id)
      s.scholarship_id, p.provider_id
    FROM public.scholarships s
    CROSS JOIN LATERAL (
      SELECT m.slug FROM mappings m WHERE s.scholarship_name ~* m.name_pattern LIMIT 1
    ) match_slug
    JOIN public.providers p ON p.slug = match_slug.slug
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
    WHERE s.verification_status <> 'broken'
      AND (s.provider_id IS NULL OR s.provider_id NOT IN (
        SELECT pp.provider_id FROM public.providers pp
        WHERE pp.slug IN (SELECT provider_slug FROM public.provider_authoritative_facts)
      ))
    ORDER BY s.scholarship_id, p.created_at ASC
  )
  UPDATE public.scholarships s
  SET provider_id = c.provider_id
  FROM candidates c
  WHERE s.scholarship_id = c.scholarship_id
    AND s.provider_id IS DISTINCT FROM c.provider_id;
  GET DIAGNOSTICS v_step = ROW_COUNT;
  v_count := v_count + v_step;
  RAISE NOTICE '[link] scholarships.provider_id backfilled from name regex: %', v_count;
END $$;

-- ─── Audit AFTER ───
DO $$
DECLARE
  v_provs_with_paf_slug int;
  v_schols_with_paf_provider int;
BEGIN
  SELECT count(*) INTO v_provs_with_paf_slug
  FROM public.providers p WHERE p.slug IN (SELECT provider_slug FROM public.provider_authoritative_facts);
  SELECT count(*) INTO v_schols_with_paf_provider
  FROM public.scholarships s
  WHERE s.provider_id IN (
    SELECT p.provider_id FROM public.providers p
    JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  );
  RAISE NOTICE '[link_after] providers with registry slug: % | scholarships linked: %',
    v_provs_with_paf_slug, v_schols_with_paf_provider;
END $$;
