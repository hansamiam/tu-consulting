/**
 * pendingAccount — stores the wizard's profile + brief + tracker state
 * in localStorage so AuthCallback can persist it to the user's account
 * the instant they verify their magic link.
 *
 * Why this exists: signup happens in a different browser session than
 * the wizard (the user clicks the email link in a fresh tab). By the
 * time AuthCallback runs, in-memory React state is gone — but
 * localStorage persists. We stash a structured "pending save" payload
 * before triggering the magic-link send, then drain it after.
 */

export interface PendingAccountPayload {
  profile: {
    fullName?: string;
    email?: string;
    nationality?: string;
    gradeLevel?: string;
    gpa?: string;
    gpaScale?: string;
    ielts?: string;
    toefl?: string;
    sat?: string;
    targetCountries?: string[];
    major?: string;
    fieldOfStudy?: string;
    budget?: string;
    scholarshipNeeded?: string;
    timeline?: string;
    prestige?: number;
    scholarshipPriority?: number;
    careerRoi?: number;
    visaAccess?: number;
    locationPref?: number;
  };
  pathway?: {
    content: string;
    language: "en" | "ru";
    grade: "basic" | "premium";
    profileHash?: string;
  };
  createdAt: number;
}

const KEY = "topuni-pending-account-v1";

export function setPendingAccount(payload: PendingAccountPayload): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

export function getPendingAccount(): PendingAccountPayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAccountPayload;
    if (!parsed || !parsed.createdAt) return null;
    // Drop blobs older than 24h — the user abandoned the signup
    if (Date.now() - parsed.createdAt > 24 * 3600_000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingAccount(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
