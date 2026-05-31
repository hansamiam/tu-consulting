-- Wire welcome-email to fire on auth.users INSERT.
--
-- Up to this point handle_new_user only inserted into public.profiles.
-- Production email_send_log had only 3 rows ever (all Samuel testing
-- himself) because no signup trigger ever enqueued the welcome.
-- Adds a fire-and-forget net.http_post to send-transactional-email so
-- every new user gets the welcome-email template on signup. Failures
-- are swallowed so user creation is never blocked by the email path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fn_url text := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/send-transactional-email';
  cron_token text;
  user_name text;
  user_lang text;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Fire-and-forget welcome email. Wrapped in BEGIN/EXCEPTION so a missing
  -- token / pg_net hiccup never blocks signup.
  BEGIN
    cron_token := public.app_cron_token();
    user_name := COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    );
    user_lang := COALESCE(NEW.raw_user_meta_data ->> 'language', 'en');

    PERFORM net.http_post(
      url := fn_url,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'apikey',        cron_token,
        'Authorization', 'Bearer ' || cron_token
      ),
      body := jsonb_build_object(
        'templateName', 'welcome-email',
        'recipientEmail', NEW.email,
        'templateData', jsonb_build_object(
          'name', user_name,
          'language', user_lang
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- log and swallow; signup must succeed even if email path is broken
    RAISE WARNING 'welcome-email enqueue failed for %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
