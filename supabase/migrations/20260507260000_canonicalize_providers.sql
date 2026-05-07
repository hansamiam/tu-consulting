-- =============================================================================
-- Canonicalize provider_name across the catalog
-- =============================================================================
-- Same fragmentation problem as target_fields (20260507200000). The LLM
-- emits famous funders under many string variants:
--   * "DAAD" / "Deutscher Akademischer Austauschdienst" /
--     "German Academic Exchange Service"
--   * "UNESCO" / "United Nations Educational, Scientific and Cultural
--     Organization"
--   * "MEXT" / "Japanese Ministry of Education, Culture, Sports, Science
--     and Technology" / "Monbukagakusho"
--   * "Knight-Hennessy Scholars" / "Knight Hennessy Scholars" /
--     "Knight-Hennessy" / "Stanford Knight Hennessy Scholars"
--   * etc.
--
-- Until now these stored as separate provider_name strings, fragmenting:
--   - Discover provider filter
--   - Brief LLM "list of funders by total value"
--   - Provider-page SEO surfaces (when those exist)
--   - "How many scholarships does DAAD offer?" admin queries
--
-- Adds:
--   * canonicalize_provider(text) SQL function — mirror of
--     canonicalizeProviderName() in scholarshipFields.ts. Same synonym
--     table; same comparison-key normalization (strip parentheticals
--     + punctuation, collapse whitespace, drop "the").
--   * UPDATE pass over public.scholarships rewriting provider_name where
--     the canonicalized form differs from current.
--
-- Going forward, scrape-source's cleanProvider() applies the same
-- canonicalization at extract time, and verify-scholarship reuses the
-- same helper at re-verify time.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.canonicalize_provider(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  trimmed text;
  norm text;
  result text;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;
  trimmed := btrim(p_raw);
  IF length(trimmed) = 0 THEN RETURN NULL; END IF;

  -- Mirror normalizeProviderKey() in scholarshipFields.ts.
  norm := lower(trimmed);
  norm := regexp_replace(norm, '\s*\([^)]*\)\s*', ' ', 'g');
  norm := regexp_replace(norm, '[.,/&''’]', ' ', 'g');
  norm := regexp_replace(norm, '\bthe\b', ' ', 'g');
  norm := regexp_replace(norm, '\s+', ' ', 'g');
  norm := btrim(norm);

  IF length(norm) = 0 THEN RETURN trimmed; END IF;

  -- Synonym table — keep in sync with PROVIDER_SYNONYMS_MAP in
  -- supabase/functions/_shared/scholarshipFields.ts.
  result := CASE norm
    WHEN 'daad' THEN 'DAAD'
    WHEN 'deutscher akademischer austauschdienst' THEN 'DAAD'
    WHEN 'german academic exchange service' THEN 'DAAD'

    WHEN 'unesco' THEN 'UNESCO'
    WHEN 'united nations educational scientific and cultural organization' THEN 'UNESCO'

    WHEN 'mext' THEN 'MEXT'
    WHEN 'ministry of education culture sports science and technology' THEN 'MEXT'
    WHEN 'japanese ministry of education culture sports science and technology' THEN 'MEXT'
    WHEN 'monbukagakusho' THEN 'MEXT'

    WHEN 'csc' THEN 'China Scholarship Council'
    WHEN 'china scholarship council' THEN 'China Scholarship Council'

    WHEN 'kgsp' THEN 'Korean Government Scholarship Program'
    WHEN 'korean government scholarship program' THEN 'Korean Government Scholarship Program'
    WHEN 'global korea scholarship' THEN 'Korean Government Scholarship Program'
    WHEN 'gks' THEN 'Korean Government Scholarship Program'

    WHEN 'australia awards' THEN 'Australia Awards'
    WHEN 'australian awards' THEN 'Australia Awards'
    WHEN 'australia awards scholarships' THEN 'Australia Awards'

    WHEN 'chevening' THEN 'Chevening'
    WHEN 'chevening scholarship' THEN 'Chevening'
    WHEN 'chevening scholarships' THEN 'Chevening'
    WHEN 'uk foreign and commonwealth office' THEN 'Chevening'

    WHEN 'commonwealth scholarship commission' THEN 'Commonwealth Scholarship Commission'
    WHEN 'csc uk' THEN 'Commonwealth Scholarship Commission'

    WHEN 'fulbright' THEN 'Fulbright'
    WHEN 'fulbright program' THEN 'Fulbright'
    WHEN 'fulbright commission' THEN 'Fulbright'
    WHEN 'us fulbright' THEN 'Fulbright'
    WHEN 'u s fulbright' THEN 'Fulbright'

    WHEN 'schwarzman scholars' THEN 'Schwarzman Scholars'
    WHEN 'schwarzman foundation' THEN 'Schwarzman Scholars'

    WHEN 'rhodes trust' THEN 'Rhodes Trust'
    WHEN 'rhodes scholarships' THEN 'Rhodes Trust'
    WHEN 'rhodes scholarship' THEN 'Rhodes Trust'

    WHEN 'gates cambridge' THEN 'Gates Cambridge'
    WHEN 'gates cambridge trust' THEN 'Gates Cambridge'

    WHEN 'knight hennessy scholars' THEN 'Knight-Hennessy Scholars'
    WHEN 'knight hennessy' THEN 'Knight-Hennessy Scholars'
    WHEN 'knight-hennessy scholars' THEN 'Knight-Hennessy Scholars'
    WHEN 'knight-hennessy' THEN 'Knight-Hennessy Scholars'
    WHEN 'stanford knight hennessy scholars' THEN 'Knight-Hennessy Scholars'

    WHEN 'mastercard foundation' THEN 'Mastercard Foundation'
    WHEN 'mastercard foundation scholars program' THEN 'Mastercard Foundation'

    WHEN 'aga khan foundation' THEN 'Aga Khan Foundation'
    WHEN 'aga khan development network' THEN 'Aga Khan Foundation'

    WHEN 'joint japan world bank graduate scholarship program' THEN 'Joint Japan/World Bank Scholarship'
    WHEN 'jjwbgsp' THEN 'Joint Japan/World Bank Scholarship'
    WHEN 'joint japan world bank scholarship' THEN 'Joint Japan/World Bank Scholarship'

    WHEN 'european commission erasmus' THEN 'Erasmus Mundus'
    WHEN 'erasmus mundus' THEN 'Erasmus Mundus'
    WHEN 'erasmus' THEN 'Erasmus Mundus'
    WHEN 'european commission' THEN 'Erasmus Mundus'
    WHEN 'eacea' THEN 'Erasmus Mundus'

    WHEN 'campus france eiffel' THEN 'Eiffel Excellence Scholarship'
    WHEN 'eiffel excellence' THEN 'Eiffel Excellence Scholarship'
    WHEN 'eiffel scholarship' THEN 'Eiffel Excellence Scholarship'

    WHEN 'vanier canada graduate scholarship' THEN 'Vanier Canada Graduate Scholarships'
    WHEN 'vanier scholarship' THEN 'Vanier Canada Graduate Scholarships'
    WHEN 'vanier scholarships' THEN 'Vanier Canada Graduate Scholarships'

    WHEN 'marshall scholarship' THEN 'Marshall Scholarships'
    WHEN 'marshall scholarships' THEN 'Marshall Scholarships'
    WHEN 'marshall aid commemoration commission' THEN 'Marshall Scholarships'

    WHEN 'who' THEN 'World Health Organization'
    WHEN 'world health organization' THEN 'World Health Organization'

    WHEN 'open society foundations' THEN 'Open Society Foundations'
    WHEN 'open society foundation' THEN 'Open Society Foundations'
    WHEN 'osf' THEN 'Open Society Foundations'
    WHEN 'soros foundation' THEN 'Open Society Foundations'

    WHEN 'ford foundation' THEN 'Ford Foundation'
    WHEN 'ford foundation international fellowships' THEN 'Ford Foundation'

    WHEN 'rotary foundation' THEN 'Rotary Foundation'
    WHEN 'rotary international' THEN 'Rotary Foundation'
    WHEN 'rotary peace fellowship' THEN 'Rotary Foundation'
    ELSE NULL
  END;

  -- Synonym hit → canonical form. No hit → leave the trimmed input
  -- as-is so we don't downgrade rare-but-correct LLM extractions.
  RETURN COALESCE(result, trimmed);
END
$$;

GRANT EXECUTE ON FUNCTION public.canonicalize_provider(text) TO service_role;

-- ─── Backfill ──────────────────────────────────────────────────────
-- Only touch rows whose provider_name actually changes.
WITH candidates AS (
  SELECT scholarship_id,
         provider_name AS old_provider,
         public.canonicalize_provider(provider_name) AS new_provider
  FROM public.scholarships
  WHERE provider_name IS NOT NULL
    AND length(btrim(provider_name)) > 0
)
UPDATE public.scholarships sc
SET provider_name = c.new_provider
FROM candidates c
WHERE sc.scholarship_id = c.scholarship_id
  AND c.old_provider IS DISTINCT FROM c.new_provider
  AND c.new_provider IS NOT NULL;
