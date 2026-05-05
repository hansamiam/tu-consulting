-- =============================================================================
-- Embedding source_text: include the semantically rich fields
-- =============================================================================
-- The original scholarship_embedding_source() concatenated structured
-- metadata (name / provider / country / coverage / award / fields /
-- levels / citizenship) plus eligibility prose and strategy_notes.
-- Missing the three fields most useful for semantic matching:
--
--   · ideal_candidate_profile — describes who actually wins this thing
--     ("STEM PhD applicants from Africa with 2+ years of research").
--     A query like "I'm a CS master's applicant interested in robotics"
--     should match strongly with rows whose ideal_candidate_profile
--     names that audience.
--   · why_this_fits — short editorial line specifically describing the
--     audience the program targets.
--   · best_for_tags — short tagged keywords (kebab-case in DB,
--     joined as space-separated for the embedding).
--
-- These are exactly the fields the enrich-scholarship-content cron
-- fills in over time, so older rows might still be NULL — the
-- coalesce()/empty-string pattern handles that.
--
-- Mass-invalidate embeddings so embed-scholarships re-vectorises every
-- row against the new source. Cost: ~225 rows × $0.0002 per embedding
-- = $0.05 one-shot.
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
    coalesce('Best for: '       || array_to_string(s.best_for_tags, ', ')        || '. ', '') ||
    coalesce('Audience: '       || left(s.why_this_fits, 400)             || '. ', '') ||
    coalesce('Ideal candidate: ' || left(s.ideal_candidate_profile, 400)  || '. ', '') ||
    coalesce('Citizenship: '    || s.citizenship_requirements             || '. ', '') ||
    coalesce('Eligibility: '    || left(s.eligibility_requirements, 800)  || '. ', '') ||
    coalesce('Strategy: '       || left(s.strategy_notes, 400)            || '. ', '')
  );
$$;

-- Mass-invalidate so embed-scholarships re-vectorises every row against
-- the richer source. The maintenance view (scholarships_needing_embedding)
-- selects rows where embedding IS NULL — setting them to null pushes the
-- whole table into the queue. The next embed-scholarships cron tick (or
-- a manual invocation) drains it.
UPDATE public.scholarships
SET embedding = NULL,
    embedded_at = NULL,
    embedding_source_text = public.scholarship_embedding_source(public.scholarships.*);
