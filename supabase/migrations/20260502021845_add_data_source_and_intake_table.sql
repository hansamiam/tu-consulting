-- ─── Step 1 — Provenance tracking + staging table ────────────────────
-- Background: the existing scholarships table is a mix of hand-curated
-- and LLM-generated rows (see DATA_AUDIT.md). We're about to ingest a
-- third-party research report (Manus AI, 221 scholarships) and need to
-- track WHERE each row came from so the UI can show provenance and we
-- can audit later.

-- 1a. Add a data_source column to live scholarships. Existing rows
--     default to 'hand_curated' (which is the most charitable label —
--     batch-1/2 were human-prompted LLM gen, but a human triggered
--     each row and reviewed the schema). The 'manus_ai_2026_05_03'
--     value is reserved for rows ingested from the research report.
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'hand_curated';

CREATE INDEX IF NOT EXISTS idx_scholarships_data_source
  ON public.scholarships(data_source);

-- 1b. Staging table. Mirrors the live schema for fields we care about,
--     plus the raw text of each parsed field (for audit and future
--     re-extraction without re-parsing the markdown).
CREATE TABLE IF NOT EXISTS public.scholarships_research_intake (
  intake_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source attribution
  source               text NOT NULL,             -- e.g. 'manus_ai_2026_05_03'
  source_category      text,                       -- e.g. 'USA-based scholarships'
  ingested_at          timestamptz NOT NULL DEFAULT now(),

  -- Mapped fields ready for promotion to live
  scholarship_name     text NOT NULL,
  provider_name        text,
  host_country         text,
  official_url         text,
  coverage_type        text,                       -- nullable in intake; promoted with a default
  award_amount_text    text,
  estimated_total_value_usd numeric,
  target_degree_level  text[],
  target_fields        text[],
  eligible_countries   text[],
  citizenship_requirements text,
  eligibility_requirements text,
  application_deadline date,
  deadline_type        text,
  age_limit            text,
  selectivity_level    text,

  -- Raw fields preserved verbatim for audit
  raw_offering_org     text,
  raw_education_levels text,
  raw_eligibility      text,
  raw_coverage         text,
  raw_annual_awards    text,
  raw_criteria         text,
  raw_deadline         text,
  raw_url              text,

  -- Quality flag — true when the entry has at least name + URL + a
  -- recognizable deadline (parseable to a date or 'rolling'/'varies')
  is_loadable          boolean NOT NULL DEFAULT true,

  -- Promotion tracking
  promoted_to_live     boolean NOT NULL DEFAULT false,
  promoted_at          timestamptz,
  live_scholarship_id  uuid REFERENCES public.scholarships(scholarship_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_source       ON public.scholarships_research_intake(source);
CREATE INDEX IF NOT EXISTS idx_intake_promoted     ON public.scholarships_research_intake(promoted_to_live);
CREATE INDEX IF NOT EXISTS idx_intake_loadable     ON public.scholarships_research_intake(is_loadable);
CREATE INDEX IF NOT EXISTS idx_intake_name_lower   ON public.scholarships_research_intake (LOWER(scholarship_name));

-- RLS — admin-only. Intake is internal; not surfaced to public read.
ALTER TABLE public.scholarships_research_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage research intake"
  ON public.scholarships_research_intake FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
