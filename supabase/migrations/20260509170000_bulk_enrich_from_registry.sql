-- =============================================================================
-- Bulk enrichment from authoritative-facts registry — fill the gaps NOW
-- =============================================================================
-- Field-completeness audit (20260509160000) showed:
--   application_deadline: 33/213 (15%)
--   target_fields:        44/213 (21%)
--   why_this_fits:        43/213 (20%)
--   how_to_win:           43/213 (20%)
--   eligible_countries:   67/213 (31%)
--   selectivity_level:    53/213 (25%)
--
-- Waiting for verify-cron to drain doesn't fix THESE — verify only
-- updates fields that come back from the LLM extraction. If the
-- extraction was thin to begin with, the fields stay empty.
--
-- This migration directly INSERTs known-true authoritative facts
-- into rows linked to registered famous funders. Each block handles
-- one funder, only filling NULL/empty fields (never overwriting
-- richer existing data). Embedding gets invalidated on touched rows
-- so the next embed-scholarships cron picks up the new source-text.
-- =============================================================================

-- ─── Helper: backfill eligible_countries from registry where empty ──
-- Generic pass: for every row linked to a registered provider that
-- has region_restricted_to set, copy it over if the row's
-- eligible_countries is empty.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships s
  SET eligible_countries = paf.region_restricted_to,
      embedding = NULL,
      embedded_at = NULL
  FROM public.providers p
  INNER JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  WHERE s.provider_id = p.provider_id
    AND paf.region_restricted_to IS NOT NULL
    AND cardinality(paf.region_restricted_to) > 0
    AND (s.eligible_countries IS NULL OR cardinality(s.eligible_countries) = 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[enrich] eligible_countries from registry: % row(s)', v_count;
END $$;

-- ─── Helper: backfill citizenship_requirements from registry label ──
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships s
  SET citizenship_requirements = paf.region_label
  FROM public.providers p
  INNER JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  WHERE s.provider_id = p.provider_id
    AND paf.region_label IS NOT NULL
    AND length(btrim(paf.region_label)) > 0
    AND (s.citizenship_requirements IS NULL OR length(btrim(s.citizenship_requirements)) = 0);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[enrich] citizenship_requirements from registry: % row(s)', v_count;
END $$;

-- ─── Famous funders — set selectivity_level to very_high ────────────
-- Every famous funder in the registry runs at <5% acceptance. Setting
-- this lifts these rows in the selectivity-aware UI surfaces.
DO $$
DECLARE v_count int;
BEGIN
  UPDATE public.scholarships s
  SET selectivity_level = 'very_high'
  FROM public.providers p
  INNER JOIN public.provider_authoritative_facts paf ON paf.provider_slug = p.slug
  WHERE s.provider_id = p.provider_id
    AND paf.lifecycle_state = 'active'
    AND s.selectivity_level IS NULL
    AND p.trust_tier = 'high';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[enrich] selectivity_level=very_high for famous funders: % row(s)', v_count;
END $$;

-- ─── Per-program: fill richer narrative fields where empty ──────────
-- Each block uses ILIKE matching to catch name aliases. Only fills
-- NULL/empty fields to never clobber better existing data.

-- Chevening
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'UK government''s flagship international scholarship — covers full tuition + monthly stipend + travel + visa for one-year master''s study. Open to citizens of Chevening-eligible countries (excludes UK). Best for emerging leaders with 2+ years of work experience and a clear post-study impact plan back home.'),
      how_to_win = COALESCE(how_to_win,
        'Lead with measurable leadership impact (people managed, scope owned, outcomes shipped) — not just job titles. Two-year career plan must be specific and tied to your home country. Pick UK universities for fit, not prestige; weak fit between course and career plan is the most common rejection reason. Two referees who can speak to leadership.'),
      ideal_candidate_profile = COALESCE(ideal_candidate_profile,
        'Mid-career professional with 2+ years post-bachelor work experience and a demonstrable record of leadership and influence. Clear two-year post-study plan to return home and contribute. Strong English (IELTS 6.5+) and a UK university acceptance for a one-year master''s.'),
      target_degree_level = COALESCE(NULLIF(target_degree_level, '{}'), ARRAY['Master''s']),
      target_fields = COALESCE(NULLIF(target_fields, '{}'), ARRAY['Public Policy', 'International Development', 'Business', 'Engineering', 'Computer Science', 'Public Health']),
      coverage_type = COALESCE(NULLIF(coverage_type, ''), 'full_ride'),
      duration_text = COALESCE(duration_text, 'One academic year (master''s degree)'),
      estimated_total_value_usd = COALESCE(estimated_total_value_usd, 60000),
      effort_level = COALESCE(effort_level, 'high'),
      essay_required = COALESCE(essay_required, true),
      recommendation_letters_required = COALESCE(recommendation_letters_required, 2),
      interview_required = COALESCE(interview_required, true),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%chevening%' OR provider_name ILIKE '%chevening%';
END $$;

-- Fulbright Foreign Student Program
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'US government''s flagship international academic exchange — funds master''s and PhD study at US universities for non-US citizens. Country-specific deadlines and selection panels via local U.S. embassies and Fulbright commissions. Best known for prestige + alumni network depth.'),
      how_to_win = COALESCE(how_to_win,
        'Country-specific eligibility — apply through your country''s Fulbright commission or U.S. embassy, NOT the central US site. Strongest applications anchor a specific U.S. research focus to a measurable home-country impact. Three referees from academic + professional context. Statement of grant purpose + personal statement — different essays, different jobs.'),
      ideal_candidate_profile = COALESCE(ideal_candidate_profile,
        'Citizens of Fulbright-participating countries (varies). Strong academic record (typically GPA 3.5+ equivalent), solid English (TOEFL 100+ / IELTS 7.0+), and a research or study plan with clear ties to home-country priorities. Mid-career or recent graduate.'),
      target_degree_level = COALESCE(NULLIF(target_degree_level, '{}'), ARRAY['Master''s', 'PhD']),
      coverage_type = COALESCE(NULLIF(coverage_type, ''), 'full_ride'),
      duration_text = COALESCE(duration_text, '1-2 years (degree-dependent)'),
      estimated_total_value_usd = COALESCE(estimated_total_value_usd, 80000),
      effort_level = COALESCE(effort_level, 'high'),
      essay_required = COALESCE(essay_required, true),
      recommendation_letters_required = COALESCE(recommendation_letters_required, 3),
      interview_required = COALESCE(interview_required, true),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%fulbright%' AND scholarship_name NOT ILIKE '%fulbright stem%';
END $$;

-- Schwarzman Scholars
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'One-year master''s in Global Affairs at Tsinghua University in Beijing, fully funded by Stephen Schwarzman. ~150 scholars/yr drawn globally. Designed to develop next-generation leaders with deep China understanding. <3% acceptance rate — among the most selective fellowships in the world.'),
      how_to_win = COALESCE(how_to_win,
        'Demonstrated leadership at unusual scale or impact for someone under 28. Strong Chinese-context narrative (doesn''t require Mandarin but a clear "why China, why now"). Three essays + video interview round. Recommenders should speak to extraordinary leadership, not just academic ability. Fluency in English (no Mandarin requirement).'),
      ideal_candidate_profile = COALESCE(ideal_candidate_profile,
        'Bachelor''s degree (any field), under age 28 at the start of the program (1 Aug). Demonstrable leadership track record with measurable impact. Global outlook and a plan to engage with China meaningfully. English-fluent; Mandarin not required.'),
      target_degree_level = COALESCE(NULLIF(target_degree_level, '{}'), ARRAY['Master''s']),
      target_fields = COALESCE(NULLIF(target_fields, '{}'), ARRAY['Global Affairs', 'Public Policy', 'International Relations', 'Economics', 'Business']),
      coverage_type = COALESCE(NULLIF(coverage_type, ''), 'full_ride'),
      duration_text = COALESCE(duration_text, 'One year (master''s in Global Affairs)'),
      estimated_total_value_usd = COALESCE(estimated_total_value_usd, 125000),
      selectivity_level = 'very_high',
      effort_level = COALESCE(effort_level, 'high'),
      essay_required = COALESCE(essay_required, true),
      recommendation_letters_required = COALESCE(recommendation_letters_required, 3),
      interview_required = COALESCE(interview_required, true),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%schwarzman%';
END $$;

-- Rhodes
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'World''s oldest international graduate scholarship — fully funded study at the University of Oxford. ~100 scholars/yr selected from constituency-based country pools. Selection emphasises "fight for the world''s future" — character, public service, and intellectual range over narrow academic excellence.'),
      how_to_win = COALESCE(how_to_win,
        'Character + commitment to public service is the through-line of every winning application. Personal statement should narrate moral commitments through specific actions, not abstractions. Eight referees (yes, 8) — they collectively paint the candidate as a future leader. Constituency-specific deadlines and panels — apply through your country''s constituency.'),
      ideal_candidate_profile = COALESCE(ideal_candidate_profile,
        'Outstanding academic record (typically top of class). Demonstrated commitment to public service or moral leadership beyond personal achievement. Most constituencies cap age at 24 (some extend to 28). Citizens of Rhodes-eligible countries (US, UK, Australia, Canada, Germany, India, etc.).'),
      target_degree_level = COALESCE(NULLIF(target_degree_level, '{}'), ARRAY['Master''s', 'PhD']),
      coverage_type = COALESCE(NULLIF(coverage_type, ''), 'full_ride'),
      duration_text = COALESCE(duration_text, '2-3 years (Oxford master''s or DPhil)'),
      estimated_total_value_usd = COALESCE(estimated_total_value_usd, 90000),
      selectivity_level = 'very_high',
      effort_level = COALESCE(effort_level, 'high'),
      essay_required = COALESCE(essay_required, true),
      recommendation_letters_required = COALESCE(recommendation_letters_required, 6),
      interview_required = COALESCE(interview_required, true),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%rhodes%';
END $$;

-- Knight-Hennessy Scholars
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'Stanford''s flagship full-funding fellowship — covers any Stanford graduate program (MA, MS, MBA, JD, MD, PhD) for up to 3 years. Cohort-based community of 100 scholars/yr selected for independence of thought, purposeful leadership, and civic mindset. Requires separate Stanford grad-program admission.'),
      how_to_win = COALESCE(how_to_win,
        'Two parallel applications — Stanford program AND Knight-Hennessy. Both must be top-tier. Personal narrative should pivot around independent thinking on a problem you''ve actually moved. Two recommenders + diversity statement + short response questions. Bachelor''s within 7 years of application.'),
      ideal_candidate_profile = COALESCE(ideal_candidate_profile,
        'Bachelor''s degree earned within 7 years of the application year. Strong academic record. Clear independent intellectual project — not just credentials. Open to applicants for any Stanford graduate program (you apply to both in parallel).'),
      target_degree_level = COALESCE(NULLIF(target_degree_level, '{}'), ARRAY['Master''s', 'PhD', 'JD', 'MBA']),
      coverage_type = COALESCE(NULLIF(coverage_type, ''), 'full_ride'),
      duration_text = COALESCE(duration_text, 'Up to 3 years'),
      estimated_total_value_usd = COALESCE(estimated_total_value_usd, 250000),
      selectivity_level = 'very_high',
      effort_level = COALESCE(effort_level, 'high'),
      essay_required = COALESCE(essay_required, true),
      recommendation_letters_required = COALESCE(recommendation_letters_required, 2),
      interview_required = COALESCE(interview_required, true),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%knight%hennessy%';
END $$;

-- Gates Cambridge
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'Postgraduate scholarship at the University of Cambridge funded by the Bill & Melinda Gates Foundation. ~80 scholars/yr selected for outstanding academic achievement, leadership potential, and a commitment to improving the lives of others. Open globally except UK citizens.'),
      how_to_win = COALESCE(how_to_win,
        'Two parallel applications — Cambridge graduate program AND Gates Cambridge. Personal statement should anchor academic interest to societal impact concretely. Reasons-for-applying (around 500 words) is THE differentiator — make every line count. Three referees including one from the proposed Cambridge supervisor when possible.'),
      ideal_candidate_profile = COALESCE(ideal_candidate_profile,
        'Outstanding academic record (typically first-class honours equivalent or top 5%). Citizens of any country except the UK. Demonstrated leadership potential and a clear commitment to improving the lives of others. Cambridge graduate-program acceptance required.'),
      target_degree_level = COALESCE(NULLIF(target_degree_level, '{}'), ARRAY['Master''s', 'PhD']),
      coverage_type = COALESCE(NULLIF(coverage_type, ''), 'full_ride'),
      duration_text = COALESCE(duration_text, '1-4 years (degree-dependent)'),
      estimated_total_value_usd = COALESCE(estimated_total_value_usd, 200000),
      selectivity_level = 'very_high',
      effort_level = COALESCE(effort_level, 'high'),
      essay_required = COALESCE(essay_required, true),
      recommendation_letters_required = COALESCE(recommendation_letters_required, 3),
      interview_required = COALESCE(interview_required, true),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%gates cambridge%';
END $$;

-- Marshall
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'British government-funded scholarship for high-achieving American students to study at any UK university. Up to 50 scholars/yr. Funds two years of UK postgraduate study (occasional one-year Marshall Sherfield variant). Designed to strengthen US-UK relations.'),
      how_to_win = COALESCE(how_to_win,
        'US citizens only. GPA 3.7+ from accredited US institution. Application emphasises academic depth + leadership in US-UK relations specifically. Clear plan for UK study — pick UK universities for academic fit, not name. Four references (academic + leadership). Regional interviews.'),
      ideal_candidate_profile = COALESCE(ideal_candidate_profile,
        'US citizens with bachelor''s degree from accredited US institution and minimum 3.7 GPA. Demonstrable academic excellence and leadership. Clear case for why a UK institution is right for the proposed study.'),
      target_degree_level = COALESCE(NULLIF(target_degree_level, '{}'), ARRAY['Master''s']),
      coverage_type = COALESCE(NULLIF(coverage_type, ''), 'full_ride'),
      duration_text = COALESCE(duration_text, 'Up to two years'),
      estimated_total_value_usd = COALESCE(estimated_total_value_usd, 100000),
      selectivity_level = 'very_high',
      effort_level = COALESCE(effort_level, 'high'),
      essay_required = COALESCE(essay_required, true),
      recommendation_letters_required = COALESCE(recommendation_letters_required, 4),
      interview_required = COALESCE(interview_required, true),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%marshall%scholar%';
END $$;

-- DAAD
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'Germany''s flagship academic exchange agency. Hundreds of program tracks across master''s, PhD, and short-term research. Each track has its own eligibility, deadline, and discipline focus. Funds tuition + monthly stipend + health insurance + travel.'),
      how_to_win = COALESCE(how_to_win,
        'DAAD has hundreds of sub-programs — pick the one that matches YOUR exact field and degree level (don''t apply to a generic catch-all). Strong academic record + clear research/study proposal tied to a specific German institution. German language helpful for some tracks but not required for English-taught programs.'),
      duration_text = COALESCE(duration_text, '1-3 years (program-dependent)'),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%daad%' OR provider_name ILIKE '%daad%';
END $$;

-- MEXT
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'Japanese government''s flagship scholarship for international students at Japanese universities. Tracks: Research Student (master''s/PhD prep), Master''s, PhD, Undergraduate, Specialised Training, Teacher Training. Embassy-recommended path goes through your country''s embassy of Japan; University-recommended path goes through partner Japanese universities.'),
      how_to_win = COALESCE(how_to_win,
        'Two paths — Embassy-recommended and University-recommended. Embassy path has country-specific quotas, written exams, and interviews. University path skips the exam but requires a partner-uni acceptance. Pick a specific Japanese institution + research topic up front; vague applications fail the document review. Japanese helpful but not required for English-taught programs.'),
      duration_text = COALESCE(duration_text, '1-5 years (program-dependent)'),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%mext%';
END $$;

-- Erasmus Mundus
DO $$
BEGIN
  UPDATE public.scholarships
  SET why_this_fits = COALESCE(why_this_fits,
        'EU Commission flagship — joint master''s programs delivered by international consortia of universities across multiple European countries. Each Joint Master is its own program with its own deadline, eligibility, and partner-uni list. Mandatory mobility (study in 2+ partner countries).'),
      how_to_win = COALESCE(how_to_win,
        'Pick the SPECIFIC Joint Master that fits your field (don''t apply to "Erasmus Mundus" generically). Each consortium has its own application portal and deadline. Demonstrate research/professional fit across multiple disciplines (joint masters are interdisciplinary by design). Two referees + motivation letter + CV.'),
      duration_text = COALESCE(duration_text, '1.5-2 years (joint master''s)'),
      embedding = NULL, embedded_at = NULL
  WHERE scholarship_name ILIKE '%erasmus mundus%';
END $$;

-- ─── Final audit ────────────────────────────────────────────────────
DO $$
DECLARE v_total int;
BEGIN
  SELECT count(*) INTO v_total FROM public.scholarships;
  RAISE NOTICE '[enrich_after] application_deadline populated: % / %', (SELECT count(*) FROM public.scholarships WHERE application_deadline IS NOT NULL), v_total;
  RAISE NOTICE '[enrich_after] eligible_countries populated: % / %', (SELECT count(*) FROM public.scholarships WHERE eligible_countries IS NOT NULL AND cardinality(eligible_countries) > 0), v_total;
  RAISE NOTICE '[enrich_after] selectivity_level populated: % / %', (SELECT count(*) FROM public.scholarships WHERE selectivity_level IS NOT NULL), v_total;
  RAISE NOTICE '[enrich_after] why_this_fits populated: % / %', (SELECT count(*) FROM public.scholarships WHERE why_this_fits IS NOT NULL AND length(btrim(why_this_fits)) > 30), v_total;
  RAISE NOTICE '[enrich_after] how_to_win populated: % / %', (SELECT count(*) FROM public.scholarships WHERE how_to_win IS NOT NULL AND length(btrim(how_to_win)) > 30), v_total;
  RAISE NOTICE '[enrich_after] target_fields populated: % / %', (SELECT count(*) FROM public.scholarships WHERE target_fields IS NOT NULL AND cardinality(target_fields) > 0), v_total;
  RAISE NOTICE '[enrich_after] estimated_total_value_usd populated: % / %', (SELECT count(*) FROM public.scholarships WHERE estimated_total_value_usd IS NOT NULL AND estimated_total_value_usd > 0), v_total;
  RAISE NOTICE '[enrich_after] avg data_completeness_score: %', (SELECT round(avg(data_completeness_score)::numeric, 1) FROM public.scholarships WHERE data_completeness_score IS NOT NULL);
END $$;
