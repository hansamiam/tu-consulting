
-- University contacts: admissions reps, offices, social media
CREATE TABLE public.university_contacts (
  contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(university_id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL DEFAULT 'admissions_office',
  contact_name TEXT,
  contact_title TEXT,
  email TEXT,
  phone TEXT,
  office_hours TEXT,
  response_time TEXT,
  linkedin_url TEXT,
  whatsapp TEXT,
  telegram TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- University insights: employment, student life, alumni
CREATE TABLE public.university_insights (
  insight_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(university_id) ON DELETE CASCADE,
  employment_rate_6months NUMERIC,
  average_starting_salary_usd NUMERIC,
  student_satisfaction_score NUMERIC,
  international_student_percent NUMERIC,
  campus_safety_score NUMERIC,
  housing_available BOOLEAN DEFAULT true,
  housing_cost_monthly_usd NUMERIC,
  alumni_network_strength TEXT,
  notable_alumni TEXT,
  student_clubs_count INTEGER,
  research_output_score NUMERIC,
  industry_partnerships TEXT,
  internship_opportunities TEXT,
  post_grad_work_visa TEXT,
  application_tips TEXT,
  common_mistakes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(university_id)
);

-- Enable RLS
ALTER TABLE public.university_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_insights ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read university_contacts" ON public.university_contacts FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage university_contacts" ON public.university_contacts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read university_insights" ON public.university_insights FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage university_insights" ON public.university_insights FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
