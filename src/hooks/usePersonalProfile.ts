import { useEffect, useState, useCallback } from "react";
import {
  loadProfile, saveProfile, clearProfile, profileIsUseful,
  type PersonalProfile,
} from "@/lib/personalMatch";

/**
 * usePersonalProfile — read/write the universal personal profile.
 *
 * The profile lives in localStorage; this hook gives every component a
 * reactive view of it. Writes from any component (or other tab) trigger
 * a re-render everywhere consuming the hook, so the "X% match" badges
 * update across the entire page the instant the user changes a field.
 *
 * Persistence model: anonymous (no signup). Survives reload, syncs
 * across tabs via the storage event, syncs same-tab via a custom event.
 */
export function usePersonalProfile() {
  const [profile, setProfile] = useState<PersonalProfile | null>(() => loadProfile());

  useEffect(() => {
    const reread = () => setProfile(loadProfile());
    window.addEventListener("storage", reread);
    window.addEventListener("topuni-profile-changed", reread);
    return () => {
      window.removeEventListener("storage", reread);
      window.removeEventListener("topuni-profile-changed", reread);
    };
  }, []);

  const update = useCallback((patch: Partial<PersonalProfile>) => {
    const merged = saveProfile(patch);
    setProfile(merged);
    return merged;
  }, []);

  const clear = useCallback(() => {
    clearProfile();
    setProfile(null);
  }, []);

  return {
    profile,
    update,
    clear,
    isUseful: profileIsUseful(profile),
  };
}
