import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/* Inline post-sign-in drain — mirrors what AuthCallback does for the
 * magic-link / OAuth round-trip. Password sign-in completes synchronously
 * (no email click), so we have to run the same side effects ourselves
 * instead of routing through /auth/callback.
 *
 *   1. persistPendingAccount → write the wizard's profile + cached
 *      brief into student_profiles + pathway_reports
 *   2. register-referral → link the visitor's pending referral code
 *      to the new user_id
 *   3. consumePostAuthRedirect → navigate to wherever the user
 *      originally meant to go (/pricing, /topuni-ai/ru, etc.) using a
 *      hard navigation since AuthContext doesn't have access to the
 *      router
 *
 * Each step is best-effort; any failure logs and continues so a flaky
 * referral RPC can't block sign-in. */
async function runPostSignInDrain(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const [
      { getPendingAccount, clearPendingAccount },
      { getPendingReferral, clearPendingReferral },
      { consumePostAuthRedirect },
    ] = await Promise.all([
      import("@/lib/pendingAccount"),
      import("@/lib/referralCapture"),
      import("@/lib/postAuthRedirect"),
    ]);

    const pending = getPendingAccount();
    if (pending) {
      try {
        const persist = await import("@/lib/persistPendingAccount");
        await persist.persistPendingAccount(session.user.id, pending);
      } catch (e) {
        console.warn("[AuthContext] persistPendingAccount failed", e);
      }
      clearPendingAccount();
    }

    const referralCode = getPendingReferral();
    if (referralCode) {
      try {
        await supabase.functions.invoke("register-referral", { body: { code: referralCode } });
      } catch (e) {
        console.warn("[AuthContext] register-referral failed", e);
      }
      clearPendingReferral();
    }

    const dest = consumePostAuthRedirect();
    if (dest) {
      // Hard nav — AuthContext doesn't have access to react-router's
      // navigate(). The destination is already validated as a same-
      // origin path by setPostAuthRedirect's callers.
      window.location.assign(dest);
    }
  } catch (e) {
    console.warn("[AuthContext] post-sign-in drain failed", e);
  }
}

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
  /** Email + password sign-in. Returns { error } where error is the
   *  human-readable message from Supabase, or null on success. */
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Email + password sign-up. Returns `needsConfirmation: true` when
   *  the project has Supabase email confirmation turned on (the default)
   *  — caller should show "check your email" UX in that case. When
   *  confirmation is off, the user is signed in inline and the
   *  post-sign-in drain (pendingAccount + referral + redirect) runs
   *  before this resolves. */
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  /** Send a password-reset email. Used both for legacy magic-link users
   *  who never set a password AND for genuine forgot-password cases. */
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Legacy — kept for the few call sites that still want a passwordless
   *  flow (e.g. SaveBriefPrompt). New auth dialogs use password. */
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

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      // Same post-auth side effects the magic-link round-trip used to
      // run via /auth/callback — pendingAccount drain, referral
      // registration, post-auth redirect. Done inline because password
      // sign-in is synchronous (no email round-trip), so we can't lean
      // on the existing AuthCallback page for the same flow.
      void runPostSignInDrain();
    }
    return { error: error?.message ?? null };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // emailRedirectTo only matters when the project requires email
      // confirmation. Routing through /auth/callback is harmless when
      // it doesn't (the user is already signed in inline) and matches
      // the magic-link path otherwise.
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    // If email confirmation is enabled in Supabase project settings,
    // signUp returns { user, session: null } and the user must click
    // a confirmation link before they can sign in. The drain only
    // runs once a session exists (handled inside runPostSignInDrain).
    void runPostSignInDrain();
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    // Land Russian users on the Russian variant so the reset page copy
    // matches the language they were just using. Detect from the path
    // they're on right now (the dialog is invoked inline from EN/RU pages).
    const isRu = /\/ru(\/|$|\?)/.test(window.location.pathname);
    const path = isRu ? "/auth/reset-password/ru" : "/auth/reset-password";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${path}`,
    });
    return { error: error?.message ?? null };
  }, []);

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
    // Wipe per-user localStorage so a different account signing in
    // on the same browser doesn't inherit the prior user's tracker /
    // brief / watchlist / chat / pending blobs. Privacy + UX both.
    // Dynamic import keeps clearUserData out of the auth-init bundle.
    void import("@/lib/clearUserData")
      .then((m) => m.clearUserDataLocalStorage())
      .catch(() => { /* non-fatal */ });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        refreshSubscription,
        signInWithPassword,
        signUpWithPassword,
        sendPasswordReset,
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
