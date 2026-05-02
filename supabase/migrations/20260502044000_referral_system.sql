-- ─── Referral system schema ──────────────────────────────────────────
-- Each authed user gets a 6-char referral code on first access. New
-- users sign up with ?ref=CODE; we record the referral. When the
-- referee converts to a paid plan, the referrer earns a credit (paid
-- out manually or via Stripe portal until full automation lands).
--
-- Privacy: codes are shareable; the referee can see who referred them
-- (your friend's first name, no email). RLS only lets users see their
-- own referrals as referrer + the codes they were referred BY.

CREATE TABLE IF NOT EXISTS public.referral_codes (
  code           text PRIMARY KEY,                          -- 6-char base32, uppercase, unique
  user_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- Stats — denormalised for fast dashboard lookups; updated by the
  -- register-referral fn when redemptions happen.
  total_uses     integer NOT NULL DEFAULT 0,
  premium_conversions integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  referral_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL REFERENCES public.referral_codes(code) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_up_at    timestamptz NOT NULL DEFAULT now(),
  became_premium_at timestamptz,                            -- set by the Stripe webhook / check-subscription side-effect
  credit_paid_out_at timestamptz,                           -- nulled when referrer hasn't claimed yet
  -- Soft fraud guard: capture the IP + UA of the redeeming session
  redeem_ip       text,
  redeem_user_agent text
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code     ON public.referrals(code);
CREATE INDEX IF NOT EXISTS idx_referrals_premium  ON public.referrals(referrer_user_id) WHERE became_premium_at IS NOT NULL;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals      ENABLE ROW LEVEL SECURITY;

-- Anyone can read a referral code by its value (so the signup page
-- can validate ?ref=CODE without auth). Otherwise: own row only.
CREATE POLICY "Public read referral codes"
  ON public.referral_codes FOR SELECT
  USING (true);

CREATE POLICY "Self manage own code"
  ON public.referral_codes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Referrer sees who they referred; referee sees only their own row
-- (so they know they were referred by user X — first name returned by
--  a join to student_profiles).
CREATE POLICY "Self read referrals (referrer)"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Self read referrals (referee)"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referee_user_id);

-- ─── Helpers ─────────────────────────────────────────────────────
-- Generate a 6-char base32 code (no I/L/O/0/1 to avoid eye-strain
-- transposition errors). Loop until unique.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  n int := length(chars);
  code text;
  attempts int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * n)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE referral_codes.code = code);
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
  RETURN code;
END $$;

-- Get-or-create the caller's referral code. Used by the /refer page.
CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  existing text;
  fresh text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT code INTO existing FROM public.referral_codes WHERE user_id = caller;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;
  fresh := public.generate_referral_code();
  INSERT INTO public.referral_codes (code, user_id) VALUES (fresh, caller);
  RETURN fresh;
END $$;

GRANT EXECUTE ON FUNCTION public.get_or_create_my_referral_code() TO authenticated;

-- Atomic counter bump used by register-referral
CREATE OR REPLACE FUNCTION public.increment_referral_total_uses(p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.referral_codes SET total_uses = total_uses + 1 WHERE code = p_code;
$$;
GRANT EXECUTE ON FUNCTION public.increment_referral_total_uses(text) TO service_role;
