-- =============================================================================
-- Embedding source_text: include partner_universities + language_requirements
-- =============================================================================
-- 20260507230000 added eligible_countries / target_demographics / notes to
-- the embedding source. Two more high-signal fields were still missing:
--
--   * partner_universities[]: for joint-degree programs (Erasmus Mundus,
--     consortium scholarships, DAAD partner programs), the actual list
--     of host institutions is the strongest content signal a student
--     can search for. A student typing "study in Heidelberg medicine"
--     should match the Erasmus Mundus consortium that names Heidelberg
--     as a partner university — and right now they don't, because the
--     name "Heidelberg" never enters the embedding text. (We pulled the
--     field through scrape + verify pipelines yesterday and it's now
--     reliably populated for joint programs.)
--
--   * language_requirements: "English-taught", "French-language",
--     "Programme in German" — a meaningful axis for international
--     students filtering by language preference. Currently invisible
--     to semantic search.
--
-- Mass-invalidate so embed-scholarships re-vectorises every row against
-- the richer source. ~6,000 rows × $0.0002 ≈ $1.20 one-shot. Drains via
-- the existing 4-hourly cron in 500-row batches.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.scholarship_embedding_source(s public.scholarships)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both ' ' FROM
    coalesce(s.scholarship_name, '') || '. ' ||
    coalesce('Provider: '       || s.provider_name        || '. ', '') ||
    coalesce('Host country: '   || s.host_country         || '. ', '') ||
    coalesce('Coverage: '       || s.coverage_type        || '. ', '') ||
    coalesce('Award: '          || s.award_amount_text    || '. ', '') ||
    coalesce('Fields: '         || array_to_string(s.target_fields, ', ')        || '. ', '') ||
    coalesce('Levels: '         || array_to_string(s.target_degree_level, ', ')  || '. ', '') ||
    coalesce('Eligible countries: ' || array_to_string(s.eligible_countries, ', ') || '. ', '') ||
    coalesce('Targets: '        || array_to_string(s.target_demographics, ', ')   || '. ', '') ||
    -- Joint-program partner institutions — Erasmus Mundus consortia,
    -- DAAD partners, etc. The first 12 names are usually enough; longer
    -- consortia tail off in marketing weight.
    coalesce('Partner universities: ' || array_to_string((s.partner_universities)[1:12], ', ') || '. ', '') ||
    coalesce('Language: '       || s.language_requirements                || '. ', '') ||
    coalesce('Best for: '       || array_to_string(s.best_for_tags, ', ')        || '. ', '') ||
    coalesce('Audience: '       || left(s.why_this_fits, 400)             || '. ', '') ||
    coalesce('Ideal candidate: ' || left(s.ideal_candidate_profile, 400)  || '. ', '') ||
    coalesce('Citizenship: '    || s.citizenship_requirements             || '. ', '') ||
    coalesce('Eligibility: '    || left(s.eligibility_requirements, 800)  || '. ', '') ||
    coalesce('Strategy: '       || left(s.strategy_notes, 400)            || '. ', '')
    -- s.notes dropped — column exists on scholarship_staging only; see
    -- 20260507230000 for the same fix in the prior embedding-source
    -- revision. Add back here if a published `notes` column ever lands.
  );
$$;

-- Mass-invalidate so embed-scholarships re-vectorises every row against
-- the richer source. Same pattern as 20260507230000 — selecting rows
-- with NULL embedding is the queue, the cron drains it.
UPDATE public.scholarships
SET embedding = NULL,
    embedded_at = NULL,
    embedding_source_text = public.scholarship_embedding_source(public.scholarships.*);
