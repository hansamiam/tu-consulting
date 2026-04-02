-- Internal data intelligence layer for anonymized student analytics
-- This is NOT user-facing — purely internal for building data moats

CREATE TABLE public.student_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  session_id text,
  country_hint text,
  device_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_interactions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymized events from the frontend)
CREATE POLICY "Anyone can log interactions"
ON public.student_interactions
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can view interactions"
ON public.student_interactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for efficient querying
CREATE INDEX idx_student_interactions_event_type ON public.student_interactions(event_type);
CREATE INDEX idx_student_interactions_created_at ON public.student_interactions(created_at DESC);

-- Aggregated insights table for pre-computed metrics
CREATE TABLE public.aggregated_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric,
  dimension text,
  period text,
  computed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.aggregated_insights ENABLE ROW LEVEL SECURITY;

-- Only admins can read and write
CREATE POLICY "Admins manage aggregated_insights"
ON public.aggregated_insights
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));