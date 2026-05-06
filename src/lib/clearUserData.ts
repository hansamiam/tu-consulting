/* clearUserDataOnSignOut — wipes the per-user localStorage payloads
 * that would otherwise leak from one signed-in account to the next on
 * a shared browser.
 *
 * Real concern: a tutor / family member uses the same browser the
 * student used. Without this:
 *   · application_tracker (saved scholarships, status, notes, essay
 *     drafts, recommenders, captured award amounts) lives in
 *     localStorage as topuni-app-tracker-v2 → useApplicationTracker
 *     merges it on the next sign-in, so user B sees user A's saved
 *     pipeline until the DB pull overrides.
 *   · pathway-cache, greeting-cache, chat-history → user B sees user
 *     A's brief / counselor messages keyed by user A's profile_hash.
 *   · watchlist (universities), saved-3 prompt flag, payment dialog
 *     drafts, post-auth redirect, pending-account / pending-referral
 *     blobs — all user-specific.
 *
 * AuthContext.signOut() calls this AFTER supabase.auth.signOut() so
 * the listener's cleanup runs before we wipe; subsequent sign-in then
 * starts from a clean slate (DB will repopulate from scratch).
 *
 * Anonymous-state keys (admin URL flag, founding-cap cache) are left
 * alone — they're either device preferences or shared anonymous data.
 */

const USER_DATA_KEYS = [
  // Application tracker (saved scholarships, statuses, notes, essay
  // drafts, recommenders, awarded amounts).
  "topuni-app-tracker-v2",
  // Legacy 4-key tracker shape kept as migration source — also
  // clear so a fresh sign-in doesn't re-rehydrate from it.
  "tu_status_map", "tu_notes_map", "tu_shortlist", "tu_hidden",
  "topuni-app-status", "topuni-app-notes", "topuni-shortlist", "topuni-hidden",

  // Brief + counselor caches (per-profile-hash, but the hash is
  // computed from the user's profile so wiping is correct on user
  // switch).
  "topuni-pathway-cache",
  "topuni-counselor-greeting-v1",
  "topuni_chat_history_v1",
  "topuni-chat-history",

  // Profile (Discover wizard + cross-device sync source) + change ts.
  "topuni_discover_profile",
  "topuni_profile_changed_at",

  // Wizard draft + intake + Pro depth.
  "topuni-intake-draft-v1",
  "topuni-pro-brief-depth",

  // Watchlist + saved-3 prompt flag.
  "topuni_watchlist",
  "tu_saved3_prompt_shown",

  // Activity-feed last-seen (per-user).
  "topuni-activity-last-seen",

  // Pending blobs that should not survive a sign-out.
  "topuni-pending-account-v1",
  "topuni-pending-referral-v1",
  "topuni-post-auth-redirect-v1",

  // Per-scholarship "Saved Xs ago" flags + "brief emailed" flags.
  // Prefix-matched below.

  // Payment dialog drafts.
  "tu_payment_dialog_state_v2",

  // Saved-deadline banner dismissal (per-day flag).
  "topuni-saved-deadline-dismiss-v1",
];

/** Prefix matchers for keys we generate dynamically per scholarship /
 *  per profile hash. All wiped on sign-out. */
const USER_DATA_PREFIXES = [
  "topuni_essay_target_",        // per-scholarship word target
  "topuni-brief-emailed:",       // per-profile-hash email-sent flag
];

export const clearUserDataLocalStorage = (): void => {
  if (typeof window === "undefined") return;
  try {
    // Direct keys.
    for (const k of USER_DATA_KEYS) {
      try { localStorage.removeItem(k); } catch { /* private mode — skip */ }
    }
    // Prefix-matched keys. Iterate snapshot of keys to avoid mutation
    // during iteration.
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }
    for (const k of allKeys) {
      if (USER_DATA_PREFIXES.some(p => k.startsWith(p))) {
        try { localStorage.removeItem(k); } catch { /* skip */ }
      }
    }
  } catch { /* localStorage unavailable — caller still proceeds */ }
};
