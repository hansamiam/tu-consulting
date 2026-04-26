-- Extend scholarships into a decision-engine schema
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS official_url text,
  ADD COLUMN IF NOT EXISTS host_country text,
  ADD COLUMN IF NOT EXISTS eligible_countries text[],
  ADD COLUMN IF NOT EXISTS target_degree_level text[],
  ADD COLUMN IF NOT EXISTS target_fields text[],
  ADD COLUMN IF NOT EXISTS partner_universities text[],
  ADD COLUMN IF NOT EXISTS last_verified_date date,
  -- Financial
  ADD COLUMN IF NOT EXISTS award_amount_text text,
  ADD COLUMN IF NOT EXISTS award_type text[],
  ADD COLUMN IF NOT EXISTS renewable boolean,
  ADD COLUMN IF NOT EXISTS duration_text text,
  ADD COLUMN IF NOT EXISTS estimated_total_value_usd numeric,
  -- Eligibility
  ADD COLUMN IF NOT EXISTS min_gpa numeric,
  ADD COLUMN IF NOT EXISTS gpa_scale numeric,
  ADD COLUMN IF NOT EXISTS min_ielts numeric,
  ADD COLUMN IF NOT EXISTS min_toefl integer,
  ADD COLUMN IF NOT EXISTS min_sat integer,
  ADD COLUMN IF NOT EXISTS min_act integer,
  ADD COLUMN IF NOT EXISTS language_requirements text,
  ADD COLUMN IF NOT EXISTS citizenship_requirements text,
  ADD COLUMN IF NOT EXISTS age_limit text,
  ADD COLUMN IF NOT EXISTS financial_need_required boolean,
  ADD COLUMN IF NOT EXISTS leadership_required boolean,
  ADD COLUMN IF NOT EXISTS extracurricular_required boolean,
  -- Application
  ADD COLUMN IF NOT EXISTS deadline_type text,
  ADD COLUMN IF NOT EXISTS required_documents text[],
  ADD COLUMN IF NOT EXISTS essay_required boolean,
  ADD COLUMN IF NOT EXISTS recommendation_letters_required integer,
  ADD COLUMN IF NOT EXISTS interview_required boolean,
  ADD COLUMN IF NOT EXISTS separate_application_required boolean,
  ADD COLUMN IF NOT EXISTS application_fee_text text,
  ADD COLUMN IF NOT EXISTS application_platform text,
  -- Decision intelligence
  ADD COLUMN IF NOT EXISTS selectivity_level text,
  ADD COLUMN IF NOT EXISTS effort_level text,
  ADD COLUMN IF NOT EXISTS effort_reason text,
  ADD COLUMN IF NOT EXISTS ideal_candidate_profile text,
  ADD COLUMN IF NOT EXISTS weak_candidate_warning text,
  ADD COLUMN IF NOT EXISTS common_rejection_reasons text,
  ADD COLUMN IF NOT EXISTS strategy_notes text,
  ADD COLUMN IF NOT EXISTS priority_level text,
  ADD COLUMN IF NOT EXISTS best_for_tags text[],
  -- User-facing
  ADD COLUMN IF NOT EXISTS why_this_fits text,
  ADD COLUMN IF NOT EXISTS how_to_win text,
  ADD COLUMN IF NOT EXISTS what_to_prepare_first text,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS risk_note text;

CREATE INDEX IF NOT EXISTS idx_scholarships_verified ON public.scholarships(verified);
CREATE INDEX IF NOT EXISTS idx_scholarships_host_country ON public.scholarships(host_country);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON public.scholarships(application_deadline);