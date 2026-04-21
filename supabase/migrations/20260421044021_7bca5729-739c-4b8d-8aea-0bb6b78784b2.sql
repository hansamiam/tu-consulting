-- 1. Storage bucket for receipts (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload (guests pay without auth)
CREATE POLICY "Anyone can upload payment receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-receipts');

-- Only admins can read receipts
CREATE POLICY "Admins can view payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'));

-- 2. Bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  consultation_type text NOT NULL,
  is_consultation boolean NOT NULL DEFAULT false,
  original_price text,
  discount numeric DEFAULT 0,
  final_price numeric,
  promo_code text,
  language text NOT NULL DEFAULT 'en',
  contact_email text,
  contact_name text,
  contact_phone text,
  receipt_path text,
  status text NOT NULL DEFAULT 'pending_review',
  notes text
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create bookings"
ON public.bookings FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings"
ON public.bookings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bookings_created_at ON public.bookings (created_at DESC);
CREATE INDEX idx_bookings_status ON public.bookings (status);