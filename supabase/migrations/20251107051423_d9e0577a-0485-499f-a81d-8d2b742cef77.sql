-- Add unique constraint to email column in waitlist_emails table
ALTER TABLE public.waitlist_emails 
ADD CONSTRAINT waitlist_emails_email_unique UNIQUE (email);