/* Admin mode — bypass paywalls + free-tier limits while building.
 *
 * Two recognition paths:
 *   1. ADMIN_EMAILS allowlist — durable, baked into the bundle. The
 *      session's signed-in user matches by email (case-insensitive).
 *   2. localStorage flag `topuni_admin=1` — convenience escape hatch
 *      for when working incognito or on a fresh device. Toggled by
 *      visiting /discover?admin=1 (or =0 to clear). Survives reload,
 *      cleared by clearing site data.
 *
 * Anyone without one of these reads as a regular user. Paid members
 * (subscription.is_active) bypass paywalls separately and don't need
 * admin mode for that.
 */

/* Founders allowlist — gets paid-feature bypass + admin surfaces
 * (the /admin pages, founding-tier badges, etc.) regardless of
 * subscription state. Email match is case-insensitive at the
 * comparison site, so don't bother normalising here. */
const ADMIN_EMAILS = [
  "samuel.shn.han@gmail.com",
  "nurzada.abdivalieva@gmail.com",
  "alima140105@gmail.com",
];

const ADMIN_FLAG_KEY = "topuni_admin";

const lower = (e: string | null | undefined) => (e || "").trim().toLowerCase();

export const isAdminUser = (user: { email?: string | null } | null | undefined): boolean => {
  if (!user || !user.email) return false;
  const e = lower(user.email);
  return ADMIN_EMAILS.some(a => lower(a) === e);
};

export const isAdminBypass = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ADMIN_FLAG_KEY) === "1";
  } catch {
    return false;
  }
};

export const setAdminBypass = (on: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(ADMIN_FLAG_KEY, "1");
    else window.localStorage.removeItem(ADMIN_FLAG_KEY);
  } catch { /* storage access can fail in private windows; ignore */ }
};

/* URL toggle — when ?admin=1 is in the URL, flip localStorage on; ?admin=0
 * flips it off. Returns true if the flag was just changed (caller can
 * clean the URL if it wants). Safe to call on every page load. */
export const consumeAdminUrlFlag = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("admin");
    if (v === null) return false;
    if (v === "1") { setAdminBypass(true); return true; }
    if (v === "0") { setAdminBypass(false); return true; }
    return false;
  } catch {
    return false;
  }
};
