-- ============================================================
-- TopUni Membership System
-- Tiered, product-led, scalable
-- ============================================================

-- 1. Profiles table (one row per auth user)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  country_hint TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  earned_trial_started_at TIMESTAMPTZ,
  earned_trial_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Subscription tiers enum
-- ============================================================
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'founding');
CREATE TYPE public.subscription_status AS ENUM (
  'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
);

-- ============================================================
-- 3. Subscriptions table — source of truth (mirrors Stripe)
-- ============================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  billing_interval TEXT,        -- 'month' | 'year'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  is_founding_member BOOLEAN NOT NULL DEFAULT false,
  founding_member_number INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Engagement milestones — drives earned trial + credits
-- ============================================================
CREATE TABLE public.engagement_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,         -- e.g. 'profile_completed', 'first_quiz', 'saved_3_universities'
  metadata JSONB DEFAULT '{}'::jsonb,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_key)
);

CREATE INDEX idx_milestones_user ON public.engagement_milestones(user_id);

ALTER TABLE public.engagement_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own milestones"
  ON public.engagement_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones"
  ON public.engagement_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all milestones"
  ON public.engagement_milestones FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Founding member counter (atomic)
-- ============================================================
CREATE TABLE public.founding_member_counter (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  claimed_count INTEGER NOT NULL DEFAULT 0,
  cap INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.founding_member_counter (id, claimed_count, cap)
VALUES (1, 0, 100) ON CONFLICT DO NOTHING;

ALTER TABLE public.founding_member_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read founding counter"
  ON public.founding_member_counter FOR SELECT
  USING (true);

CREATE POLICY "Service role updates founding counter"
  ON public.founding_member_counter FOR UPDATE
  USING (auth.role() = 'service_role');

-- Atomic claim function — returns assigned number or NULL if cap reached
CREATE OR REPLACE FUNCTION public.claim_founding_member_slot()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned INTEGER;
BEGIN
  UPDATE public.founding_member_counter
  SET claimed_count = claimed_count + 1,
      updated_at = now()
  WHERE id = 1 AND claimed_count < cap
  RETURNING claimed_count INTO assigned;
  RETURN assigned; -- NULL if cap reached
END;
$$;

-- ============================================================
-- 6. Helper: has_active_subscription
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND tier IN ('pro', 'founding')
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND earned_trial_expires_at IS NOT NULL
      AND earned_trial_expires_at > now()
  );
$$;