ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS tuition_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.admission_requirements ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.university_insights ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;