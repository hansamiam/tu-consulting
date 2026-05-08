-- =============================================================================
-- Embedding source_text: include eligibility geography + demographic targeting
-- =============================================================================
-- The 20260505070000 revision added editorial signals (why_this_fits,
-- ideal_candidate_profile, best_for_tags) which lifted match relevance
-- on profile/audience queries. But it still omitted three fields that
-- carry dominant matching signal:
--
--   * eligible_countries[]: an "Open to OECD nationals" scholarship vs
--     an "Open to Sub-Saharan African applicants" scholarship are
--     fundamentally different audiences. Without this in the embedding,
--     a Bangladeshi student's vector can be similarity-close to a
--     scholarship that programmatically excludes them — wasting their
--     attention on rows that downstream `passes_eligibility` will
--     correctly filter out, but only after the user has clicked.
--   * target_demographics[]: women-in-STEM, refugee, first-generation,
--     LGBTQ+ — when these tags exist they often indicate the program
--     was DESIGNED for that audience. Without them in the embedding,
--     a refugee student's vector matches generic programs equally to
--     refugee-targeted ones.
--   * notes: scrape-source's SYSTEM_PROMPT instructs the LLM to put
--     program-specific context here when it doesn't fit elsewhere
--     ("application opens in October each year", "joint between MIT
--     and Cambridge"). High signal-to-noise, currently invisible to
--     the embedding.
--
-- Mass-invalidate so embed-scholarships re-vectorises every row. Cost:
-- ~6,000 rows × $0.0002 ≈ $1.20 one-shot. Drains via the existing cron
-- in batches of 200/tick.
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
    coalesce('Best for: '       || array_to_string(s.best_for_tags, ', ')        || '. ', '') ||
    coalesce('Audience: '       || left(s.why_this_fits, 400)             || '. ', '') ||
    coalesce('Ideal candidate: ' || left(s.ideal_candidate_profile, 400)  || '. ', '') ||
    coalesce('Citizenship: '    || s.citizenship_requirements             || '. ', '') ||
    coalesce('Eligibility: '    || left(s.eligibility_requirements, 800)  || '. ', '') ||
    coalesce('Strategy: '       || left(s.strategy_notes, 400)            || '. ', '')
    -- s.notes was referenced in the original draft of this migration but
    -- public.scholarships has no `notes` column — the field exists only
    -- on scholarship_staging where scrape-source lands LLM extractions.
    -- Dropped here so the function can be created; can be added later if
    -- a notes column is ever promoted to the published table.
  );
$$;

-- Mass-invalidate so embed-scholarships re-vectorises every row against
-- the richer source. The maintenance view selects rows where
-- embedding IS NULL; setting them to null pushes the whole table into
-- the queue. The next embed-scholarships cron tick drains it in 200-row
-- batches.
UPDATE public.scholarships
SET embedding = NULL,
    embedded_at = NULL,
    embedding_source_text = public.scholarship_embedding_source(public.scholarships.*);
