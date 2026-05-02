/**
 * referralCapture — captures the ?ref=CODE param early so it survives
 * the magic-link signup round-trip. Stored in localStorage; AuthCallback
 * reads + clears after registering the referral via the edge function.
 */
const KEY = "topuni-pending-referral-v1";
const TTL_MS = 30 * 86400_000;

export function rememberReferralFromUrl(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("ref") || "").trim().toUpperCase();
    if (!code || !/^[A-Z2-9]{6}$/.test(code)) return null;
    localStorage.setItem(KEY, JSON.stringify({ code, savedAt: Date.now() }));
    return code;
  } catch {
    return null;
  }
}

export function getPendingReferral(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string; savedAt?: number };
    if (!parsed.code || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.code.toUpperCase();
  } catch {
    return null;
  }
}

export function clearPendingReferral(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
