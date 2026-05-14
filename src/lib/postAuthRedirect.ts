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
 * destination survives the email-client tab break. 2-hour TTL means
 * a stale flag from days ago can't redirect a fresh sign-in to an
 * unrelated surface, while still covering realistic user lag.
 *
 * Open-redirect defence: anything in storage is mutable by any script
 * with same-origin access (extensions, XSS, a stray /admin tool), so
 * never trust the stored value verbatim. We only accept and emit
 * same-origin relative paths; anything else is dropped.
 */

const KEY = "topuni-post-auth-redirect-v1";
const TTL_MS = 2 * 60 * 60_000;

interface Stored {
  dest: string;
  savedAt: number;
}

const isSafeRelativePath = (dest: unknown): dest is string => {
  if (typeof dest !== "string") return false;
  if (dest.length === 0 || dest.length > 512) return false;
  // Must start with exactly one "/" — rejects "//evil.com/x" and
  // "http(s)://…" and javascript: / data: URIs.
  if (dest[0] !== "/") return false;
  if (dest[1] === "/" || dest[1] === "\\") return false;
  // No whitespace anywhere and no control chars.
  for (let i = 0; i < dest.length; i++) {
    const c = dest.charCodeAt(i);
    if (c <= 0x20 || c === 0x7f) return false;
  }
  return true;
};

export const setPostAuthRedirect = (dest: string): void => {
  if (typeof window === "undefined") return;
  if (!isSafeRelativePath(dest)) return;
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
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    // Re-validate on read — storage is shared and a hostile script may
    // have written a different shape between set and consume.
    if (!isSafeRelativePath(parsed.dest)) return null;
    return parsed.dest;
  } catch {
    return null;
  }
};
