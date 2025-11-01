-- Create a table for waitlist email submissions
CREATE TABLE public.waitlist_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.waitlist_emails ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their email (public waitlist)
CREATE POLICY "Anyone can submit email to waitlist" 
ON public.waitlist_emails 
FOR INSERT 
WITH CHECK (true);

-- Only allow authenticated users to view waitlist (you'll be able to see this in Cloud tab)
CREATE POLICY "Authenticated users can view waitlist" 
ON public.waitlist_emails 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create index for faster email lookups
CREATE INDEX idx_waitlist_emails_email ON public.waitlist_emails(email);
CREATE INDEX idx_waitlist_emails_created_at ON public.waitlist_emails(created_at DESC);