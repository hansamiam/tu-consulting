
-- Universities
CREATE TABLE public.universities (
  university_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  global_ranking INTEGER,
  tuition_usd_per_year NUMERIC(10,2),
  cost_of_living_index NUMERIC(5,2),
  language_of_instruction TEXT DEFAULT 'English',
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Programs
CREATE TABLE public.programs (
  program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(university_id) ON DELETE CASCADE NOT NULL,
  program_name TEXT NOT NULL,
  degree_level TEXT NOT NULL CHECK (degree_level IN ('bachelor', 'master', 'phd')),
  field_of_study TEXT NOT NULL,
  duration_years NUMERIC(3,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admission Requirements
CREATE TABLE public.admission_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(program_id) ON DELETE CASCADE NOT NULL,
  ielts_required BOOLEAN DEFAULT true,
  ielts_score_min NUMERIC(3,1),
  sat_required BOOLEAN DEFAULT false,
  sat_score_min INTEGER,
  gpa_min NUMERIC(3,2),
  application_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scholarships
CREATE TABLE public.scholarships (
  scholarship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(university_id) ON DELETE CASCADE NOT NULL,
  scholarship_name TEXT NOT NULL,
  coverage_type TEXT NOT NULL CHECK (coverage_type IN ('full_ride', 'tuition_only', 'stipend')),
  stipend_amount NUMERIC(10,2),
  eligibility_requirements TEXT,
  application_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Applications
CREATE TABLE public.applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(program_id) ON DELETE CASCADE NOT NULL,
  portal_url TEXT,
  acceptance_rate NUMERIC(5,2),
  visa_difficulty_score INTEGER CHECK (visa_difficulty_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (public read access for discovery)
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read universities" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Public read programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Public read admission_requirements" ON public.admission_requirements FOR SELECT USING (true);
CREATE POLICY "Public read scholarships" ON public.scholarships FOR SELECT USING (true);
CREATE POLICY "Public read applications" ON public.applications FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "Admins manage universities" ON public.universities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage programs" ON public.programs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage admission_requirements" ON public.admission_requirements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage scholarships" ON public.scholarships FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage applications" ON public.applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Search-optimized indexes
CREATE INDEX idx_universities_country ON public.universities(country);
CREATE INDEX idx_universities_ranking ON public.universities(global_ranking);
CREATE INDEX idx_universities_tuition ON public.universities(tuition_usd_per_year);
CREATE INDEX idx_programs_degree ON public.programs(degree_level);
CREATE INDEX idx_programs_field ON public.programs(field_of_study);
CREATE INDEX idx_programs_university ON public.programs(university_id);
CREATE INDEX idx_requirements_ielts ON public.admission_requirements(ielts_required, ielts_score_min);
CREATE INDEX idx_requirements_program ON public.admission_requirements(program_id);
CREATE INDEX idx_scholarships_coverage ON public.scholarships(coverage_type);
CREATE INDEX idx_scholarships_university ON public.scholarships(university_id);
CREATE INDEX idx_applications_program ON public.applications(program_id);
CREATE INDEX idx_applications_acceptance ON public.applications(acceptance_rate);
