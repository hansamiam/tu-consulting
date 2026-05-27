-- Close the automation gap Sam flagged: when a scholarship gets published
-- (or already-published row gets its source URL updated), fire audit-
-- deadlines for it within seconds via pg_net, rather than waiting up to
-- 24h for the next 06:00 UTC cron tick.
--
-- Trigger only fires when:
--   (a) the row is is_published=true AND
--   (b) the row has a source/canonical URL to scrape AND
--   (c) EITHER row was just inserted as published, OR is_published
--       just flipped from false to true, OR the canonical/source URL
--       was updated on an already-published row.
--
-- Self-throttle: skip if audited in the last hour. Prevents thrash on
-- rapid edits.
--
-- Applied via MCP apply_migration; this file is in-tree for traceability.

CREATE OR REPLACE FUNCTION public.trigger_audit_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- needs SELECT on private.app_secrets via app_cron_token()
AS $$
DECLARE
  v_url TEXT;
  v_last_audit TIMESTAMPTZ;
  v_should_fire BOOLEAN;
BEGIN
  IF NEW.is_published IS NOT TRUE THEN RETURN NEW; END IF;

  v_url := COALESCE(NEW.canonical_official_url, NEW.official_url, NEW.source_url);
  IF v_url IS NULL OR LENGTH(v_url) < 4 THEN RETURN NEW; END IF;

  v_should_fire := FALSE;
  IF TG_OP = 'INSERT' THEN
    v_should_fire := TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.is_published, FALSE) = FALSE AND NEW.is_published = TRUE THEN
      v_should_fire := TRUE;
    ELSIF COALESCE(OLD.canonical_official_url, OLD.official_url, OLD.source_url, '') IS DISTINCT FROM v_url THEN
      v_should_fire := TRUE;
    END IF;
  END IF;

  IF NOT v_should_fire THEN RETURN NEW; END IF;

  SELECT MAX(audited_at) INTO v_last_audit
  FROM public.deadline_audit_log
  WHERE scholarship_id = NEW.scholarship_id;
  IF v_last_audit IS NOT NULL AND v_last_audit > now() - INTERVAL '1 hour' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url     := 'https://bsfldtpemfxhnkdzccib.supabase.co/functions/v1/audit-deadlines',
      headers := jsonb_build_object(
        'apikey',       public.app_cron_token(),
        'Content-Type', 'application/json'
      ),
      body    := jsonb_build_object('scholarship_id', NEW.scholarship_id),
      timeout_milliseconds := 60000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'trigger_audit_on_publish: pg_net call failed for %: %',
      NEW.scholarship_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_on_publish ON public.scholarships;

CREATE TRIGGER trg_audit_on_publish
  AFTER INSERT OR UPDATE OF is_published, canonical_official_url, official_url, source_url
  ON public.scholarships
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_audit_on_publish();

COMMENT ON FUNCTION public.trigger_audit_on_publish() IS
  '2026-05-27: Fires audit-deadlines edge function via pg_net whenever a '
  'scholarship is published (INSERT with is_published=true OR UPDATE that '
  'flips is_published false->true OR URL changes on a published row). '
  'Closes the gap where new rows from /admin/scholarships-verification '
  'waited up to 24h for the next 06:00 UTC cron tick. Throttled to skip '
  'if audited in the last hour.';
