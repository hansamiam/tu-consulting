/* Cross-tab post-auth redirect helper.
 *
 * The magic-link signup flow has the user click a link in their email,
 * which the OS may open in a NEW tab/window depending on the email
 * client (Outlook desktop, Apple Mail, Gmail desktop apps, etc.).
 * sessionStorage is per-tab, so a new-tab open silently loses the
 * "where should we send them after sign-in" target — they end up on
 * /account instead of /pricing or /topuni-ai/ru.
 *
 * localStorage is shared across tabs of the same origin, so the
 * destination survives the email-client tab break. 30-minute TTL
 * means a stale flag from days ago can't redirect a fresh sign-in
 * to an unrelated surface.
 *
 * Refactored in round 68 from the four direct sessionStorage call
 * sites (Pricing, ProComparisonModal, SaveBriefPrompt, AuthCallback).
 */

const KEY = "topuni-post-auth-redirect-v1";
const TTL_MS = 30 * 60_000;

interface Stored {
  dest: string;
  savedAt: number;
}

export const setPostAuthRedirect = (dest: string): void => {
  if (!dest || typeof window === "undefined") return;
  try {
    const payload: Stored = { dest, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch { /* private mode / quota — caller still proceeds */ }
};

export const consumePostAuthRedirect = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.dest || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    return parsed.dest;
  } catch {
    return null;
  }
};
