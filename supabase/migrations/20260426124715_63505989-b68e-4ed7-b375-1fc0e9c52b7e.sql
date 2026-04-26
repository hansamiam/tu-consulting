ALTER TABLE public.scholarships DROP CONSTRAINT IF EXISTS scholarships_coverage_type_check;
ALTER TABLE public.scholarships ADD CONSTRAINT scholarships_coverage_type_check
  CHECK (coverage_type = ANY (ARRAY['full_ride','full_tuition','tuition_only','partial','stipend','stipend_only','unknown']));