import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionInfo = {
  tier: "free" | "pro" | "founding";
  status: string | null;
  is_active: boolean;
  is_founding_member: boolean;
  founding_member_number: number | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  earned_trial_active: boolean;
  earned_trial_expires_at: string | null;
  billing_interval: "month" | "year" | null;
};

const FREE_DEFAULT: SubscriptionInfo = {
  tier: "free",
  status: null,
  is_active: false,
  is_founding_member: false,
  founding_member_number: null,
  current_period_end: null,
  cancel_at_period_end: false,
  earned_trial_active: false,
  earned_trial_expires_at: null,
  billing_interval: null,
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  refreshSubscription: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(FREE_DEFAULT);

  const loadSubscription = useCallback(async (uid: string | null) => {
    if (!uid) {
      setSubscription(FREE_DEFAULT);
      return;
    }
    try {
      const [{ data: sub }, { data: profile }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("earned_trial_expires_at")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      const trialExp = profile?.earned_trial_expires_at
        ? new Date(profile.earned_trial_expires_at)
        : null;
      const trialActive = !!(trialExp && trialExp.getTime() > Date.now());

      if (!sub) {
        setSubscription({
          ...FREE_DEFAULT,
          earned_trial_active: trialActive,
          earned_trial_expires_at: profile?.earned_trial_expires_at ?? null,
        });
        return;
      }

      const periodActive = sub.current_period_end
        ? new Date(sub.current_period_end).getTime() > Date.now()
        : true;
      const paidActive =
        ["active", "trialing"].includes(sub.status as string) &&
        ["pro", "founding"].includes(sub.tier as string) &&
        periodActive;

      setSubscription({
        tier: (sub.tier as "free" | "pro" | "founding") ?? "free",
        status: sub.status,
        is_active: paidActive || trialActive,
        is_founding_member: !!sub.is_founding_member,
        founding_member_number: sub.founding_member_number ?? null,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: !!sub.cancel_at_period_end,
        earned_trial_active: trialActive,
        earned_trial_expires_at: profile?.earned_trial_expires_at ?? null,
        billing_interval: (sub.billing_interval as "month" | "year" | null) ?? null,
      });
    } catch (e) {
      console.error("[AuthContext] loadSubscription error:", e);
      setSubscription(FREE_DEFAULT);
    }
  }, []);

  useEffect(() => {
    // Set listener BEFORE getSession (avoids missed events)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        // Defer subscription load + profile cross-device pull to avoid
        // blocking auth resolution. The profile sync is dynamic-imported
        // so the auth bundle doesn't pull discover-gate code unnecessarily.
        setTimeout(() => {
          loadSubscription(newSession?.user?.id ?? null);
          if (newSession?.user?.id) {
            void import("@/components/discover/DiscoverProfileGate")
              .then((m) => m.pullProfileFromDb(newSession.user!.id))
              .catch(() => { /* sync failure non-fatal */ });
          }
        }, 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      loadSubscription(existing?.user?.id ?? null).finally(() => setLoading(false));
      if (existing?.user?.id) {
        void import("@/components/discover/DiscoverProfileGate")
          .then((m) => m.pullProfileFromDb(existing.user!.id))
          .catch(() => { /* sync failure non-fatal */ });
      }
    });

    return () => authSub.unsubscribe();
  }, [loadSubscription]);

  // Periodic refresh — every 60s while logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadSubscription(user.id), 60_000);
    return () => clearInterval(interval);
  }, [user, loadSubscription]);

  const refreshSubscription = useCallback(async () => {
    if (user) await loadSubscription(user.id);
  }, [user, loadSubscription]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Route through /auth/callback so the post-auth drain runs:
      // - persistPendingAccount (writes the wizard's profile + brief
      //   to student_profiles + pathway_reports)
      // - register-referral (links pending referral codes)
      // - consumePostAuthRedirect (sends the user to wherever they
      //   started: /pricing, /topuni-ai/ru, etc.)
      // Previously this redirected to window.location.origin (the
      // homepage) which skipped AuthCallback entirely — pendingAccount
      // payloads silently rotted, referrals never registered, and
      // post_auth_redirect targets were never honored.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Supabase native Google OAuth — works on any host, no Lovable
    // runtime dependency. Requires Google provider to be enabled in
    // the Supabase dashboard (Authentication → Providers → Google).
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSubscription(FREE_DEFAULT);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        refreshSubscription,
        signInWithMagicLink,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
